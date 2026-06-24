from CORS_config import origins, methods, headers
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import router

app = FastAPI(
    title="Planillas API",
    version="0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=methods,
    allow_headers=headers,
    allow_credentials=True,
    expose_headers=["*"]
)

app.include_router(router, tags=["Planillas"])
