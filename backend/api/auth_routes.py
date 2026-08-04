import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import random

from backend.models.user import UserCreate, UserResponse, Token, UserInDB, AgentSettingsUpdate
from backend.auth.security import get_password_hash, verify_password, create_access_token
from backend.auth.deps import get_current_user
from backend.db.mongodb import get_database
from backend.config import get_settings
from backend.pipeline.warmup import trigger_warmup, get_warmup_status

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserResponse)
async def signup(user_in: UserCreate):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    # Check if user exists
    existing_user = await db.voice_agent_db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Account already exists please login")
        
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

    # Fire warm-up in the background — doesn't block the signup response
    asyncio.create_task(trigger_warmup())

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
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account info not found please Create account"
        )
    if not verify_password(form_data.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user_doc["email"]})

    # Fire warm-up in the background — doesn't block the login response
    asyncio.create_task(trigger_warmup())

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/warmup-status")
async def warmup_status(current_user: UserInDB = Depends(get_current_user)):
    """Return the current warmup progress for frontend polling."""
    return get_warmup_status()


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        voice_id=current_user.voice_id
    )


from pydantic import BaseModel

class UserUpdate(BaseModel):
    name: str

@router.put("/me", response_model=UserResponse)
async def update_users_me(user_update: UserUpdate, current_user: UserInDB = Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    await db.voice_agent_db.users.update_one(
        {"email": current_user.email},
        {"$set": {"name": user_update.name}}
    )
    
    return UserResponse(
        id=current_user.id,
        name=user_update.name,
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

    # Sort by timestamp when available (ISO 8601 sorts lexicographically correctly),
    # fallback to Date + Time string concat for legacy records
    conversations.sort(
        key=lambda c: c.get("timestamp") or f'{c.get("Date", "")}T{c.get("Time", "")}',
        reverse=False,
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
            sessions[sid] = {
                "session_id": sid,
                "conversations": [],
                "date": conv.get("Date", ""),
                "timestamp": conv.get("timestamp") or "",
                "turn_count": 0,
            }
        sessions[sid]["conversations"].append(conv)
        sessions[sid]["turn_count"] += 1
        # Keep the most recent date/timestamp for the session
        turn_date = conv.get("Date", "")
        if turn_date > sessions[sid]["date"]:
            sessions[sid]["date"] = turn_date
        # Update ISO timestamp if this turn has one and it's more recent
        turn_ts = conv.get("timestamp", "")
        if turn_ts and turn_ts > sessions[sid]["timestamp"]:
            sessions[sid]["timestamp"] = turn_ts

    result_sessions = []
    for s_dict in sessions.values():
        convs = s_dict.pop("conversations")
        # Sort chronologically
        convs.sort(key=lambda c: (c.get("Date", ""), c.get("Time", "")))
        
        # Check if any conversation turn has a pre-generated session_name
        pre_generated = next((c.get("session_name") for c in convs if c.get("session_name")), None)

        if pre_generated:
            s_dict["session_name"] = pre_generated
        else:
            # Fallback logic if LLM hasn't generated the title yet
            if len(convs) >= 3:
                raw_name = convs[2].get("User_query")
            elif len(convs) == 2:
                raw_name = convs[1].get("User_query")
            elif len(convs) == 1:
                raw_name = convs[0].get("User_query")
            else:
                raw_name = "Untitled Session"
                
            raw_name = str(raw_name) if raw_name else "Untitled Session"
            s_dict["session_name"] = raw_name[:60] + ("…" if len(raw_name) > 60 else "")
            
        result_sessions.append(s_dict)

    # Sort newest session first — prefer ISO timestamp, fallback to date string
    result = sorted(
        result_sessions,
        key=lambda s: s.get("timestamp") or s["date"],
        reverse=True,
    )
    return {"sessions": result, "total": len(result)}


@router.delete("/sessions/{session_id}", summary="Delete a session and all its conversations")
async def delete_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Permanently delete a session and every conversation turn belonging to it.

    The user's `conversations` array is updated with a MongoDB $pull that removes
    all entries where `session_id` matches the supplied value.

    Returns:
        { deleted: true, session_id: str, turns_deleted: int }

    Raises:
        404 if the session_id does not exist for this user.
        500 if the database is unavailable.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    user_doc = await db.voice_agent_db.users.find_one({"email": current_user.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # Count turns that belong to this session before deleting
    all_convs: list[dict] = user_doc.get("conversations", [])
    matching_turns = [c for c in all_convs if c.get("session_id") == session_id]

    if not matching_turns:
        raise HTTPException(status_code=404, detail="Session not found")

    # Pull all turns with this session_id in a single atomic update
    await db.voice_agent_db.users.update_one(
        {"email": current_user.email},
        {"$pull": {"conversations": {"session_id": session_id}}},
    )

    return {
        "deleted": True,
        "session_id": session_id,
        "turns_deleted": len(matching_turns),
    }


@router.post("/sessions/{session_id}/continue", summary="Hydrate InMemory from a past session")
async def continue_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Load a past session's conversation history from MongoDB into the InMemory
    short-term memory store so the agent can continue with full context.

    Flow:
      1. Fetch all conversation turns for this session_id from MongoDB.
      2. Always (re-)hydrate _sessions[session_id] with the full DB history
         so the model has complete context — even if partially live.
      3. Return status + counts for the frontend to display.

    After this call the frontend sets its room_name = session_id and calls
    POST /api/token. The pipeline's load_memory node finds the hydrated history.

    Returns:
        {
            "status": "hydrated" | "already_live",
            "session_id": str,
            "messages_loaded": int,
            "turns_found": int,
        }

    Raises:
        404  if the session_id is not found for this user.
        500  if the database is unavailable.
    """
    import logging as _logging
    from backend.memory.short_term import (
        hydrate_session_from_history,
        session_exists as mem_session_exists,
    )

    _logger = _logging.getLogger(__name__)

    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    user_doc = await db.voice_agent_db.users.find_one({"email": current_user.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    all_convs: list[dict] = user_doc.get("conversations", [])
    session_turns = [c for c in all_convs if c.get("session_id") == session_id]

    if not session_turns:
        raise HTTPException(status_code=404, detail="Session not found")

    # Sort chronologically (oldest first) so message order is correct
    session_turns.sort(
        key=lambda c: c.get("timestamp") or f'{c.get("Date", "")}T{c.get("Time", "")}',
    )

    already_live = mem_session_exists(session_id)
    status_label = "already_live" if already_live else "hydrated"

    # Always re-hydrate to ensure full DB history is loaded
    messages_loaded = hydrate_session_from_history(session_id, session_turns)

    _logger.info(
        f"[ContinueSession] user='{current_user.email}' session='{session_id}' "
        f"status={status_label} messages_loaded={messages_loaded}"
    )

    return {
        "status": status_label,
        "session_id": session_id,
        "messages_loaded": messages_loaded,
        "turns_found": len(session_turns),
    }


@router.get("/agent-settings", summary="Get agent personalization settings for the current user")
async def get_agent_settings(current_user: UserInDB = Depends(get_current_user)):
    """
    Return the agent personalization settings stored for the authenticated user.

    Returns:
        { system_prompt_override: str, response_style: float }
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    user_doc = await db.voice_agent_db.users.find_one({"email": current_user.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "system_prompt_override": user_doc.get("system_prompt_override", ""),
        "response_style": user_doc.get("response_style", 0.5),
    }


@router.put("/agent-settings", summary="Save agent personalization settings for the current user")
async def save_agent_settings(
    settings_in: AgentSettingsUpdate,
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Persist agent personalization settings to the user's MongoDB document.

    Body:
        system_prompt_override: str  — custom instructions appended to base prompt (max 500 chars)
        response_style: float        — 0.0 = ultra-concise, 0.5 = balanced, 1.0 = detailed

    Returns:
        { saved: true, system_prompt_override: str, response_style: float }
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    # Enforce 500-char limit on the override
    override = settings_in.system_prompt_override.strip()[:500]

    # Clamp response_style to [0.0, 1.0]
    style = max(0.0, min(1.0, settings_in.response_style))

    await db.voice_agent_db.users.update_one(
        {"email": current_user.email},
        {"$set": {
            "system_prompt_override": override,
            "response_style": style,
        }},
    )

    return {
        "saved": True,
        "system_prompt_override": override,
        "response_style": style,
    }
