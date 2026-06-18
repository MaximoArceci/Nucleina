from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from fastapi import HTTPException


class ContactCreate(BaseModel):
    name: str
    organization: str = ""
    email: EmailStr | None = None
    phone: str = ""
    description: str = ""
    createdBy: int = 0
    updatedBy: int = 0
    archived: bool = False
    createdAt: datetime | None = None
    updatedAt: datetime | None = None

    @field_validator("name")
    def validate_name(cls, value):
        if len(value.strip()) == 0:
            raise HTTPException(status_code=400, detail="El nombre del contacto no puede estar vacio")
        return value.strip()

    @field_validator("organization", "phone", "description")
    def strip_text(cls, value):
        return value.strip()

    class Config:
        from_attributes = True


class Contact(ContactCreate):
    id: int

    class Config:
        from_attributes = True
