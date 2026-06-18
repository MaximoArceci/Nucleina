from .api import routes_list
from .api import availability_poll_router
from CORS_config import origins, methods, headers
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from .constants import MONGO_DB_NAME, MONGO_DEV_NAME
from db.database import get_database
from .utils import oauth_utils as google_auth

app = FastAPI(
    title="Reuniones API",
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

db = get_database()


@app.get("/")
async def root():
    return RedirectResponse(url="/reuniones/docs")


@app.get("/restore_dev_db")
async def restore_db():
    mainDb = db.client[MONGO_DB_NAME]
    devDb = db.client[MONGO_DEV_NAME]
    collections = devDb.list_collection_names()
    for i in collections:
        try:
            devDb.drop_collection(i)
        except:
            continue
    collections = mainDb.list_collection_names()
    for i in collections:
        data = mainDb[i].find({})
        devDb.create_collection(i)
        devDb[i].insert_many(data)

    return "Done"


for route in routes_list:
    app.include_router(route[0]().router, prefix=route[1], tags=route[2])
app.include_router(google_auth.router, prefix="/auth", tags=["Google Auth"])
app.include_router(availability_poll_router.router, prefix="/availability-polls", tags=["Availability Polls"])
