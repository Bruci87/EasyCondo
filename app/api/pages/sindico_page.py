from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="app/templates")

router = APIRouter(prefix="/sindico", tags=["Síndico Pages"])


@router.get("/dashboard")
def dashboard(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="sindico/dashboard.html",
        context={}
    )


@router.get("/area")
def area_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="sindico/area.html",
        context={}
    )