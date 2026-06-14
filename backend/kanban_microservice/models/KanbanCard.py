from datetime import datetime
from pydantic import BaseModel, field_validator
from fastapi import HTTPException


class KanbanCardCreate(BaseModel):
    boardId: int
    columnId: int
    title: str
    description: str = ""
    areaId: int
    assigneeIds: list[int] = []
    labels: list[str] = []
    blocksCardId: int | None = None
    location: str = ""
    position: int = 0
    dueDate: datetime | None = None
    archived: bool = False
    createdBy: int

    @field_validator("title")
    def validate_title(cls, value):
        if len(value.strip()) == 0:
            raise HTTPException(status_code=400, detail="El titulo de la tarjeta no puede estar vacio")
        return value.strip()

    @field_validator("assigneeIds")
    def validate_assignees(cls, value):
        return sorted(set(value))

    @field_validator("labels")
    def validate_labels(cls, value):
        return sorted(set(label.strip() for label in value if label.strip()))

    @field_validator("position")
    def validate_position(cls, value):
        if value < 0:
            raise HTTPException(status_code=400, detail="La posicion no puede ser negativa")
        return value

    class Config:
        from_attributes = True


class KanbanCard(KanbanCardCreate):
    id: int

    class Config:
        from_attributes = True
