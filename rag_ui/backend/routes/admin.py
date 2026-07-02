"""Admin routes — all protected by get_current_admin_user."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import User, get_db
from models.admin import AdminActivityResponse, AdminPDFsResponse, AdminStats, AdminUsersResponse
from services import admin as admin_svc
from services.auth import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db), _: User = Depends(get_current_admin_user)) -> AdminStats:
    return admin_svc.get_stats(db)


@router.get("/users", response_model=AdminUsersResponse)
def get_users(db: Session = Depends(get_db), _: User = Depends(get_current_admin_user)) -> AdminUsersResponse:
    return admin_svc.get_users(db)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)) -> dict:
    return admin_svc.delete_user(db, user_id, current_admin.id)


@router.patch("/users/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)) -> dict:
    return admin_svc.toggle_user(db, user_id, current_admin.id)


@router.get("/pdfs", response_model=AdminPDFsResponse)
def get_pdfs(_: User = Depends(get_current_admin_user)) -> AdminPDFsResponse:
    return admin_svc.get_pdfs()


@router.delete("/pdfs/{filename:path}")
def delete_pdf(filename: str, _: User = Depends(get_current_admin_user)) -> dict:
    return admin_svc.delete_pdf(filename)


@router.get("/activity", response_model=AdminActivityResponse)
def get_activity(_: User = Depends(get_current_admin_user)) -> AdminActivityResponse:
    return admin_svc.get_activity()
