"""Document vault: upload, versioning, verification, and signed downloads."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.permissions import Action, Module
from app.core.security import AuthContext
from app.models.operations import Document, DocumentFolder, DocumentRequest
from app.repositories.clients import ClientRepository
from app.repositories.operations import (
    DocumentFolderRepository,
    DocumentRepository,
    DocumentRequestRepository,
    TaskRepository,
)
from app.services.base import BaseService
from app.services.storage import (
    bucket_for_category,
    build_object_path,
    get_storage,
    scan_for_malware,
    validate_upload,
)

#: How long a download link stays valid. Short by design.
SIGNED_URL_TTL_SECONDS = 300

#: Bytes read from the front of an upload for magic-number checking.
_MAGIC_PREFIX_BYTES = 16


class DocumentService(BaseService[Document, DocumentRepository]):
    module = Module.DOCUMENTS

    async def upload(
        self,
        *,
        client_id: UUID,
        filename: str,
        content: bytes,
        content_type: str,
        auth: AuthContext,
        category: str = "general",
        folder_id: UUID | None = None,
        description: str | None = None,
        tags: list[str] | None = None,
        request_id: UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Document:
        """Validate, scan, store, then record. The database row is only written
        after the object is safely in storage, so a failed upload leaves no
        dangling metadata."""
        self._require(auth, Action.CREATE)

        # A client account may only ever upload against itself.
        if auth.is_client:
            client_id = auth.client_id or client_id
        elif await ClientRepository(self.repo.session).get(client_id) is None:
            raise NotFoundError("Client", client_id)

        safe_name = validate_upload(filename, content_type, len(content), content[:_MAGIC_PREFIX_BYTES])

        is_clean, threat = await scan_for_malware(content, safe_name)
        if not is_clean:
            raise ValidationError(f"The file was rejected by the malware scanner: {threat}")

        if folder_id is not None:
            folder = await DocumentFolderRepository(self.repo.session).get(folder_id)
            if folder is None or folder.client_id != client_id:
                raise NotFoundError("Folder", folder_id)

        bucket = bucket_for_category(category)
        path = build_object_path(client_id, category, safe_name)
        await get_storage().upload(bucket, path, content, content_type)

        document = await self.repo.create(
            {
                "client_id": client_id,
                "folder_id": folder_id,
                "name": safe_name,
                "description": description,
                "file_path": f"{bucket}/{path}",
                "file_size": len(content),
                "mime_type": content_type,
                "file_category": category,
                # A client's own upload always starts unverified; staff uploads
                # are trusted because staff are the verifiers.
                "status": "verified" if auth.is_staff else "pending_verification",
                "tags": tags or [],
                "version_count": 1,
            },
            actor_id=auth.user_id,
        )

        await self.repo.record_action(
            document.id, auth.user_id, "upload", ip_address=ip_address, user_agent=user_agent
        )

        if request_id is not None:
            await self._fulfil_request(request_id, client_id, auth)

        return document

    async def _fulfil_request(self, request_id: UUID, client_id: UUID, auth: AuthContext) -> None:
        repo = DocumentRequestRepository(self.repo.session)
        document_request = await repo.get(request_id)
        if document_request and document_request.client_id == client_id:
            await repo.update(document_request, {"status": "fulfilled"}, actor_id=auth.user_id)

    async def signed_download_url(
        self,
        document_id: UUID,
        auth: AuthContext,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[str, str]:
        """Issue a short-lived URL and record the access. Returns (url, filename)."""
        self._require(auth, Action.READ)
        document = await self.repo.get_scoped_or_404(document_id, auth)

        # A client must not be able to pull a document that was rejected.
        if auth.is_client and document.status == "rejected":
            raise ForbiddenError("This document was rejected and is not available for download.")

        bucket, _, path = document.file_path.partition("/")
        url = await get_storage().create_signed_url(bucket, path, SIGNED_URL_TTL_SECONDS)

        await self.repo.record_action(
            document.id, auth.user_id, "download", ip_address=ip_address, user_agent=user_agent
        )
        return url, document.name

    async def add_version(
        self,
        document_id: UUID,
        *,
        filename: str,
        content: bytes,
        content_type: str,
        change_summary: str | None,
        auth: AuthContext,
    ) -> Document:
        """Replace the file. The database trigger archives the previous version."""
        self._require(auth, Action.UPDATE)
        document = await self.repo.get_scoped_or_404(document_id, auth)

        safe_name = validate_upload(filename, content_type, len(content), content[:_MAGIC_PREFIX_BYTES])
        is_clean, threat = await scan_for_malware(content, safe_name)
        if not is_clean:
            raise ValidationError(f"The file was rejected by the malware scanner: {threat}")

        bucket = bucket_for_category(document.file_category)
        path = build_object_path(document.client_id, document.file_category, safe_name)
        await get_storage().upload(bucket, path, content, content_type)

        updated = await self.repo.update(
            document,
            {
                "file_path": f"{bucket}/{path}",
                "file_size": len(content),
                "mime_type": content_type,
                "status": "pending_verification",
                "verified_by": None,
                "verified_at": None,
            },
            actor_id=auth.user_id,
        )
        await self.repo.record_action(document.id, auth.user_id, "edit")
        return updated

    async def verify(self, document_id: UUID, decision: dict[str, Any], auth: AuthContext) -> Document:
        """Approve or reject. Staff only — a client cannot verify their own file."""
        self._require(auth, Action.UPDATE)
        if not auth.is_staff:
            raise ForbiddenError("Only firm personnel may verify documents.")
        if auth.employee_id is None:
            raise ForbiddenError("No employee profile is linked to this account.")

        document = await self.repo.get_scoped_or_404(document_id, auth)
        if document.status == decision["status"]:
            raise ConflictError(f"This document is already {document.status}.")

        updated = await self.repo.update(
            document,
            {
                "status": decision["status"],
                "description": decision.get("reason") or document.description,
                "verified_by": auth.employee_id,
                "verified_at": datetime.now(timezone.utc),
            },
            actor_id=auth.user_id,
        )
        await self.repo.record_action(document.id, auth.user_id, "verify")
        return updated

    async def list_versions(self, document_id: UUID, auth: AuthContext) -> list[Any]:
        self._require(auth, Action.READ)
        await self.repo.get_scoped_or_404(document_id, auth)
        return await self.repo.versions(document_id)

    async def _before_delete(self, entity: Document, auth: AuthContext) -> None:
        if auth.is_client:
            raise ForbiddenError("Documents can only be removed by firm personnel.")
        # The storage object is retained deliberately: a soft-deleted document
        # must remain recoverable for audit and statutory retention.


class DocumentFolderService(BaseService[DocumentFolder, DocumentFolderRepository]):
    module = Module.DOCUMENTS

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if data.get("parent_id"):
            parent = await self.repo.get(data["parent_id"])
            if parent is None or parent.client_id != data["client_id"]:
                raise NotFoundError("Parent folder", data["parent_id"])
        return data

    async def _before_delete(self, entity: DocumentFolder, auth: AuthContext) -> None:
        if await DocumentRepository(self.repo.session).exists(folder_id=entity.id):
            raise ConflictError("This folder still contains documents.")


class DocumentRequestService(BaseService[DocumentRequest, DocumentRequestRepository]):
    module = Module.DOCUMENT_REQUESTS
    transitions = {"pending": {"fulfilled", "overdue"}, "overdue": {"fulfilled"}, "fulfilled": set()}

    async def _before_create(self, data: dict[str, Any], auth: AuthContext) -> dict[str, Any]:
        if not auth.is_staff:
            raise ForbiddenError("Only firm personnel may request documents from a client.")
        if await ClientRepository(self.repo.session).get(data["client_id"]) is None:
            raise NotFoundError("Client", data["client_id"])
        if task_id := data.get("task_id"):
            if await TaskRepository(self.repo.session).get(task_id) is None:
                raise NotFoundError("Task", task_id)
        return data


def document_service(s: AsyncSession) -> DocumentService:
    return DocumentService(DocumentRepository(s))


def document_folder_service(s: AsyncSession) -> DocumentFolderService:
    return DocumentFolderService(DocumentFolderRepository(s))


def document_request_service(s: AsyncSession) -> DocumentRequestService:
    return DocumentRequestService(DocumentRequestRepository(s))
