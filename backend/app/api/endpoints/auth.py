# backend/app/api/endpoints/auth.py

import pyotp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import OTP_SECRET_SB, OTP_SECRET_JS
from app.core.exceptions import AuthException

router = APIRouter()

VALID_USERS = {
    "sb": OTP_SECRET_SB,
    "js": OTP_SECRET_JS
}

class LoginRequest(BaseModel):
    user_id: str
    otp_code: str

@router.post("/login")
def login(request: LoginRequest):
    secret_key = VALID_USERS.get(request.user_id)
    if not secret_key:
        raise AuthException("Invalid User ID")

    totp = pyotp.TOTP(secret_key)
    if totp.verify(request.otp_code, valid_window=1):
        # 성공 시 메시지 반환 (나중에 JWT 토큰으로 교체 권장)
        return {"status": "success", "user": request.user_id}
    else:
        raise AuthException("Invalid OTP Code")