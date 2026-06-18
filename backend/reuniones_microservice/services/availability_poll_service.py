from datetime import datetime
from fastapi import HTTPException

from .module_service import ModuleService
from ..models.AvailabilityPoll import AvailabilityPoll, AvailabilityResponse
from datos_microservice.services.area_service import AreaService
from datos_microservice.services.voluntario_service import VoluntarioService


class AvailabilityPollService(ModuleService):
    def __init__(self):
        self.area_service = AreaService()
        self.voluntario_service = VoluntarioService()
        super().__init__(AvailabilityPoll, "AvailabilityPolls")

    def _can_access(self, poll, payload):
        if payload["role"] == "Admin" or poll.organizerId == payload["id"]:
            return True
        if not poll.areaIds:
            return True
        return bool(set(payload.get("areaIds", [])).intersection(set(poll.areaIds)))

    async def _validate_area_ids(self, area_ids):
        if not area_ids:
            return []
        return await self.area_service.validate_area_ids(area_ids)

    async def crear(self, model, payload):
        if payload["role"] != "Admin" and model.organizerId != payload["id"]:
            raise HTTPException(status_code=401, detail="No tienes permisos para crear esta encuesta")

        model.areaIds = await self._validate_area_ids(model.areaIds)
        last_id = await self.get_last_id()
        poll = self.model(
            **model.model_dump(exclude={"createdAt", "responses"}),
            id=int(last_id) + 1,
            createdAt=model.createdAt or datetime.utcnow(),
            responses=[]
        )
        return await self.create(poll)

    async def get_todos(self, payload):
        polls = await self.get_multiple({"archived": False})
        return [poll for poll in polls if self._can_access(poll, payload)]

    async def get_visible_one(self, id, payload):
        poll = await self.get_one(id)
        if type(poll) == ValueError:
            raise HTTPException(status_code=404, detail="Encuesta inexistente")
        if not self._can_access(poll, payload):
            raise HTTPException(status_code=401, detail="No tienes permisos para ver esta encuesta")
        return poll

    async def update(self, id, model, payload):
        poll = await self.get_visible_one(id, payload)
        if payload["role"] != "Admin" and poll.organizerId != payload["id"]:
            raise HTTPException(status_code=401, detail="No tienes permisos para editar esta encuesta")
        if "areaIds" in model:
            model["areaIds"] = await self._validate_area_ids(model["areaIds"])
        return await self.update_one(id, model)

    async def archive(self, id, payload):
        return await self.update(id, {"archived": True}, payload)

    async def respond(self, id, response, payload):
        poll = await self.get_visible_one(id, payload)
        volunteer_id = payload["id"]
        if response.volunteerId != volunteer_id and payload["role"] != "Admin":
            raise HTTPException(status_code=401, detail="No puedes responder por otro usuario")

        slot_ids = {slot.id for slot in poll.slots}
        invalid_slot_ids = set(response.slotIds) - slot_ids
        if invalid_slot_ids:
            raise HTTPException(status_code=400, detail="La respuesta contiene horarios inexistentes")

        next_response = AvailabilityResponse(
            volunteerId=response.volunteerId,
            slotIds=response.slotIds,
            note=response.note,
            updatedAt=datetime.utcnow()
        )
        responses = [item for item in poll.responses if item.volunteerId != next_response.volunteerId]
        responses.append(next_response)
        return await self.update_one(id, {"responses": [item.model_dump() for item in responses]})

    async def summary(self, id, payload):
        poll = await self.get_visible_one(id, payload)
        volunteers = await self.voluntario_service.get_multiple()
        volunteers_by_id = {volunteer.id: volunteer for volunteer in volunteers}
        response_by_volunteer = {response.volunteerId: response for response in poll.responses}

        slots = []
        for slot in poll.slots:
            available = [
                response.volunteerId
                for response in poll.responses
                if slot.id in response.slotIds
            ]
            slots.append({
                **slot.model_dump(),
                "availableVolunteerIds": available,
                "availableCount": len(available)
            })

        participants = []
        for volunteer in volunteers:
            if poll.areaIds and not set(volunteer.areaIds).intersection(set(poll.areaIds)):
                continue
            response = response_by_volunteer.get(volunteer.id)
            participants.append({
                "id": volunteer.id,
                "username": volunteer.username,
                "email": volunteer.email,
                "areaIds": volunteer.areaIds,
                "responded": response is not None,
                "slotIds": response.slotIds if response else [],
                "note": response.note if response else ""
            })

        return {
            "poll": poll,
            "slots": slots,
            "participants": participants,
            "volunteersById": {
                volunteer_id: {
                    "id": volunteer.id,
                    "username": volunteer.username,
                    "email": volunteer.email,
                    "areaIds": volunteer.areaIds
                }
                for volunteer_id, volunteer in volunteers_by_id.items()
            }
        }
