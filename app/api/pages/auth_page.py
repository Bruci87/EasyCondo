from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

templates = Jinja2Templates(directory="app/templates")

router = APIRouter()

@router.get("/")
def home():
    return RedirectResponse(url="/auth/login")


@router.get("/auth/login")
def login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="auth/login.html",
        context={}
    )


@router.get("/auth/register")
def register_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="auth/register.html",
        context={}
    )


@router.get("/sindico/login")
def sindico_login_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="auth/sindico_login.html",
        context={}
    )
    