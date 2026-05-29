from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

from app.api.routes import auth, solicitacao, area, reserva, dashboard
from app.api.pages import (
    auth_page,
    sindico_page,
    morador_page
)

from app.db.session import engine, Base

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app.mount(
    "/static",
    StaticFiles(directory=os.path.join(BASE_DIR, "static")),
    name="static"
)

Base.metadata.create_all(bind=engine)

# API
app.include_router(auth.router)
app.include_router(solicitacao.router)
app.include_router(area.router)
app.include_router(reserva.router)
app.include_router(dashboard.router)

# PAGES
app.include_router(auth_page.router)
app.include_router(sindico_page.router)
app.include_router(morador_page.router)