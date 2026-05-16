from pydantic import BaseModel, Field


class AIRecommendIn(BaseModel):
    query: str = Field(min_length=1, max_length=200)


class AIRecommendItem(BaseModel):
    dish_id: int
    reason: str = Field(max_length=200)


class AIRecommendOut(BaseModel):
    recommendations: list[AIRecommendItem]
