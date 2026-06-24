from fastapi import APIRouter, Depends
from datos_microservice.utils.jwt_utils import JWTUtils
from .models.Spreadsheet import Spreadsheet, SpreadsheetCreate
from .services.spreadsheet_service import SpreadsheetService

router = APIRouter()
jwt = JWTUtils()
spreadsheet_service = SpreadsheetService()


@router.get("/", response_model=list[Spreadsheet])
async def get_spreadsheets(payload: dict = Depends(jwt.get_current_user)):
    return await spreadsheet_service.get_todos(payload)


@router.get("/area/{area_id}", response_model=list[Spreadsheet])
async def get_spreadsheets_by_area(area_id: int, payload: dict = Depends(jwt.get_current_user)):
    return await spreadsheet_service.get_by_area(area_id, payload)


@router.post("/", response_model=Spreadsheet)
async def create_spreadsheet(model: SpreadsheetCreate, payload: dict = Depends(jwt.get_current_user)):
    return await spreadsheet_service.crear(model, payload)


@router.patch("/{id}", response_model=Spreadsheet)
async def update_spreadsheet(id: int, model: dict, payload: dict = Depends(jwt.get_current_user)):
    return await spreadsheet_service.update_spreadsheet(id, model, payload)


@router.delete("/{id}", response_model=Spreadsheet)
async def delete_spreadsheet(id: int, payload: dict = Depends(jwt.get_current_user)):
    return await spreadsheet_service.update_spreadsheet(id, {"archived": True}, payload)
