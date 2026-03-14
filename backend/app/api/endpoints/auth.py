# backend/app/api/endpoints/auth.py

import pyotp
import secrets
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
    # valid_window=3 으로 확장 (서버-클라이언트 시간 오차 허용 범위 증가)
    if totp.verify(request.otp_code, valid_window=3):
        # 성공 시 세션용 임시 토큰 생성
        session_token = secrets.token_urlsafe(32)
        return {
            "status": "success", 
            "user": request.user_id,
            "token": session_token
        }
    else:
        raise AuthException("Invalid OTP Code")