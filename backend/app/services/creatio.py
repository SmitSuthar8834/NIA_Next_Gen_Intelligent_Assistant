# app/services/creatio.py
import httpx
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from ..models.schemas import CreatioConfig
from ..core.config import supabase
import inspect
import asyncio

logger = logging.getLogger("app.services.creatio")


class CreatioService:
    def __init__(self, config: CreatioConfig):
        self.config = config
        self.access_token: Optional[str] = None

    async def get_oauth_token(self) -> str:
        """Get OAuth token from Creatio identity service"""
        token_url = f"{self.config.base_identity_url}/connect/token"
        logger.debug(f"Requesting OAuth token from: {token_url}")
        logger.debug(f"Client ID: {self.config.client_id}")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "client_id": self.config.client_id,
                    "client_secret": self.config.client_secret,
                    "grant_type": "client_credentials"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30.0
            )

            logger.debug(f"OAuth response status: {response.status_code}")
            logger.debug(f"OAuth response: {response.text[:1000]}")

            if response.status_code != 200:
                raise Exception(f"Failed to get OAuth token (Status {response.status_code}): {response.text}")

            token_data = response.json()
            self.access_token = token_data["access_token"]
            logger.info("Successfully obtained access token")
            return self.access_token

    async def get_leads_by_owner_email(self, owner_email: str) -> List[Dict]:
        """Fetch leads from Creatio based on lead owner's email"""
        if not self.access_token:
            await self.get_oauth_token()

        # Select important fields from Creatio Lead entity
        select_query = "$select=Id,LeadName,Account,Contact,Email,MobilePhone,BusinesPhone,Website,Address,CreatedOn,ModifiedOn,StatusId,QualifyStatusId,Budget,Score,Commentary,FullJobTitle"

        # For now, get all leads since Owner filtering might need different approach
        url = f"{self.config.base_url}/0/odata/{self.config.collection_name}?{select_query}"

        logger.debug(f"Creatio API URL: {url}")
        logger.debug(f"Using collection: {self.config.collection_name}")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {self.access_token}"
                },
                timeout=30.0
            )

            logger.debug(f"Creatio API response status: {response.status_code}")
            logger.debug(f"Creatio API response (truncated): {response.text[:500]}...")

            if response.status_code != 200:
                raise Exception(f"Failed to fetch leads (Status {response.status_code}): {response.text}")

            data = response.json()
            return data.get("value", [])

    def transform_creatio_lead(self, creatio_lead: Dict) -> Dict:
        """Transform Creatio lead format to our internal format"""
        return {
            "name": creatio_lead.get("LeadName", "") or creatio_lead.get("Contact", ""),
            "email": creatio_lead.get("Email", ""),
            "business_phone": creatio_lead.get("MobilePhone", "") or creatio_lead.get("BusinesPhone", ""),
            "company": creatio_lead.get("Account", ""),
            "status": "new",  # We'll map StatusId later if needed
            "external_id": creatio_lead.get("Id", ""),
            "source": "creatio",
            # Additional Creatio fields
            "lead_name": creatio_lead.get("LeadName", ""),
            "contact_name": creatio_lead.get("Contact", ""),
            "business_phone": creatio_lead.get("BusinesPhone", ""),
            "website": creatio_lead.get("Website", ""),
            "address": creatio_lead.get("Address", ""),
            "job_title": creatio_lead.get("FullJobTitle", ""),
            "budget": creatio_lead.get("Budget", 0),
            "score": creatio_lead.get("Score", 0),
            "commentary": creatio_lead.get("Commentary", ""),
            "creatio_created_on": creatio_lead.get("CreatedOn", ""),
            "creatio_modified_on": creatio_lead.get("ModifiedOn", ""),
            "status_id": creatio_lead.get("StatusId", ""),
            "qualify_status_id": creatio_lead.get("QualifyStatusId", "")
        }

    async def update_lead_with_meeting_insights(self, lead_external_id: str, meeting_analysis: Dict[str, Any]) -> bool:
        """Update Creatio lead with meeting insights and analysis"""

        if not self.access_token:
            await self.get_oauth_token()

        try:
            # Prepare update data for Creatio
            update_data = {}

            # Update lead score if available
            enhanced_scoring = meeting_analysis.get("enhanced_scoring", {}) or {}
            if enhanced_scoring.get("new_lead_score"):
                update_data["Score"] = enhanced_scoring["new_lead_score"]

            # Update qualification status
            qualification_status = enhanced_scoring.get("qualification_status")
            if qualification_status == "qualified":
                update_data["QualifyStatusId"] = "qualified_status_id"  # Replace with actual Creatio ID
            elif qualification_status == "unqualified":
                update_data["QualifyStatusId"] = "unqualified_status_id"  # Replace with actual Creatio ID

            # Add meeting insights to commentary
            insights = meeting_analysis.get("key_insights", []) or []
            pain_points = meeting_analysis.get("pain_points", []) or []
            buying_signals = meeting_analysis.get("buying_signals", []) or []

            meeting_summary = f"""
AI Meeting Analysis - {datetime.now().strftime('%Y-%m-%d %H:%M')}

Key Insights:
{chr(10).join(f"• {insight}" for insight in insights)}

Pain Points Identified:
{chr(10).join(f"• {pain}" for pain in pain_points)}

Buying Signals:
{chr(10).join(f"• {signal}" for signal in buying_signals)}

Lead Score: {enhanced_scoring.get('new_lead_score', 'N/A')}
Qualification: {qualification_status}
Priority: {enhanced_scoring.get('priority_level', 'medium')}
            """.strip()

            # Get current commentary and append
            current_lead = await self.get_lead_by_id(lead_external_id)
            if current_lead and current_lead.get("Commentary"):
                update_data["Commentary"] = current_lead["Commentary"] + "\n\n" + meeting_summary
            else:
                update_data["Commentary"] = meeting_summary

            # Make update request to Creatio
            url = f"{self.config.base_url}/0/odata/{self.config.collection_name}(guid'{lead_external_id}')"

            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    url,
                    json=update_data,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.access_token}"
                    },
                    timeout=30.0
                )

                if response.status_code in [200, 204]:
                    logger.info(f"Successfully updated Creatio lead {lead_external_id} with meeting insights")
                    return True
                else:
                    logger.error(f"Failed to update Creatio lead: {response.status_code} - {response.text}")
                    return False

        except Exception as e:
            logger.exception(f"Error updating Creatio lead with meeting insights: {str(e)}")
            return False

    async def get_lead_by_id(self, lead_id: str) -> Optional[Dict]:
        """Get a specific lead by ID from Creatio"""

        if not self.access_token:
            await self.get_oauth_token()

        try:
            url = f"{self.config.base_url}/0/odata/{self.config.collection_name}(guid'{lead_id}')"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Accept": "application/json",
                        "Authorization": f"Bearer {self.access_token}"
                    },
                    timeout=30.0
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get Creatio lead: {response.status_code} - {response.text}")
                    return None

        except Exception as e:
            logger.exception(f"Error getting Creatio lead: {str(e)}")
            return None

    async def sync_meeting_insights_to_creatio(self, user_id: str, meeting_analysis: Dict[str, Any], lead_external_id: str) -> bool:
        """Sync meeting insights to Creatio CRM (instance method)"""

        try:
            # Get user's Creatio config
            config = await get_user_creatio_config(user_id)
            if not config:
                logger.warning(f"No Creatio config found for user {user_id}")
                return False

            # Create service instance
            creatio_service = CreatioService(config)

            # Update lead with meeting insights
            return await creatio_service.update_lead_with_meeting_insights(
                lead_external_id, meeting_analysis
            )

        except Exception as e:
            logger.exception(f"Error syncing meeting insights to Creatio: {str(e)}")
            return False


