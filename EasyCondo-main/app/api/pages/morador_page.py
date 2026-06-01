from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="app/templates")

router = APIRouter(prefix="/morador", tags=["Morador Pages"])


@router.get("/")
def dashboard(request: Request):
    return templates.TemplateResponse(
        request=request, name="morador/morador.html", context={}
    )


@router.get("/historico", response_class=HTMLResponse)
def exibir_historico_morador(request: Request):
    return templates.TemplateResponse(
        request=request, name="morador/historico.html", context={}
    )