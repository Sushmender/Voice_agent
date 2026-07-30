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
    hashed_password: str
    voice_id: str
    conversations: list = []
    system_prompt_override: str = ""
    response_style: float = 0.5  # 0.0 = ultra-concise, 1.0 = detailed

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    voice_id: str
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
