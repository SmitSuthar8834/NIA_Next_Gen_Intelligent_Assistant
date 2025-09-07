# backend/app/routers/meetings.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from ..core.auth import get_current_user
from ..core.config import supabase

# Legacy schemas (if present). Keep for backward compatibility.
from ..models.schemas import Meeting, MeetingCreate  # if these exist in your project
from ..models.enhanced_schemas import ScheduledMeetingCreate

# Import the meeting scheduler service (make sure file exists at app/services/meeting_scheduler_service.py)
from ..services.meeting_scheduler import meeting_scheduler_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="", tags=["meetings"])


# ---------------------
# Legacy endpoints (keep if other parts of app use /meetings)
# ---------------------
@router.get("/meetings", response_model=List[Dict[str, Any]])
async def get_meetings(current_user=Depends(get_current_user)):
    """
    Legacy: Fetch all meetings for the logged-in user from `meetings` table.
    """
    try:
        response = supabase.table("meetings").select("*").eq("user_id", current_user.id).execute()
        return response.data or []
    except Exception as e:
        logger.exception("Error fetching legacy meetings for user %s: %s", getattr(current_user, "id", None), e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching meetings: {str(e)}")


@router.post("/meetings", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_meeting(meeting: MeetingCreate, current_user=Depends(get_current_user)):
    """
    Legacy: Create a meeting in `meetings` table.
    """
    try:
        meeting_data = meeting.dict()
        meeting_data["user_id"] = current_user.id

        response = supabase.table("meetings").insert(meeting_data).execute()

        if not response.data:
            logger.error("Failed to create legacy meeting for user %s: response empty", current_user.id)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create meeting")

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creating legacy meeting for user %s: %s", getattr(current_user, "id", None), e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating meeting: {str(e)}")


# ---------------------
# New - Scheduled meetings endpoints (integrates with MeetingSchedulerService)
# ---------------------
def _parse_iso_datetime(value: str) -> datetime:
    """
    Parse an ISO datetime string into an aware UTC datetime.
    Accepts '2025-09-06T14:30:00Z' and naive ISO strings too.
    """
    if value is None:
        raise ValueError("No datetime string provided")
    try:
        # Attempt Python's fromisoformat (works with offset like +00:00 but not 'Z')
        if value.endswith("Z"):
            # replace Z with +00:00 for fromisoformat
            value = value[:-1] + "+00:00"
        dt = datetime.fromisoformat(value)
    except Exception:
        # Last-resort parse: try to strip timezone and assume UTC
        try:
            dt = datetime.fromisoformat(value)
        except Exception as e:
            raise ValueError(f"Invalid ISO datetime: {value}") from e

    # If naive, assume UTC (important to avoid naive vs aware compare issues)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        # normalize to UTC
        dt = dt.astimezone(timezone.utc)
    return dt
    logger.debug("Incoming scheduled meeting payload: %s", meeting_payload)
@router.get("/scheduled-meetings/", response_model=List[Dict[str, Any]])
async def list_scheduled_meetings(
    start_date: Optional[str] = Query(None, description="ISO start date (inclusive)"),
    end_date: Optional[str] = Query(None, description="ISO end date (inclusive)"),
    current_user=Depends(get_current_user)
):
    """
    List scheduled meetings for the current user.
    Optional query params: start_date and end_date (ISO strings) to filter by scheduled_time.
    Returns raw rows from `scheduled_meetings` table (as dicts).
    """
    try:
        if start_date and end_date:
            try:
                start_dt = _parse_iso_datetime(start_date)
                end_dt = _parse_iso_datetime(end_date)
            except ValueError as ve:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

            response = supabase.table("scheduled_meetings").select("*") \
                .eq("user_id", current_user.id) \
                .gte("scheduled_time", start_dt.isoformat()) \
                .lte("scheduled_time", end_dt.isoformat()) \
                .order("scheduled_time", desc=False) \
                .execute()
        else:
            response = supabase.table("scheduled_meetings").select("*") \
                .eq("user_id", current_user.id) \
                .order("scheduled_time", desc=False) \
                .execute()

        return response.data or []
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to list scheduled meetings for user %s: %s", getattr(current_user, "id", None), e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list scheduled meetings")

@router.post("/scheduled-meetings/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_scheduled_meeting(meeting_payload: Dict[str, Any], current_user=Depends(get_current_user)):
    """
    Create a scheduled meeting via MeetingSchedulerService.

    Expects payload like:
    {
      "lead_id": "...",
      "scheduled_time": "2025-09-06T14:30:00Z",
      "duration_minutes": 60,
      "question_set_id": "...",    # optional
      "timezone": "Asia/Kolkata"  # optional
    }
    """
    try:
        if not isinstance(meeting_payload, dict):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")

        # Basic required fields check (fast fail)
        if "lead_id" not in meeting_payload or "scheduled_time" not in meeting_payload:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="lead_id and scheduled_time are required")

        # Try to construct Pydantic model that the service expects.
        try:
            scheduled_meeting_input = ScheduledMeetingCreate(**meeting_payload)
        except Exception as ve:
            # Validation error from Pydantic — return helpful message
            logger.exception("ScheduledMeetingCreate validation failed: %s", ve)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid meeting payload: {ve}")

        # Delegate to service (which generates room id, persists, schedules AI)
        created_meeting, ok = await meeting_scheduler_service.create_scheduled_meeting(current_user.id, scheduled_meeting_input)

        if not ok or created_meeting is None:
            logger.error("MeetingSchedulerService failed to create meeting for user %s", current_user.id)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create scheduled meeting")

        # Convert to serializable dict
        if hasattr(created_meeting, "model_dump"):
            return created_meeting.model_dump()
        if hasattr(created_meeting, "dict"):
            return created_meeting.dict()
        return dict(created_meeting)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in create_scheduled_meeting for user %s: %s", getattr(current_user, "id", None), e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create scheduled meeting")

@router.get("/scheduled-meetings/{meeting_id}", response_model=Dict[str, Any])
async def get_scheduled_meeting(meeting_id: str, current_user=Depends(get_current_user)):
    """
    Get a scheduled meeting by id (from scheduled_meetings table) - returns dict.
    """
    try:
        meeting = await meeting_scheduler_service.get_scheduled_meeting(meeting_id, current_user.id)
        if not meeting:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled meeting not found")

        if hasattr(meeting, "model_dump"):
            return meeting.model_dump()
        if hasattr(meeting, "dict"):
            return meeting.dict()
        return dict(meeting)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get scheduled meeting %s for user %s: %s", meeting_id, getattr(current_user, "id", None), e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get scheduled meeting")
