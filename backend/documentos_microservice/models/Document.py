from datetime import datetime
from pydantic import BaseModel, field_validator
from fastapi import HTTPException


class DocumentCreate(BaseModel):
    areaId: int
    title: str
    content: str = ""
    driveFileId: str = ""
    driveUrl: str = ""
    drivePreviewUrl: str = ""
    updatedBy: int = 0
    archived: bool = False
    updatedAt: datetime | None = None

    @field_validator("title")
    def validate_title(cls, value):
        if len(value.strip()) == 0:
            raise HTTPException(status_code=400, detail="El titulo del documento no puede estar vacio")
        return value.strip()

    class Config:
        from_attributes = True


class Document(DocumentCreate):
    id: int

    class Config:
        from_attributes = True