async def get_user_creatio_config(user_id: str) -> Optional[CreatioConfig]:
    """Get user's Creatio configuration from database"""
    try:
        # Note: supabase client here is synchronous; if it becomes blocking you can run it in an executor
        response = supabase.table("creatio_configs").select("*").eq("user_id", user_id).execute()
        if response.data:
            config_data = response.data[0]
            return CreatioConfig(
                base_url=config_data["base_url"],
                base_identity_url=config_data["base_identity_url"],
                client_id=config_data["client_id"],
                client_secret=config_data["client_secret"],
                collection_name=config_data.get("collection_name", "LeadCollection")
            )
        return None
    except Exception:
        logger.exception("Error fetching user creatio config")
        return None


# Module-level wrapper so other modules can import this function directly
async def sync_meeting_insights_to_creatio(user_id: str, meeting_analysis: Dict[str, Any], lead_external_id: str) -> bool:
    """
    Convenience wrapper exported at module-level so callers can:
      from app.services.creatio import sync_meeting_insights_to_creatio
    """
    config = await get_user_creatio_config(user_id)
    if not config:
        logger.warning(f"No Creatio config for user {user_id} — cannot sync insights")
        return False

    svc = CreatioService(config)
    return await svc.update_lead_with_meeting_insights(lead_external_id, meeting_analysis)


__all__ = [
    "CreatioService",
    "get_user_creatio_config",
    "sync_meeting_insights_to_creatio",
]
