from datetime import datetime
from fastapi import HTTPException
from kanban_microservice.services.module_service import ModuleService
from datos_microservice.services.area_service import AreaService
from ..models.Spreadsheet import Spreadsheet


class SpreadsheetService(ModuleService):
    def __init__(self):
        self.area_service = AreaService()
        super().__init__(Spreadsheet, "Spreadsheets")

    async def crear(self, model, payload):
        await self.area_service.validate_area_ids([model.areaId])
        if payload["role"] != "Admin" and model.areaId not in payload.get("areaIds", []):
            raise HTTPException(status_code=401, detail="No tienes permisos para crear planillas en esta area")
        last_id = await self.get_last_id()
        spreadsheet_data = model.model_dump()
        spreadsheet_data["updatedBy"] = payload.get("id", spreadsheet_data.get("updatedBy", 0))
        spreadsheet_data["updatedAt"] = datetime.utcnow()
        spreadsheet = self.model(**spreadsheet_data, id=int(last_id) + 1)
        return await self.create(spreadsheet)

    async def update_spreadsheet(self, id: int, data: dict, payload):
        current = await self.get_one(id)
        if type(current) == ValueError:
            raise HTTPException(status_code=404, detail="Planilla inexistente")
        area_id = data.get("areaId", current.areaId)
        await self.area_service.validate_area_ids([area_id])
        if payload["role"] != "Admin" and area_id not in payload.get("areaIds", []):
            raise HTTPException(status_code=401, detail="No tienes permisos para editar planillas en esta area")
        data["updatedAt"] = datetime.utcnow()
        data["updatedBy"] = payload.get("id", data.get("updatedBy", current.updatedBy))
        return await self.update_one(id, data)

    async def get_todos(self, payload):
        if payload["role"] == "Admin":
            return await self.get_multiple({"archived": False})
        return await self.get_multiple({"archived": False, "areaId": {"$in": payload.get("areaIds", [])}})

    async def get_by_area(self, area_id: int, payload):
        if payload["role"] != "Admin" and area_id not in payload.get("areaIds", []):
            raise HTTPException(status_code=401, detail="No tienes permisos para ver planillas de esta area")
        return await self.get_multiple({"archived": False, "areaId": area_id})
