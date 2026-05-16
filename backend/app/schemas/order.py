import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OrderItemIn(BaseModel):
    dish_id: int = Field(ge=1)
    qty: int = Field(ge=1, le=99)


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=128)
    phone: str
    comment: str | None = Field(default=None, max_length=500)

    @field_validator("phone")
    @classmethod
    def _normalize_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) == 11 and digits[0] in "78":
            return "+7" + digits[1:]
        if len(digits) == 10:
            return "+7" + digits
        raise ValueError("phone must be 11 RU digits (+7XXXXXXXXXX)")


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dish_id: int
    dish_name: str
    unit_price: int
    qty: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    total: int
    created_at: datetime
    items: list[OrderItemOut]
