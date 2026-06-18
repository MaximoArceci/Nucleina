from datetime import datetime
from pydantic import BaseModel, FieldValidationInfo, field_validator, model_validator
from fastapi import HTTPException


class AvailabilitySlot(BaseModel):
    id: int
    start: datetime
    end: datetime

    @field_validator("end")
    def validate_end(cls, value, info: FieldValidationInfo):
        start = info.data.get("start")
        if start and value <= start:
            raise HTTPException(status_code=400, detail="El fin del slot debe ser posterior al inicio")
        return value


class AvailabilityResponse(BaseModel):
    volunteerId: int
    slotIds: list[int] = []
    note: str = ""
    updatedAt: datetime

    @field_validator("slotIds")
    def unique_slot_ids(cls, value):
        return sorted(set(value))


class AvailabilityPollCreate(BaseModel):
    title: str
    description: str = ""
    organizerId: int
    areaIds: list[int] = []
    daysCount: int = 7
    startHour: int = 8
    endHour: int = 22
    slots: list[AvailabilitySlot]
    responses: list[AvailabilityResponse] = []
    archived: bool = False
    createdAt: datetime | None = None

    @field_validator("title")
    def validate_title(cls, value):
        if len(value.strip()) == 0:
            raise HTTPException(status_code=400, detail="El titulo de la encuesta no puede estar vacio")
        return value.strip()

    @field_validator("areaIds")
    def validate_area_ids(cls, value):
        return sorted(set(value))

    @field_validator("daysCount")
    def validate_days_count(cls, value):
        if value < 1 or value > 31:
            raise HTTPException(status_code=400, detail="La cantidad de dias debe estar entre 1 y 31")
        return value

    @field_validator("startHour", "endHour")
    def validate_hours(cls, value):
        if value < 0 or value > 24:
            raise HTTPException(status_code=400, detail="Las horas deben estar entre 0 y 24")
        return value

    @field_validator("slots")
    def validate_slots(cls, value):
        if len(value) == 0:
            raise HTTPException(status_code=400, detail="Debe cargar al menos un horario")
        slot_ids = [slot.id for slot in value]
        if len(slot_ids) != len(set(slot_ids)):
            raise HTTPException(status_code=400, detail="Los horarios no pueden repetir id")
        return value

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.endHour <= self.startHour:
            raise HTTPException(status_code=400, detail="La hora de fin debe ser posterior a la hora de inicio")
        return self

    class Config:
        from_attributes = True


class AvailabilityPoll(AvailabilityPollCreate):
    id: int

    class Config:
        from_attributes = True
