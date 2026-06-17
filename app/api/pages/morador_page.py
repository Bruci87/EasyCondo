from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

templates = Jinja2Templates(directory="app/templates")

router = APIRouter(prefix="/morador", tags=["Morador Pages"])


@router.get("/")
def dashboard(request: Request):
    if not request.session.get("user_id"):
        return RedirectResponse(url="/auth/login", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="morador/morador.html",
        context={}
    )
    