from datos_microservice.aplication import app as datos_MSApp
from reuniones_microservice.aplication import app as reuniones_MSApp
from pago_microservice.aplication import app as pago_MSApp
from kanban_microservice.aplication import app as kanban_MSApp
from documentos_microservice.aplication import app as documentos_MSApp
from contactos_microservice.aplication import app as contactos_MSApp
from planillas_microservice.aplication import app as planillas_MSApp
import CORS_config
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from db.database import get_database
from main_constants import TEST
from dotenv import load_dotenv
load_dotenv()  # Inicializa las variables de entorno

main_app = FastAPI(
    title="Nucleus API",
    version="0.1",
    debug=TEST,
)


main_app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_config.origins,
    allow_methods=CORS_config.methods,
    allow_headers=CORS_config.headers,
    allow_credentials=True,
    expose_headers=["*"]
)

main_app.mount("/datos", datos_MSApp)
main_app.mount("/reuniones", reuniones_MSApp)
main_app.mount("/pagos", pago_MSApp)
main_app.mount("/kanban", kanban_MSApp)
main_app.mount("/documentos", documentos_MSApp)
main_app.mount("/contactos", contactos_MSApp)
main_app.mount("/planillas", planillas_MSApp)

@main_app.get("/")
async def root():
    return RedirectResponse(url="/docs")


@main_app.get("/datos")
async def root():
    return RedirectResponse(url="/datos/docs")

@main_app.get("/reuniones")
async def root():
    return RedirectResponse(url="/reuniones/docs")

@main_app.get("/pagos")
async def root():
    return RedirectResponse(url="/pagos/docs")

@main_app.get("/kanban")
async def root():
    return RedirectResponse(url="/kanban/docs")

@main_app.get("/documentos")
async def root():
    return RedirectResponse(url="/documentos/docs")

@main_app.get("/contactos")
async def root():
    return RedirectResponse(url="/contactos/docs")

@main_app.get("/planillas")
async def root():
    return RedirectResponse(url="/planillas/docs")
