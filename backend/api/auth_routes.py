from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import random

from backend.models.user import UserCreate, UserResponse, Token, UserInDB
from backend.auth.security import get_password_hash, verify_password, create_access_token
from backend.auth.deps import get_current_user
from backend.db.mongodb import get_database
from backend.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse)
async def signup(user_in: UserCreate):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    # Check if user exists
    existing_user = await db.voice_agent_db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Assign a random voice_id
    settings = get_settings()
    voice_ids = [v.strip() for v in settings.cartesia_voice_ids.split(",") if v.strip()]
    assigned_voice_id = random.choice(voice_ids) if voice_ids else settings.cartesia_voice_id
    
    # Hash password and save
    hashed_password = get_password_hash(user_in.password)
    user_doc = {
        "email": user_in.email,
        "hashed_password": hashed_password,
        "voice_id": assigned_voice_id
    }
    
    result = await db.voice_agent_db.users.insert_one(user_doc)
    
    return UserResponse(
        id=str(result.inserted_id),
        email=user_doc["email"],
        voice_id=user_doc["voice_id"]
    )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    user_doc = await db.voice_agent_db.users.find_one({"email": form_data.username})
    if not user_doc or not verify_password(form_data.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user_doc["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        voice_id=current_user.voice_id
    )
