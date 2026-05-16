from pydantic import BaseModel, ConfigDict


class DishOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    name: str
    description: str
    composition: str | None = None
    calories: int | None = None
    price: int
    photo_url: str
    is_available: bool
