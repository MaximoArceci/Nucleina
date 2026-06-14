from pydantic import BaseModel, field_validator, model_validator
from fastapi import HTTPException


class KanbanBoardCreate(BaseModel):
    name: str
    areaIds: list[int] = []
    createdBy: int
    archived: bool = False

    @model_validator(mode="before")
    @classmethod
    def migrate_area_id(cls, data):
        if isinstance(data, dict) and "areaIds" not in data and "areaId" in data:
            data = {**data, "areaIds": [data["areaId"]]}
        return data

    @field_validator("name")
    def validate_name(cls, value):
        if len(value.strip()) == 0:
            raise HTTPException(status_code=400, detail="El nombre del tablero no puede estar vacio")
        return value.strip()

    @field_validator("areaIds")
    def validate_area_ids_shape(cls, value):
        normalized = sorted(set(value))
        if len(normalized) == 0:
            raise HTTPException(status_code=400, detail="El tablero debe pertenecer al menos a un area")
        return normalized

    class Config:
        from_attributes = True


class KanbanBoard(KanbanBoardCreate):
    id: int

    class Config:
        from_attributes = True
