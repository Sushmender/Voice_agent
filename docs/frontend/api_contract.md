# REST API Contract

Base URL: `http://localhost:8000` (or production equivalent)

The backend provides a RESTful API for user authentication, fetching user details, and obtaining the secure LiveKit token needed to connect to the voice room.

## 1. Authentication Routes

The application uses OAuth2 password bearer flow with JWTs for secure access.

### 1.1 Sign Up
Create a new user account. A `voice_id` is automatically assigned upon registration.

- **URL:** `/auth/signup`
- **Method:** `POST`
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Success Response (200 OK):**
```json
{
  "id": "64abcdef1234567890",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "voice_id": "cartesia-voice-uuid-here"
}
```

**Error Responses:**
- `400 Bad Request`: "Email already registered"
- `422 Unprocessable Entity`: Validation error

### 1.2 Login
Authenticate a user and retrieve a JWT access token. Note that this uses standard OAuth2 form data, not JSON.

- **URL:** `/auth/login`
- **Method:** `POST`
- **Content-Type:** `application/x-www-form-urlencoded`

**Request Body:**
```urlencoded
username=jane@example.com&password=securepassword123
```

**Success Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
  "token_type": "bearer"
}
```

**Error Responses:**
- `401 Unauthorized`: "Incorrect email or password"

### 1.3 Get Current User (Me)
Fetch the authenticated user's profile information.

- **URL:** `/auth/me`
- **Method:** `GET`
- **Headers:** 
  - `Authorization: Bearer <access_token>`

**Success Response (200 OK):**
```json
{
  "id": "64abcdef1234567890",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "voice_id": "cartesia-voice-uuid-here"
}
```

**Error Responses:**
- `401 Unauthorized`: "Could not validate credentials"

---

## 2. LiveKit Token Routes

To initiate a voice session, the frontend needs a LiveKit participant token. Requesting this token also signals the backend to spin up the AI Agent pipeline for the specified room.

### 2.1 Get Participant Token
Generates a LiveKit JWT for the browser to join the WebRTC room.

- **URL:** `/api/token`
- **Method:** `POST`
- **Headers:** 
  - `Authorization: Bearer <access_token>`
- **Content-Type:** `application/json`

**Request Body:**
```json
{
  "room_name": "voice-agent-room",
  "participant_name": "Jane Doe",
  "participant_identity": "user-12345" // Optional, auto-generated if omitted
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "livekit_url": "wss://your-livekit-cloud-url.livekit.cloud",
  "room_name": "voice-agent-room",
  "participant_identity": "user-12345",
  "expires_in": 3600
}
```

**Implementation Notes:**
1. The `livekit_url` returned in this response MUST be used by the frontend to initialize the LiveKit client.
2. The `token` is what authorizes the frontend to enter the room.
3. Once this endpoint returns `200 OK`, the backend has asynchronously launched the AI pipeline. The frontend should immediately proceed to connect to LiveKit.
