"""
Microsoft Graph API service for Teams integration
"""
import httpx
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
from ..core.config import settings

logger = logging.getLogger(__name__)


class GraphAPIService:
    """Microsoft Graph API wrapper for Teams integration"""

    def __init__(self):
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.auth_url = "https://login.microsoftonline.com"

    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for access and refresh tokens"""
        tenant_id = settings.MICROSOFT_TENANT_ID
        token_url = f"{self.auth_url}/{tenant_id}/oauth2/v2.0/token"

        data = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "scope": "offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/OnlineMeetings.Read"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)

            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                raise Exception(f"Token exchange failed: {response.status_code} {response.text}")

            token_data = response.json()
            logger.info("Successfully exchanged code for tokens")

            return token_data

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh access token using refresh token"""
        if not refresh_token:
            raise Exception("No refresh token provided")

        tenant_id = settings.MICROSOFT_TENANT_ID
        token_url = f"{self.auth_url}/{tenant_id}/oauth2/v2.0/token"

        data = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": "offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/OnlineMeetings.Read"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)

            if response.status_code != 200:
                logger.error(f"Token refresh failed: {response.text}")
                raise Exception(f"Token refresh failed: {response.status_code} {response.text}")

            token_data = response.json()
            logger.info("Successfully refreshed token")

            return token_data

    async def get_user_info(self, access_token: str) -> Dict:
        """Get user information from Microsoft Graph"""
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/me", headers=headers)

            if response.status_code != 200:
                logger.error(f"Get user info failed: {response.text}")
                raise Exception(f"Get user info failed: {response.status_code} {response.text}")

            return response.json()

    async def get_upcoming_meetings(self, access_token: str, days_ahead: int = 30) -> List[Dict]:
        """Fetch upcoming meetings from user's calendar"""
        if not access_token:
            raise Exception("No access token provided")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        start_time = datetime.now(timezone.utc).isoformat()
        end_time = (datetime.now(timezone.utc) + timedelta(days=days_ahead)).isoformat()

        params = {
            "$filter": f"start/dateTime ge '{start_time}' and start/dateTime le '{end_time}'",
            "$select": "id,subject,start,end,webLink,onlineMeeting,organizer,attendees",
            "$orderby": "start/dateTime asc",
            "$top": 100
        }

        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/me/events"

            response = await client.get(url, headers=headers, params=params)

            if response.status_code == 401:
                logger.error("Unauthorized when fetching meetings – likely expired/invalid token")
                raise Exception("401 Unauthorized – token expired or invalid")
            elif response.status_code != 200:
                logger.error(f"Graph API error {response.status_code}: {response.text}")
                raise Exception(f"Graph API error {response.status_code}: {response.text}")

            data = response.json()
            return data.get("value", [])

    async def get_meeting_transcript(self, access_token: str, meeting_id: str) -> Optional[str]:
        """Fetch meeting transcript (placeholder - actual Teams API needed)"""
        logger.info(f"Transcript fetch requested for meeting {meeting_id}")
        return None

    def parse_meeting_data(self, meeting_data: Dict) -> Dict:
        """Parse Microsoft Graph meeting data into internal format"""
        start_time = meeting_data.get("start", {})
        end_time = meeting_data.get("end", {})

        meeting_time = None
        if start_time.get("dateTime"):
            meeting_time = datetime.fromisoformat(start_time["dateTime"].replace("Z", "+00:00"))

        duration = None
        if start_time.get("dateTime") and end_time.get("dateTime"):
            start_dt = datetime.fromisoformat(start_time["dateTime"].replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(end_time["dateTime"].replace("Z", "+00:00"))
            duration = int((end_dt - start_dt).total_seconds() / 60)

        meeting_link = meeting_data.get("webLink")
        if meeting_data.get("onlineMeeting"):
            meeting_link = meeting_data["onlineMeeting"].get("joinUrl", meeting_link)

        return {
            "event_id": meeting_data.get("id"),
            "subject": meeting_data.get("subject", "Untitled Meeting"),
            "meeting_time": meeting_time,
            "meeting_link": meeting_link,
            "duration": duration,
        }


# Global instance
graph_service = GraphAPIService()
