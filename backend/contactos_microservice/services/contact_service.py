from datetime import datetime
from fastapi import HTTPException

from kanban_microservice.services.module_service import ModuleService
from ..models.Contact import Contact


class ContactService(ModuleService):
    def __init__(self):
        super().__init__(Contact, "Contacts")

    async def crear(self, model, payload):
        last_id = await self.get_last_id()
        contact_data = model.model_dump()
        contact_data["createdBy"] = payload.get("id", contact_data.get("createdBy", 0))
        contact_data["updatedBy"] = payload.get("id", contact_data.get("updatedBy", 0))
        contact_data["createdAt"] = datetime.utcnow()
        contact_data["updatedAt"] = datetime.utcnow()
        contact = self.model(**contact_data, id=int(last_id) + 1)
        return await self.create(contact)

    async def get_todos(self, payload):
        return await self.get_multiple({"archived": False})

    async def update_contact(self, id: int, data: dict, payload):
        current = await self.get_one(id)
        if type(current) == ValueError:
            raise HTTPException(status_code=404, detail="Contacto inexistente")
        data["updatedAt"] = datetime.utcnow()
        data["updatedBy"] = payload.get("id", data.get("updatedBy", current.updatedBy))
        return await self.update_one(id, data)

    async def archive(self, id: int, payload):
        return await self.update_contact(id, {"archived": True}, payload)
