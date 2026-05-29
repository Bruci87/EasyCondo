from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="app/templates")

router = APIRouter(prefix="/morador", tags=["Morador Pages"])


@router.get("/")
def dashboard(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="morador/morador.html",
        context={}
    )
    