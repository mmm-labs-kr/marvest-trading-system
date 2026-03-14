from typing import Any, Dict, Optional

class MarvestException(Exception):
    """Marvest API의 기본 예외 클래스"""
    def __init__(
        self,
        status_code: int = 500,
        code: str = "INTERNAL_SERVER_ERROR",
        message: str = "An unexpected error occurred",
        detail: Optional[Any] = None
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.detail = detail
        super().__init__(message)

class BotNotFoundException(MarvestException):
    def __init__(self, bot_id: str):
        super().__init__(
            status_code=404,
            code="BOT_NOT_FOUND",
            message=f"Bot with ID '{bot_id}' was not found"
        )

class StrategyNotFoundException(MarvestException):
    def __init__(self, strategy_name: str):
        super().__init__(
            status_code=404,
            code="STRATEGY_NOT_FOUND",
            message=f"Strategy '{strategy_name}' was not found"
        )

class ConfigFileNotFoundException(MarvestException):
    def __init__(self, path: str):
        super().__init__(
            status_code=404,
            code="CONFIG_FILE_NOT_FOUND",
            message=f"Configuration file at '{path}' was not found"
        )

class InternalServerException(MarvestException):
    def __init__(self, message: str = "Internal server error", detail: Any = None):
        super().__init__(
            status_code=500,
            code="INTERNAL_SERVER_ERROR",
            message=message,
            detail=detail
        )

class AuthException(MarvestException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            status_code=401,
            code="AUTH_FAILED",
            message=message
        )
