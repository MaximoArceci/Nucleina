from datetime import datetime
from typing import Any
from pydantic import BaseModel, field_validator
from fastapi import HTTPException


class SpreadsheetCreate(BaseModel):
    areaId: int
    title: str
    workbook: dict[str, Any] = {}
    updatedBy: int = 0
    archived: bool = False
    updatedAt: datetime | None = None

    @field_validator("title")
    def validate_title(cls, value):
        if len(value.strip()) == 0:
            raise HTTPException(status_code=400, detail="El titulo de la planilla no puede estar vacio")
        return value.strip()

    class Config:
        from_attributes = True


class Spreadsheet(SpreadsheetCreate):
    id: int

    class Config:
        from_attributes = True
