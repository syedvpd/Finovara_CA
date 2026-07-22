"""Document vault endpoints."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, File, Form, Query, Request, UploadFile, status

from app.api.crud_router import build_crud_router
from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.constants import DOCUMENT_CATEGORIES, DOCUMENT_STATUSES
from app.core.exceptions import PayloadTooLargeError
from app.core.permissions import Module
from app.schemas.common import SuccessResponse
from app.schemas.operations import (
    DocumentFolderCreate,
    DocumentFolderRead,
    DocumentRead,
    DocumentRequestCreate,
    DocumentRequestRead,
    DocumentRequestUpdate,
    DocumentUpdate,
    DocumentVerify,
    DocumentVersionRead,
    SignedUrlResponse,
)
from app.services.documents import (
    SIGNED_URL_TTL_SECONDS,
    document_folder_service,
    document_request_service,
    document_service,
)


async def document_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    file_category: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    folder_id: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v
        for k, v in {
            "client_id": client_id,
            "file_category": file_category,
            "status": status,
            "folder_id": folder_id,
        }.items()
        if v
    }


router: APIRouter = build_crud_router(
    service_factory=document_service,
    read_schema=DocumentRead,
    create_schema=None,  # documents arrive via multipart upload, not JSON
    update_schema=DocumentUpdate,
    module=Module.DOCUMENTS,
    resource_name="document",
    filter_dependency=document_filters,
)


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


async def _read_upload(upload: UploadFile) -> bytes:
    """Read the upload, refusing anything past the configured ceiling.

    Read in chunks so an oversized file is rejected before it is fully
    buffered in memory.
    """
    limit = settings.max_upload_bytes
    chunks: list[bytes] = []
    total = 0
    while chunk := await upload.read(1024 * 1024):
        total += len(chunk)
        if total > limit:
            raise PayloadTooLargeError(f"File exceeds the {limit // (1024 * 1024)} MB limit.")
        chunks.append(chunk)
    return b"".join(chunks)


@router.post(
    "/upload",
    response_model=SuccessResponse[DocumentRead],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document",
    description="Validates type, extension and magic number, scans the content, "
    "stores it in the private bucket for its category, then records the metadata.",
)
async def upload_document(
    request: Request,
    session: DbSession,
    auth: CurrentUser,
    file: Annotated[UploadFile, File(description="The file to upload")],
    client_id: Annotated[UUID, Form()],
    file_category: Annotated[str, Form(pattern="^(" + "|".join(DOCUMENT_CATEGORIES) + ")$")] = "general",
    description: Annotated[str | None, Form()] = None,
    folder_id: Annotated[UUID | None, Form()] = None,
    document_request_id: Annotated[UUID | None, Form()] = None,
    tags: Annotated[str | None, Form(description="Comma-separated tags")] = None,
) -> SuccessResponse[DocumentRead]:
    content = await _read_upload(file)
    document = await document_service(session).upload(
        client_id=client_id,
        filename=file.filename or "upload",
        content=content,
        content_type=file.content_type or "application/octet-stream",
        auth=auth,
        category=file_category,
        folder_id=folder_id,
        description=description,
        tags=[t.strip() for t in tags.split(",") if t.strip()] if tags else None,
        request_id=document_request_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
    )
    return SuccessResponse[DocumentRead](data=DocumentRead.model_validate(document), request_id=_rid(request))


@router.get(
    "/{document_id}/download",
    response_model=SuccessResponse[SignedUrlResponse],
    summary="Issue a signed download link",
    description=f"Returns a URL valid for {SIGNED_URL_TTL_SECONDS} seconds. "
    "The access is written to the document audit trail.",
)
async def download_document(
    request: Request, document_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[SignedUrlResponse]:
    url, filename = await document_service(session).signed_download_url(
        document_id, auth, ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent")
    )
    return SuccessResponse[SignedUrlResponse](
        data=SignedUrlResponse(url=url, expires_in=SIGNED_URL_TTL_SECONDS, filename=filename),
        request_id=_rid(request),
    )


@router.post(
    "/{document_id}/versions",
    response_model=SuccessResponse[DocumentRead],
    summary="Replace the file, keeping the previous version",
)
async def add_version(
    request: Request,
    document_id: UUID,
    session: DbSession,
    auth: CurrentUser,
    file: Annotated[UploadFile, File()],
    change_summary: Annotated[str | None, Form()] = None,
) -> SuccessResponse[DocumentRead]:
    content = await _read_upload(file)
    document = await document_service(session).add_version(
        document_id,
        filename=file.filename or "upload",
        content=content,
        content_type=file.content_type or "application/octet-stream",
        change_summary=change_summary,
        auth=auth,
    )
    return SuccessResponse[DocumentRead](data=DocumentRead.model_validate(document), request_id=_rid(request))


@router.get(
    "/{document_id}/versions",
    response_model=SuccessResponse[list[DocumentVersionRead]],
    summary="Version history",
)
async def list_versions(
    request: Request, document_id: UUID, session: DbSession, auth: CurrentUser
) -> SuccessResponse[list[DocumentVersionRead]]:
    versions = await document_service(session).list_versions(document_id, auth)
    return SuccessResponse[list[DocumentVersionRead]](
        data=[DocumentVersionRead.model_validate(v) for v in versions], request_id=_rid(request)
    )


@router.post(
    "/{document_id}/verify",
    response_model=SuccessResponse[DocumentRead],
    summary="Verify or reject a document",
    description="Firm personnel only. A client cannot verify their own upload.",
)
async def verify_document(
    request: Request, document_id: UUID, payload: DocumentVerify, session: DbSession, auth: CurrentUser
) -> SuccessResponse[DocumentRead]:
    document = await document_service(session).verify(document_id, payload.model_dump(), auth)
    return SuccessResponse[DocumentRead](data=DocumentRead.model_validate(document), request_id=_rid(request))


# --- Folders -----------------------------------------------------------------


async def folder_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    parent_id: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {k: v for k, v in {"client_id": client_id, "parent_id": parent_id}.items() if v}


folders_router: APIRouter = build_crud_router(
    service_factory=document_folder_service,
    read_schema=DocumentFolderRead,
    create_schema=DocumentFolderCreate,
    update_schema=None,
    module=Module.DOCUMENTS,
    resource_name="folder",
    filter_dependency=folder_filters,
)


# --- Document requests -------------------------------------------------------


async def request_filters(
    client_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[str | None, Query(pattern="^(pending|fulfilled|overdue)$")] = None,
    task_id: Annotated[UUID | None, Query()] = None,
) -> dict[str, Any]:
    return {
        k: v for k, v in {"client_id": client_id, "status": status, "task_id": task_id}.items() if v
    }


requests_router: APIRouter = build_crud_router(
    service_factory=document_request_service,
    read_schema=DocumentRequestRead,
    create_schema=DocumentRequestCreate,
    update_schema=DocumentRequestUpdate,
    module=Module.DOCUMENT_REQUESTS,
    resource_name="document request",
    filter_dependency=request_filters,
)
