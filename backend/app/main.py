from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routers import auth, leads, meetings, integrations, ai, teams_auth, signaling, ai_meetings, scheduled_meetings, question_sets, real_time_analysis, voice_ai

app = FastAPI(
    title="NIA Sales Assistant API",
    description="FastAPI backend for lead and meeting management with Supabase and Microsoft Teams integration",
    version="1.0.0"
)

import os
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

# Configure CORS
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.32:3000"
]

# Add exception handler to ensure CORS headers are added even for errors
@app.exception_handler(Exception)
async def validation_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Add ngrok URL if specified in environment
ngrok_url = os.getenv("NGROK_URL")
if ngrok_url:
    allowed_origins.append(ngrok_url)
    allowed_origins.append(ngrok_url.replace("https://", "http://"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(meetings.router)
app.include_router(integrations.router)
app.include_router(ai.router)
app.include_router(teams_auth.router)
app.include_router(signaling.router)
app.include_router(ai_meetings.router)
app.include_router(scheduled_meetings.router)
app.include_router(question_sets.router)
app.include_router(real_time_analysis.router)
app.include_router(voice_ai.router)
app.include_router(question_sets.router)
app.include_router(real_time_analysis.router)

@app.get("/")
async def root():
    return {"message": "Lead Management API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/debug/config")
async def debug_config():
    """Debug endpoint to check configuration"""
    from .core.config import settings
    return {
        "supabase_url": settings.SUPABASE_URL[:50] + "..." if settings.SUPABASE_URL else "Not set",
        "supabase_key_set": bool(settings.SUPABASE_SERVICE_ROLE_KEY),
        "frontend_url": settings.FRONTEND_URL,
        "backend_url": settings.BACKEND_URL
    }