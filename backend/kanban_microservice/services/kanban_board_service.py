from fastapi import HTTPException
from .module_service import ModuleService
from ..models.KanbanBoard import KanbanBoard
from datos_microservice.services.area_service import AreaService


class KanbanBoardService(ModuleService):
    def __init__(self):
        self.area_service = AreaService()
        super().__init__(KanbanBoard, "KanbanBoards")

    async def crear(self, model, payload):
        model.areaIds = await self.area_service.validate_area_ids(model.areaIds)
        if payload["role"] != "Admin" and not set(model.areaIds).issubset(set(payload.get("areaIds", []))):
            raise HTTPException(status_code=401, detail="No tienes permisos para crear tableros en estas areas")
        last_id = await self.get_last_id()
        board = self.model(**model.model_dump(), id=int(last_id) + 1)
        return await self.create(board)

    async def update_one(self, id: int, data: dict):
        if "areaId" in data and "areaIds" not in data:
            data["areaIds"] = [data.pop("areaId")]
        if "areaIds" in data:
            data["areaIds"] = await self.area_service.validate_area_ids(data["areaIds"])
        return await super().update_one(id, data)

    async def get_todos(self, payload):
        if payload["role"] == "Admin":
            return await self.get_multiple()
        area_ids = payload.get("areaIds", [])
        return await self.get_multiple({"$or": [{"areaIds": {"$in": area_ids}}, {"areaId": {"$in": area_ids}}]})
