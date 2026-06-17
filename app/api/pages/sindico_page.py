from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

templates = Jinja2Templates(directory="app/templates")

router = APIRouter(prefix="/sindico", tags=["Síndico Pages"])


def _garantir_sindico_logado(request: Request):
    if not request.session.get("user_id") or not request.session.get("is_sindico"):
        return RedirectResponse(url="/sindico/login", status_code=303)
    return None


@router.get("/dashboard")
def dashboard(request: Request):
    redirecionamento = _garantir_sindico_logado(request)
    if redirecionamento:
        return redirecionamento

    return templates.TemplateResponse(
        request=request,
        name="sindico/dashboard.html",
        context={}
    )


@router.get("/area")
def area_page(request: Request):
    redirecionamento = _garantir_sindico_logado(request)
    if redirecionamento:
        return redirecionamento

    return templates.TemplateResponse(
        request=request,
        name="sindico/area.html",
        context={}
    )


@router.get("/reservas")
def reservas_page(request: Request):
    redirecionamento = _garantir_sindico_logado(request)
    if redirecionamento:
        return redirecionamento

    return templates.TemplateResponse(
        request=request,
        name="sindico/reservas.html",
        context={}
    )