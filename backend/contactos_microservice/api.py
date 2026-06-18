from fastapi import APIRouter, Depends

from datos_microservice.utils.jwt_utils import JWTUtils
from .models.Contact import Contact, ContactCreate
from .services.contact_service import ContactService

router = APIRouter()
jwt = JWTUtils()
contact_service = ContactService()


@router.get("/", response_model=list[Contact])
async def get_contacts(payload: dict = Depends(jwt.get_current_user)):
    return await contact_service.get_todos(payload)


@router.post("/", response_model=Contact)
async def create_contact(model: ContactCreate, payload: dict = Depends(jwt.get_current_user)):
    return await contact_service.crear(model, payload)


@router.patch("/{id}", response_model=Contact)
async def update_contact(id: int, model: dict, payload: dict = Depends(jwt.get_current_user)):
    return await contact_service.update_contact(id, model, payload)


@router.delete("/{id}", response_model=Contact)
async def delete_contact(id: int, payload: dict = Depends(jwt.get_current_user)):
    return await contact_service.archive(id, payload)
