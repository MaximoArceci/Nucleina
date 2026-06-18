from fastapi import APIRouter, Depends

from ..models.AvailabilityPoll import AvailabilityPoll, AvailabilityPollCreate, AvailabilityResponse
from ..services.availability_poll_service import AvailabilityPollService
from ..utils.jwt_utils import JWTUtils

router = APIRouter()
jwt = JWTUtils()
service = AvailabilityPollService()


@router.get("/", response_model=list[AvailabilityPoll])
async def get_polls(payload: dict = Depends(jwt.get_current_user)):
    return await service.get_todos(payload)


@router.get("/{id}", response_model=AvailabilityPoll)
async def get_poll(id: int, payload: dict = Depends(jwt.get_current_user)):
    return await service.get_visible_one(id, payload)


@router.get("/{id}/summary")
async def get_poll_summary(id: int, payload: dict = Depends(jwt.get_current_user)):
    return await service.summary(id, payload)


@router.post("/", response_model=AvailabilityPoll)
async def create_poll(model: AvailabilityPollCreate, payload: dict = Depends(jwt.get_current_user)):
    return await service.crear(model, payload)


@router.patch("/{id}", response_model=AvailabilityPoll)
async def update_poll(id: int, model: dict, payload: dict = Depends(jwt.get_current_user)):
    return await service.update(id, model, payload)


@router.post("/{id}/responses", response_model=AvailabilityPoll)
async def respond_to_poll(id: int, model: AvailabilityResponse, payload: dict = Depends(jwt.get_current_user)):
    return await service.respond(id, model, payload)


@router.delete("/{id}", response_model=AvailabilityPoll)
async def archive_poll(id: int, payload: dict = Depends(jwt.get_current_user)):
    return await service.archive(id, payload)
