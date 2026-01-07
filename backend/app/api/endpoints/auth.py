# backend/app/api/endpoints/auth.py

import os
import pyotp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

VALID_USERS = {
    "sb": os.getenv("OTP_SECRET_SB"),
    "js": os.getenv("OTP_SECRET_JS")
}

class LoginRequest(BaseModel):
    user_id: str
    otp_code: str

@router.post("/login")
def login(request: LoginRequest):
    secret_key = VALID_USERS.get(request.user_id)
    if not secret_key:
        raise HTTPException(status_code=401, detail="Invalid User ID")

    totp = pyotp.TOTP(secret_key)
    if totp.verify(request.otp_code, valid_window=1):
        # 성공 시 메시지 반환 (나중에 JWT 토큰으로 교체 권장)
        return {"status": "success", "user": request.user_id}
    else:
        raise HTTPException(status_code=401, detail="Invalid OTP Code")