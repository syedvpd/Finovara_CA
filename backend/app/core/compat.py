"""Small standard-library compatibility shims.

Production runs on Python 3.12 where ``enum.StrEnum`` is native; this fallback
keeps the package importable on 3.10 for local development/tooling.
"""

from __future__ import annotations

try:  # Python 3.11+
    from enum import StrEnum
except ImportError:  # Python 3.10
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        """Minimal backport: members are ``str`` instances equal to their value."""

        def __str__(self) -> str:  # pragma: no cover - trivial
            return str(self.value)


__all__ = ["StrEnum"]
