"""
Leads API Router

Handles CRUD operations for leads
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timezone
from ..core.auth import get_current_user
from ..core.config import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])

@router.post("/", response_model=Dict[str, Any])
async def create_lead(
    lead_data: Dict[str, Any],
    current_user=Depends(get_current_user)
):
    """Create a new lead"""
    try:
        # Add user_id and timestamps
        lead_data.update({
            "user_id": current_user.id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "score": 0,
            "status": lead_data.get("status", "new")
        })
        
        # Insert into database
        response = supabase.table("leads").insert(lead_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create lead"
            )
        
        return response.data[0]
        
    except Exception as e:
        logger.error(f"Error creating lead: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[Dict[str, Any]])
async def get_leads(
    current_user=Depends(get_current_user)
):
    """Get all leads for the current user"""
    try:
        response = supabase.table("leads").select("*").eq("user_id", current_user.id).order("created_at", desc=True).execute()
        
        return response.data or []
        
    except Exception as e:
        logger.error(f"Error getting leads: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{lead_id}", response_model=Dict[str, Any])
async def get_lead(
    lead_id: int,
    current_user=Depends(get_current_user)
):
    """Get a specific lead"""
    try:
        response = supabase.table("leads").select("*").eq("id", lead_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lead: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{lead_id}", response_model=Dict[str, Any])
async def update_lead(
    lead_id: int,
    lead_data: Dict[str, Any],
    current_user=Depends(get_current_user)
):
    """Update a lead"""
    try:
        # Add updated timestamp
        lead_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        response = supabase.table("leads").update(lead_data).eq("id", lead_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: int,
    current_user=Depends(get_current_user)
):
    """Delete a lead"""
    try:
        response = supabase.table("leads").delete().eq("id", lead_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        return {"message": "Lead deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lead: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )