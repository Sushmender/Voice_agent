from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    id: str
    name: str
    email: EmailStr
    hashed_password: Optional[str] = None   # None for OAuth users
    voice_id: str
    auth_provider: str = "local"             # "local" | "google" | "github"
    conversations: list = []
    system_prompt_override: str = ""
    response_style: float = 0.5  # 0.0 = ultra-concise, 1.0 = detailed

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    voice_id: str
    auth_provider: str = "local"
    system_prompt_override: str = ""
    response_style: float = 0.5

class AgentSettingsUpdate(BaseModel):
    system_prompt_override: str = ""
    response_style: float = 0.5

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
