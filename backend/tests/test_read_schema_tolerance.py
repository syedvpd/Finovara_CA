"""Response schemas must never be stricter than the database.

A `*Read` model is applied to rows that already exist. If it validates more
strictly than whatever wrote them, one legacy row turns the entire listing
endpoint into a 500 — which is exactly how `GET /employees` broke: `UserRead`
typed `email` as `EmailStr`, and addresses on reserved TLDs were rejected on
the way out.

Validate on input. Serialise on output.
"""

import importlib
import pkgutil

import pytest
from pydantic import EmailStr

import app.schemas


def _read_models():
    for mod in pkgutil.iter_modules(app.schemas.__path__):
        module = importlib.import_module(f"app.schemas.{mod.name}")
        for name in dir(module):
            obj = getattr(module, name)
            if isinstance(obj, type) and name.endswith("Read") and hasattr(obj, "model_fields"):
                yield f"{mod.name}.{name}", obj


@pytest.mark.parametrize("name,model", list(_read_models()), ids=lambda v: v if isinstance(v, str) else "")
def test_read_schemas_do_not_revalidate_emails(name, model):
    for field, info in model.model_fields.items():
        assert info.annotation is not EmailStr, (
            f"{name}.{field} is EmailStr; use `str` on read models so a stored "
            f"address can never 500 the endpoint that returns it."
        )
