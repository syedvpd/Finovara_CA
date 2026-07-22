import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.services.auth_security import SupabaseAuthAdmin

async def test_otp():
    print("Supabase URL:", settings.supabase_url)
    print("Supabase Anon Key length:", len(settings.supabase_anon_key) if settings.supabase_anon_key else 0)
    
    admin = SupabaseAuthAdmin()
    print("Sending OTP to partner@finovara.demo...")
    
    # We will invoke the _post method to get the full response details
    response = await admin._post("/auth/v1/otp", admin.anon, {"email": "partner@finovara.demo", "create_user": False})
    
    print("HTTP Status Code:", response.status_code)
    print("HTTP Response Body:", response.text)

if __name__ == "__main__":
    asyncio.run(test_otp())
