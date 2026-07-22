"""Supabase Storage access.

Buckets are private. Files are never served through this API; clients receive
short-lived signed URLs instead, so large downloads bypass the application and
a leaked URL expires on its own.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any
from uuid import UUID, uuid4

import httpx

from app.core.config import settings
from app.core.constants import (
    ALLOWED_MIME_TYPES,
    BLOCKED_EXTENSIONS,
    CATEGORY_BUCKETS,
    MAGIC_SIGNATURES,
    Bucket,
)
from app.core.exceptions import (
    DependencyUnavailableError,
    PayloadTooLargeError,
    UnsupportedMediaTypeError,
    ValidationError,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")
_MAX_FILENAME_LENGTH = 120


@dataclass(slots=True)
class StoredObject:
    bucket: str
    path: str
    size: int
    mime_type: str
    original_name: str


def sanitize_filename(name: str) -> str:
    """Reduce an uploaded name to a safe, flat filename.

    Strips directory components (``../``), normalises unicode, and collapses
    anything outside a conservative character set.
    """
    flattened = PurePosixPath(name.replace("\\", "/")).name
    normalised = unicodedata.normalize("NFKD", flattened).encode("ascii", "ignore").decode()
    cleaned = _SAFE_NAME.sub("_", normalised).strip("._") or "file"

    stem, dot, suffix = cleaned.rpartition(".")
    if dot:
        stem = stem[: _MAX_FILENAME_LENGTH - len(suffix) - 1] or "file"
        return f"{stem}.{suffix.lower()}"
    return cleaned[:_MAX_FILENAME_LENGTH]


def validate_upload(filename: str, content_type: str, size: int, head: bytes = b"") -> str:
    """Reject an upload before it reaches storage. Returns the safe filename.

    Three independent checks, because any one of them can be spoofed alone:
    the declared MIME type, the extension, and the file's magic number.
    """
    if size <= 0:
        raise ValidationError("The uploaded file is empty.")
    if size > settings.max_upload_bytes:
        raise PayloadTooLargeError(
            f"File exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit."
        )

    safe_name = sanitize_filename(filename)
    suffix = PurePosixPath(safe_name).suffix.lower()

    if suffix in BLOCKED_EXTENSIONS:
        raise UnsupportedMediaTypeError(f"Files of type '{suffix}' are not accepted.")

    declared = (content_type or "").split(";")[0].strip().lower()
    if declared not in ALLOWED_MIME_TYPES:
        raise UnsupportedMediaTypeError(f"'{declared or 'unknown'}' is not an accepted file type.")

    # Content sniffing: a .exe renamed to .pdf fails here.
    signatures = MAGIC_SIGNATURES.get(declared)
    if signatures and head and not any(head.startswith(sig) for sig in signatures):
        raise UnsupportedMediaTypeError("The file contents do not match the declared file type.")

    return safe_name


def build_object_path(client_id: UUID, category: str, filename: str) -> str:
    """``<client_id>/<category>/<uuid>_<filename>``.

    The leading segment is load-bearing: the storage RLS policies derive the
    owning client from it, so it must never be omitted or reordered.
    """
    return f"{client_id}/{category}/{uuid4().hex}_{sanitize_filename(filename)}"


def bucket_for_category(category: str) -> str:
    return CATEGORY_BUCKETS.get(category, Bucket.CLIENT_DOCUMENTS).value


class SupabaseStorage:
    """Thin client over the Supabase Storage REST API.

    Uses the service-role key, so every call must already have been authorised
    by the service layer — this class performs no permission checks itself.
    """

    def __init__(self, *, base_url: str | None = None, service_key: str | None = None) -> None:
        self.base_url = (base_url or settings.supabase_url).rstrip("/")
        self.service_key = service_key or settings.supabase_service_role_key
        self._client: httpx.AsyncClient | None = None

    def _require_config(self) -> None:
        if not self.base_url or not self.service_key:
            raise DependencyUnavailableError(
                "Object storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )

    async def _http(self) -> httpx.AsyncClient:
        self._require_config()
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=f"{self.base_url}/storage/v1",
                headers={
                    "Authorization": f"Bearer {self.service_key}",
                    "apikey": self.service_key,
                },
                timeout=httpx.Timeout(30.0, connect=5.0),
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def upload(
        self, bucket: str, path: str, content: bytes, content_type: str, *, upsert: bool = False
    ) -> StoredObject:
        client = await self._http()
        try:
            response = await client.post(
                f"/object/{bucket}/{path}",
                content=content,
                headers={
                    "Content-Type": content_type,
                    "x-upsert": "true" if upsert else "false",
                    "cache-control": "private, max-age=0",
                },
            )
        except httpx.HTTPError as exc:
            logger.error("storage_upload_transport_error", bucket=bucket, error=str(exc))
            raise DependencyUnavailableError("Object storage is unreachable.") from exc

        if response.status_code >= 400:
            logger.error(
                "storage_upload_failed", bucket=bucket, status=response.status_code, body=response.text[:300]
            )
            if response.status_code == 409:
                raise ValidationError("A file already exists at that location.")
            raise DependencyUnavailableError("The file could not be stored.")

        return StoredObject(
            bucket=bucket, path=path, size=len(content), mime_type=content_type,
            original_name=PurePosixPath(path).name,
        )

    async def create_signed_url(self, bucket: str, path: str, expires_in: int = 300) -> str:
        """Time-limited download URL. Default five minutes."""
        client = await self._http()
        try:
            response = await client.post(
                f"/object/sign/{bucket}/{path}", json={"expiresIn": expires_in}
            )
        except httpx.HTTPError as exc:
            raise DependencyUnavailableError("Object storage is unreachable.") from exc

        if response.status_code >= 400:
            logger.warning("storage_sign_failed", bucket=bucket, status=response.status_code)
            raise DependencyUnavailableError("A download link could not be issued.")

        signed = response.json().get("signedURL") or response.json().get("signedUrl", "")
        return f"{self.base_url}/storage/v1{signed}" if signed.startswith("/") else signed

    async def download(self, bucket: str, path: str) -> bytes:
        client = await self._http()
        response = await client.get(f"/object/{bucket}/{path}")
        if response.status_code >= 400:
            raise DependencyUnavailableError("The file could not be retrieved.")
        return response.content

    async def delete(self, bucket: str, path: str) -> None:
        client = await self._http()
        response = await client.delete(f"/object/{bucket}/{path}")
        if response.status_code >= 400 and response.status_code != 404:
            logger.warning("storage_delete_failed", bucket=bucket, status=response.status_code)

    async def move(self, bucket: str, from_path: str, to_path: str) -> None:
        client = await self._http()
        await client.post(
            "/object/move",
            json={"bucketId": bucket, "sourceKey": from_path, "destinationKey": to_path},
        )


async def scan_for_malware(content: bytes, filename: str) -> tuple[bool, str | None]:
    """Malware scanning hook.

    No scanner is wired up yet. This returns ``(True, None)`` so uploads
    proceed, and exists as the single seam where a real scanner (ClamAV,
    VirusTotal, a cloud AV endpoint) is integrated without touching callers.
    Wire it before accepting uploads from untrusted parties.
    """
    return True, None


_storage: SupabaseStorage | None = None


def get_storage() -> SupabaseStorage:
    global _storage
    if _storage is None:
        _storage = SupabaseStorage()
    return _storage


async def close_storage() -> None:
    global _storage
    if _storage is not None:
        await _storage.aclose()
        _storage = None
