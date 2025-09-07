from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ..core.auth import get_current_user
from ..core.config import supabase
from ..models.schemas import CreatioConfig, CreatioConfigCreate, CreatioConfigResponse, CreatioSyncResponse
from ..services.creatio import CreatioService, get_user_creatio_config

router = APIRouter(prefix="/integrations", tags=["integrations"])

@router.post("/creatio/config", response_model=CreatioConfigResponse)
async def save_creatio_config(config: CreatioConfigCreate, current_user = Depends(get_current_user)):
    """
    Save or update Creatio configuration for the user
    """
    try:
        config_data = config.dict()
        config_data["user_id"] = current_user.id
        
        # Check if config already exists
        existing = supabase.table("creatio_configs").select("*").eq("user_id", current_user.id).execute()
        
        if existing.data:
            # Update existing config
            response = supabase.table("creatio_configs").update(config_data).eq("user_id", current_user.id).execute()
        else:
            # Create new config
            response = supabase.table("creatio_configs").insert(config_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to save Creatio configuration"
            )
        
        saved_config = response.data[0]
        return CreatioConfigResponse(
            id=saved_config["id"],
            user_id=saved_config["user_id"],
            base_url=saved_config["base_url"],
            base_identity_url=saved_config["base_identity_url"],
            client_id=saved_config["client_id"],
            collection_name=saved_config["collection_name"],
            created_at=saved_config["created_at"],
            updated_at=saved_config["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving Creatio configuration: {str(e)}"
        )

@router.get("/creatio/config", response_model=CreatioConfigResponse)
async def get_creatio_config(current_user = Depends(get_current_user)):
    """
    Get user's Creatio configuration
    """
    try:
        response = supabase.table("creatio_configs").select("*").eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Creatio configuration not found"
            )
        
        config = response.data[0]
        return CreatioConfigResponse(
            id=config["id"],
            user_id=config["user_id"],
            base_url=config["base_url"],
            base_identity_url=config["base_identity_url"],
            client_id=config["client_id"],
            collection_name=config["collection_name"],
            created_at=config["created_at"],
            updated_at=config["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching Creatio configuration: {str(e)}"
        )

@router.post("/creatio/sync-leads", response_model=CreatioSyncResponse)
async def sync_creatio_leads(current_user = Depends(get_current_user)):
    """
    Sync leads from Creatio CRM based on lead owner's email
    """
    try:
        # Get user's Creatio configuration
        config = await get_user_creatio_config(current_user.id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Creatio configuration not found. Please configure Creatio integration first."
            )
        
        # Initialize Creatio service
        creatio_service = CreatioService(config)
        
        # Fetch leads from Creatio using user's email as owner filter
        creatio_leads = await creatio_service.get_leads_by_owner_email(current_user.email)
        
        synced_count = 0
        
        for creatio_lead in creatio_leads:
            # Transform Creatio lead to our format
            lead_data = creatio_service.transform_creatio_lead(creatio_lead)
            lead_data["user_id"] = current_user.id
            
            # Check if lead already exists (by external_id)
            existing = supabase.table("leads").select("*").eq("external_id", lead_data["external_id"]).eq("user_id", current_user.id).execute()
            
            if existing.data:
                # Update existing lead
                supabase.table("leads").update(lead_data).eq("external_id", lead_data["external_id"]).eq("user_id", current_user.id).execute()
            else:
                # Create new lead
                supabase.table("leads").insert(lead_data).execute()
            
            synced_count += 1
        
        return CreatioSyncResponse(
            status="success",
            synced_leads=synced_count,
            message=f"Successfully synced {synced_count} leads from Creatio"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing Creatio leads: {str(e)}"
        )

@router.post("/teams/fetch-transcript")
async def fetch_teams_transcript(current_user = Depends(get_current_user)):
    """
    Placeholder for Microsoft Teams transcript fetching
    """
    return {"status": "teams transcript placeholder"}