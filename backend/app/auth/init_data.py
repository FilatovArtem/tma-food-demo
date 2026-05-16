import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl


@dataclass(frozen=True)
class TgUser:
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None


class InitDataError(Exception):
    pass


class InitDataInvalid(InitDataError):
    pass


class InitDataExpired(InitDataError):
    pass


def parse_and_verify(raw: str, bot_token: str, max_age: int = 3600) -> TgUser:
    pairs = parse_qsl(raw, keep_blank_values=True)
    data = dict(pairs)
    received_hash = data.pop("hash", None)
    if not received_hash:
        raise InitDataInvalid("hash missing")

    data_check_string = "\n".join(f"{k}={data[k]}" for k in sorted(data))

    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed, received_hash):
        raise InitDataInvalid("hash mismatch")

    try:
        auth_date = int(data["auth_date"])
    except (KeyError, ValueError) as e:
        raise InitDataInvalid("auth_date missing or invalid") from e
    if time.time() - auth_date > max_age:
        raise InitDataExpired("auth_date too old")

    try:
        user = json.loads(data["user"])
    except (KeyError, json.JSONDecodeError) as e:
        raise InitDataInvalid("user missing or malformed") from e

    return TgUser(
        id=int(user["id"]),
        first_name=user.get("first_name", ""),
        last_name=user.get("last_name"),
        username=user.get("username"),
    )
