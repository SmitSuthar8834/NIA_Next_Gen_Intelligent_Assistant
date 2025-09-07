"""
Microsoft Teams OAuth authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
import logging
from datetime import datetime, timedelta
from ..core.auth import get_current_user
from ..core.config import settings, supabase
from ..services.graph import graph_service
from datetime import datetime, timedelta, timezone
from dateutil import parser as date_parser 

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/teams", tags=["teams-auth"])

@router.post("/login")
async def teams_login(current_user = Depends(get_current_user)):
    """
    Initiate Microsoft Teams OAuth flow
    Returns redirect URL for Microsoft login
    """
    try:
        # Use specific tenant ID from settings (NOT common)
        tenant_id = settings.MICROSOFT_TENANT_ID
        auth_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
        
        logger.info(f"Using tenant ID: {tenant_id}")
        
        # OAuth parameters
        params = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "response_type": "code",
            "redirect_uri": "http://localhost:3000/integrations/teams/callback",
            "scope": "https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access",
            "response_mode": "query",
            "state": current_user.id
        }
        
        redirect_url = f"{auth_url}?{urlencode(params)}"
        
        logger.info(f"OAuth URL: {redirect_url}")
        
        return {
           "redirect_url": redirect_url,
            "status": "redirect_required"
        }
        
    except Exception as e:
        logger.error(f"Teams login initiation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Teams login: {str(e)}"
        )

@router.get("/callback")
async def teams_callback(code: str, state: str, error: str = None):
    """
    Handle Microsoft Teams OAuth callback
    Exchange authorization code for tokens and store in database
    """
    if error:
        logger.error(f"OAuth error: {error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth error: {error}"
        )
    
    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code or state"
        )
    
    logger.info(f"Received OAuth callback with code={code[:10]}..., state={state}")

    # Validate state looks like a UUID (Supabase user_id is UUID)
    import re
    uuid_regex = re.compile(r"^[0-9a-fA-F-]{36}$")
    if not uuid_regex.match(state):
        logger.error(f"Invalid state format received: {state}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/integrations?teams_error=invalid_state",
            status_code=302
        )

    try:
        # Use the same redirect URI as auth request
        redirect_uri = "http://localhost:3000/integrations/teams/callback"
        logger.info(f"Using redirect URI: {redirect_uri}")
        
        token_data = await graph_service.exchange_code_for_tokens(code, redirect_uri)
        
        expires_in = token_data.get("expires_in", 3600)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")

        logger.info(f"Token scopes: {token_data.get('scope', 'no scope')}")
        logger.info(f"Access token (first 30): {access_token[:30]}...")

        # Validate with Graph API
        user_info = await graph_service.get_user_info(access_token)
        logger.info(f"Graph token validated for user: {user_info.get('userPrincipalName')}")

        # Update Supabase with the tokens
        update_data = {
            "microsoft_access_token": access_token,
            "microsoft_refresh_token": refresh_token,
            "microsoft_token_expires_at": expires_at.isoformat()
        }
        response = supabase.table("profiles").update(update_data).eq("id", state).execute()

        if not response.data:
            logger.error(f"Failed to update Supabase profile for id={state}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store Teams configuration"
            )

        logger.info(f"Successfully stored tokens for profile {state}")

        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/integrations?teams_connected=true",
            status_code=302
        )

    except Exception as e:
        logger.error(f"Teams callback failed: {str(e)}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/integrations?teams_error={str(e)}",
            status_code=302
        )

@router.get("/status")
async def teams_status(current_user = Depends(get_current_user)):
    """
    Check if user has connected their Microsoft Teams account
    and refresh token if needed
    """
    try:
        # Get profile from Supabase
        resp = supabase.table("profiles").select(
            "microsoft_access_token, microsoft_refresh_token, microsoft_token_expires_at"
        ).eq("id", current_user.id).execute()

        if not resp.data or len(resp.data) == 0:
            return {"connected": False, "message": "Microsoft Teams not connected"}

        config = resp.data[0]

        if not config.get("microsoft_access_token"):
            return {"connected": False, "message": "No Teams token stored"}

        # Parse expiry safely (Supabase stores with +00)
        expires_at = None
        if config.get("microsoft_token_expires_at"):
            try:
                expires_at = date_parser.parse(str(config["microsoft_token_expires_at"]))
            except Exception:
                return {
                    "connected": True,
                    "token_expired": True,
                    "message": "Invalid expiry format"
                }

        access_token = config["microsoft_access_token"]

        # Refresh if expired
        if expires_at and expires_at <= datetime.now(timezone.utc):
            try:
                new_tokens = await graph_service.refresh_access_token(config["microsoft_refresh_token"])
                new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_tokens["expires_in"])

                supabase.table("profiles").update({
                    "microsoft_access_token": new_tokens["access_token"],
                    "microsoft_refresh_token": new_tokens.get("refresh_token", config["microsoft_refresh_token"]),
                    "microsoft_token_expires_at": new_expires_at.isoformat()
                }).eq("id", current_user.id).execute()

                access_token = new_tokens["access_token"]
                expires_at = new_expires_at
            except Exception as e:
                return {
                    "connected": True,
                    "token_expired": True,
                    "message": f"Failed to refresh token: {str(e)}"
                }

        # Validate Graph token
        try:
            logger.info("Validating Microsoft Graph token")
            ms_user = await graph_service.get_user_info(access_token)
            logger.info(f"Token validation successful for user: {ms_user.get('userPrincipalName')}")
        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            # Update profile to clear invalid tokens
            supabase.table("profiles").update({
                "microsoft_access_token": None,
                "microsoft_refresh_token": None,
                "microsoft_token_expires_at": None
            }).eq("id", current_user.id).execute()
            return {
                "connected": False,
                "message": "Teams connection is invalid. Please reconnect your account.",
                "error": str(e)
            }

        return {
            "connected": True,
            "token_expired": False,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "microsoft_user": ms_user.get("userPrincipalName"),
            "message": "Microsoft Teams connected successfully"
        }

    except Exception as e:
        logger.error(f"Teams status check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check Teams status: {str(e)}"
        )
@router.delete("/disconnect")
async def teams_disconnect(current_user = Depends(get_current_user)):
    """
    Disconnect Microsoft Teams integration
    """
    try:
        response = supabase.table("profiles").update({
            "microsoft_access_token": None,
            "microsoft_refresh_token": None,
            "microsoft_token_expires_at": None
        }).eq("id", current_user.id).execute()
        
        return {
            "status": "success",
            "message": "Microsoft Teams disconnected successfully"
        }
        
    except Exception as e:
        logger.error(f"Teams disconnect failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect Teams: {str(e)}"
        )