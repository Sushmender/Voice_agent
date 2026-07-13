from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from backend.config import get_settings
from backend.models.user import TokenData, UserInDB
from backend.db.mongodb import get_database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except InvalidTokenError:
        raise credentials_exception
    
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection error")
        
    user_doc = await db.voice_agent_db.users.find_one({"email": token_data.email})
    if user_doc is None:
        raise credentials_exception
        
    return UserInDB(
        id=str(user_doc["_id"]),
        name=user_doc.get("name", "User"),
        email=user_doc["email"],
        hashed_password=user_doc["hashed_password"],
        voice_id=user_doc["voice_id"],
        conversations=user_doc.get("conversations", [])
    )
