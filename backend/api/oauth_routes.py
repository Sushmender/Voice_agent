"""
backend/api/oauth_routes.py
---------------------------
Google & GitHub OAuth 2.0 Authorization Code flow.

Routes:
  GET /auth/google           → redirect browser to Google consent screen
  GET /auth/google/callback  → exchange code, mint JWT, redirect to frontend
  GET /auth/github           → redirect browser to GitHub consent screen
  GET /auth/github/callback  → exchange code, mint JWT, redirect to frontend
"""
import logging
import random
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from backend.auth.security import create_access_token
from backend.config import get_settings
from backend.db.mongodb import get_database

logger = logging.getLogger(__name__)
router = APIRouter(tags=["oauth"])

# ── Google endpoints ──────────────────────────────────────────────────────────
GOOGLE_AUTH_URL     = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL    = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# ── GitHub endpoints ──────────────────────────────────────────────────────────
GITHUB_AUTH_URL     = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL    = "https://github.com/login/oauth/access_token"
GITHUB_USERINFO_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL   = "https://api.github.com/user/emails"


# ── Shared helper: handle oauth user based on action ───────────────────────────
async def _handle_oauth_user(
    email: str,
    name: str,
    provider: str,
    action: str,
) -> tuple[str | None, bool, str | None]:
    """
    Handle OAuth user based on action (signup or login).
    Returns (jwt_token, needs_onboarding, error_string).
    """
    settings = get_settings()
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    user_doc = await db.voice_agent_db.users.find_one({"email": email})

    if action == "signup":
        if user_doc:
            return None, False, "account_exists"
        
        # New user — assign a random voice_id, no password
        voice_ids = [v.strip() for v in settings.cartesia_voice_ids.split(",") if v.strip()]
        assigned_voice_id = random.choice(voice_ids) if voice_ids else settings.cartesia_voice_id

        # Always trigger onboarding for new OAuth signups so they confirm their name
        user_doc_to_insert = {
            "name": name or email.split("@")[0],
            "email": email,
            "hashed_password": None,
            "auth_provider": provider,
            "voice_id": assigned_voice_id,
            "conversations": [],
        }
        await db.voice_agent_db.users.insert_one(user_doc_to_insert)
        logger.info(f"[OAuth] Created new {provider} user: {email}")
        
        access_token = create_access_token(data={"sub": email})
        return access_token, True, None

    elif action == "login":
        if not user_doc:
            return None, False, "account_not_found"
        
        logger.info(f"[OAuth] Existing user logged in via {provider}: {email}")
        access_token = create_access_token(data={"sub": email})
        return access_token, False, None
        
    else:
        # Default fallback if action is missing or invalid
        return None, False, "invalid_action"


# ─────────────────────────────────────────────────────────────────────────────
#  GOOGLE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/auth/google", summary="Redirect to Google OAuth consent screen")
async def google_login(action: str = "login"):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    params = {
        "client_id":     settings.google_client_id,
        "redirect_uri":  f"http://localhost:8000/auth/google/callback",
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "online",
        "prompt":        "select_account",
        "state":         action,
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url)


@router.get("/auth/google/callback", summary="Google OAuth callback")
async def google_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    settings = get_settings()
    action = state or "login"

    if error or not code:
        return RedirectResponse(f"{settings.frontend_url}/login?oauth_error=google_denied")

    # Exchange auth code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code":          code,
                "client_id":     settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri":  "http://localhost:8000/auth/google/callback",
                "grant_type":    "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            logger.error(f"[OAuth/Google] Token exchange failed: {token_resp.text}")
            return RedirectResponse(f"{settings.frontend_url}/login?oauth_error=google_token")

        token_data   = token_resp.json()
        access_token = token_data.get("access_token")

        # Fetch user info
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            return RedirectResponse(f"{settings.frontend_url}/login?oauth_error=google_userinfo")

        userinfo = userinfo_resp.json()

    email = userinfo.get("email")
    name  = userinfo.get("name", "")

    if not email:
        return RedirectResponse(f"{settings.frontend_url}/login?oauth_error=google_no_email")

    jwt_token, needs_onboarding, oauth_err = await _handle_oauth_user(email, name, "google", action)
    if oauth_err:
        return RedirectResponse(f"{settings.frontend_url}/auth/callback?oauth_error={oauth_err}")
    
    redirect_url = f"{settings.frontend_url}/auth/callback?token={jwt_token}"
    if needs_onboarding:
        redirect_url += f"&needs_onboarding=true&name={urlencode({'n': name})[2:]}"
    
    return RedirectResponse(redirect_url)


# ─────────────────────────────────────────────────────────────────────────────
#  GITHUB
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/auth/github", summary="Redirect to GitHub OAuth consent screen")
async def github_login(action: str = "login"):
    settings = get_settings()
    if not settings.github_client_id:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")

    params = {
        "client_id":    settings.github_client_id,
        "redirect_uri": "http://localhost:8000/auth/github/callback",
        "scope":        "user:email",
        "state":        action,
    }
    url = f"{GITHUB_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url)


@router.get("/auth/github/callback", summary="GitHub OAuth callback")
async def github_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    settings = get_settings()
    action = state or "login"

    if error or not code:
        return RedirectResponse(f"{settings.frontend_url}/login?oauth_error=github_denied")

    async with httpx.AsyncClient() as client:
        # Exchange auth code for access token
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id":     settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code":          code,
                "redirect_uri":  "http://localhost:8000/auth/github/callback",
            },
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            logger.error(f"[OAuth/GitHub] Token exchange failed: {token_resp.text}")
            return RedirectResponse(f"{settings.frontend_url}/login?oauth_error=github_token")

        token_data   = token_resp.json()
        access_token = token_data.get("access_token")

        if not access_token:
            return RedirectResponse(f"{settings.frontend_url}/login?oauth_error=github_token")

        gh_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept":        "application/vnd.github+json",
        }

        # Fetch user profile (name)
        user_resp = await client.get(GITHUB_USERINFO_URL, headers=gh_headers)
        user_data = user_resp.json() if user_resp.status_code == 200 else {}
        name = user_data.get("name") or user_data.get("login", "")

        # Fetch emails (primary + verified preferred)
        emails_resp = await client.get(GITHUB_EMAILS_URL, headers=gh_headers)
        email = None
        if emails_resp.status_code == 200:
            emails = emails_resp.json()
            # Prefer primary + verified email
            for e in emails:
                if e.get("primary") and e.get("verified"):
                    email = e["email"]
                    break
            # Fallback: any verified email
            if not email:
                for e in emails:
                    if e.get("verified"):
                        email = e["email"]
                        break

        # Last resort: use public email from profile
        if not email:
            email = user_data.get("email")

    if not email:
        return RedirectResponse(f"{settings.frontend_url}/login?oauth_error=github_no_email")

    jwt_token, needs_onboarding, oauth_err = await _handle_oauth_user(email, name, "github", action)
    if oauth_err:
        return RedirectResponse(f"{settings.frontend_url}/auth/callback?oauth_error={oauth_err}")
    
    redirect_url = f"{settings.frontend_url}/auth/callback?token={jwt_token}"
    if needs_onboarding:
        redirect_url += f"&needs_onboarding=true&name={urlencode({'n': name})[2:]}"
        
    return RedirectResponse(redirect_url)
