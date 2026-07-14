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
        "name": user_in.name,
        "email": user_in.email,
        "hashed_password": hashed_password,
        "voice_id": assigned_voice_id,
        "conversations": []
    }
    
    result = await db.voice_agent_db.users.insert_one(user_doc)
    
    return UserResponse(
        id=str(result.inserted_id),
        name=user_doc["name"],
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
        name=current_user.name,
        email=current_user.email,
        voice_id=current_user.voice_id
    )


@router.get("/conversations", summary="Get user conversation history")
async def get_conversations(
    session_id: str | None = None,
    limit: int = 200,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Return the authenticated user's conversation history from MongoDB.

    Query params:
        session_id: Optional — filter to a specific session (room).
        limit:      Max number of conversation turns to return (default 200).

    Returns a list of turns sorted newest-first.
    Each turn: { Date, Time, User_query, LLM_response, Tools_Used, session_id }
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    user_doc = await db.voice_agent_db.users.find_one({"email": current_user.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    conversations: list[dict] = user_doc.get("conversations", [])

    # Filter by session_id if provided
    if session_id:
        conversations = [c for c in conversations if c.get("session_id") == session_id]

    # Sort newest-first (Date DESC, then Time DESC)
    conversations.sort(
        key=lambda c: (c.get("Date", ""), c.get("Time", "")),
        reverse=True,
    )

    return {"conversations": conversations[:limit], "total": len(conversations)}


@router.get("/sessions", summary="Get grouped session list for Recents sidebar")
async def get_sessions(current_user: UserInDB = Depends(get_current_user)):
    """
    Return the authenticated user's past sessions, grouped by session_id.

    Each session entry:
        session_id:   Unique session/room identifier
        session_name: First user message in that session (truncated to 60 chars)
        date:         Most recent date for that session (YYYY-MM-DD)
        turn_count:   Number of conversation turns in that session

    Sessions are sorted newest-first by date.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    user_doc = await db.voice_agent_db.users.find_one({"email": current_user.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    conversations: list[dict] = user_doc.get("conversations", [])

    # Group by session_id
    sessions: dict[str, dict] = {}
    for conv in conversations:
        sid = conv.get("session_id") or "legacy"
        if sid not in sessions:
            # Use the first stored turn's user query as the session name
            raw_name = conv.get("User_query", "Untitled Session")
            sessions[sid] = {
                "session_id": sid,
                "session_name": raw_name[:60] + ("…" if len(raw_name) > 60 else ""),
                "date": conv.get("Date", ""),
                "turn_count": 0,
            }
        sessions[sid]["turn_count"] += 1
        # Keep the most recent date for the session
        turn_date = conv.get("Date", "")
        if turn_date > sessions[sid]["date"]:
            sessions[sid]["date"] = turn_date

    # Sort newest session first
    result = sorted(sessions.values(), key=lambda s: s["date"], reverse=True)
    return {"sessions": result, "total": len(result)}

