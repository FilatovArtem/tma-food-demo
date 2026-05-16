from fastapi import Header, HTTPException, Request, status

from app.auth.init_data import InitDataExpired, InitDataInvalid, TgUser, parse_and_verify
from app.core.config import get_settings


async def require_tg_user(
    request: Request,
    authorization: str = Header(..., alias="Authorization"),
) -> TgUser:
    if not authorization.startswith("tma "):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "invalid auth scheme; expected 'tma <init_data>'",
        )
    raw = authorization[4:]
    settings = get_settings()
    try:
        user = parse_and_verify(raw, settings.bot_token, settings.init_data_max_age)
    except InitDataExpired as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "init data expired") from e
    except InitDataInvalid as e:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, f"invalid init data: {e}"
        ) from e
    request.state.tg_user = user
    return user
