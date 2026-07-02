from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Returned to the client — never includes the hashed password."""
    id: int
    username: str
    email: str
    is_admin: bool = False
    is_active: bool = True
    has_seen_tour: bool = False
    avatar_url: str | None = None
    auth_provider: str = "local"
