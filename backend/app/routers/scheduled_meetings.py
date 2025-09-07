from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timezone, timedelta
from ..core.auth import get_current_user
from ..core.config import supabase
from ..services.meeting_scheduler import meeting_scheduler_service
from ..services.question_service import question_service
from ..services.gemini import gemini_service
from ..models.enhanced_schemas import (
    ScheduledMeeting, ScheduledMeetingCreate, ScheduledMeetingUpdate,
    MeetingStatus, MeetingWithParticipants, ScheduledMeetingListResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scheduled-meetings", tags=["scheduled-meetings"])

@router.post("/", response_model=ScheduledMeeting)
async def create_scheduled_meeting(
    meeting_data: ScheduledMeetingCreate,
    current_user=Depends(get_current_user)
):
    """Create a new scheduled AI meeting"""
    try:
        meeting, success = await meeting_scheduler_service.create_scheduled_meeting(
            current_user.id, 
            meeting_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create scheduled meeting"
            )
        
        return meeting
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating scheduled meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=ScheduledMeetingListResponse)
async def get_scheduled_meetings(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    status_filter: Optional[MeetingStatus] = Query(None, description="Filter by meeting status"),
    start_date: Optional[datetime] = Query(None, description="Filter meetings from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter meetings until this date"),
    current_user=Depends(get_current_user)
):
    """Get scheduled meetings for the current user"""
    try:
        if start_date and end_date:
            meetings = await meeting_scheduler_service.get_meetings_by_date_range(
                current_user.id, start_date, end_date, status_filter
            )
        else:
            # Get all meetings and filter by status if provided
            query = supabase.table("scheduled_meetings").select("*").eq("user_id", current_user.id)
            
            if status_filter:
                query = query.eq("status", status_filter.value)
            
            response = query.order("scheduled_time", desc=True).execute()
            meetings = [ScheduledMeeting(**m) for m in response.data]
        
        # Apply pagination
        total_count = len(meetings)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_meetings = meetings[start_idx:end_idx]
        
        return ScheduledMeetingListResponse(
            meetings=paginated_meetings,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Error getting scheduled meetings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/upcoming", response_model=List[ScheduledMeeting])
async def get_upcoming_meetings(
    limit: int = Query(10, ge=1, le=50, description="Maximum number of meetings to return"),
    current_user=Depends(get_current_user)
):
    """Get upcoming scheduled meetings"""
    try:
        meetings = await meeting_scheduler_service.get_upcoming_meetings(current_user.id, limit)
        return meetings
        
    except Exception as e:
        logger.error(f"Error getting upcoming meetings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{meeting_id}", response_model=MeetingWithParticipants)
async def get_scheduled_meeting(
    meeting_id: str,
    current_user=Depends(get_current_user)
):
    """Get a specific scheduled meeting with participants and lead data"""
    try:
        meeting = await meeting_scheduler_service.get_scheduled_meeting(meeting_id, current_user.id)
        
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found"
            )
        
        # Get participants
        participants_response = supabase.table("meeting_participants").select("*").eq("meeting_id", meeting_id).execute()
        participants = participants_response.data or []
        
        # Get lead data
        lead_response = supabase.table("leads").select("*").eq("id", meeting.lead_id).eq("user_id", current_user.id).execute()
        lead_data = lead_response.data[0] if lead_response.data else None
        
        # Get question set data if available
        question_set_data = None
        if meeting.question_set_id:
            question_set = await question_service.get_question_set(meeting.question_set_id, current_user.id)
            if question_set:
                question_set_data = question_set.model_dump()
        
        # Create response with additional data
        meeting_dict = meeting.model_dump()
        meeting_dict.update({
            "participants": participants,
            "lead": lead_data,
            "question_set": question_set_data
        })
        
        return MeetingWithParticipants(**meeting_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scheduled meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{meeting_id}", response_model=ScheduledMeeting)
async def update_scheduled_meeting(
    meeting_id: str,
    update_data: ScheduledMeetingUpdate,
    current_user=Depends(get_current_user)
):
    """Update a scheduled meeting"""
    try:
        meeting, success = await meeting_scheduler_service.update_scheduled_meeting(
            meeting_id, current_user.id, update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update meeting"
            )
        
        return meeting
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating scheduled meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{meeting_id}")
async def cancel_scheduled_meeting(
    meeting_id: str,
    reason: Optional[str] = Query(None, description="Reason for cancellation"),
    current_user=Depends(get_current_user)
):
    """Cancel a scheduled meeting"""
    try:
        success = await meeting_scheduler_service.cancel_scheduled_meeting(
            meeting_id, current_user.id, reason
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to cancel meeting"
            )
        
        return {"message": "Meeting cancelled successfully"}
        
    except Exception as e:
        logger.error(f"Error cancelling scheduled meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/{meeting_id}/start", response_model=ScheduledMeeting)
async def start_scheduled_meeting(
    meeting_id: str,
    current_user=Depends(get_current_user)
):
    """Start a scheduled meeting"""
    try:
        meeting, success = await meeting_scheduler_service.start_meeting(meeting_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to start meeting"
            )
        
        return meeting
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error starting scheduled meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/{meeting_id}/complete", response_model=ScheduledMeeting)
async def complete_scheduled_meeting(
    meeting_id: str,
    current_user=Depends(get_current_user)
):
    """Complete a scheduled meeting"""
    try:
        meeting, success = await meeting_scheduler_service.complete_meeting(meeting_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to complete meeting"
            )
        
        return meeting
        
    except Exception as e:
        logger.error(f"Error completing scheduled meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/{meeting_id}/ai-join")
async def ai_join_meeting(
    meeting_id: str,
    current_user=Depends(get_current_user)
):
    """Mark AI as joined to the meeting (for automated AI joining)"""
    try:
        # Verify user owns the meeting
        meeting = await meeting_scheduler_service.get_scheduled_meeting(meeting_id, current_user.id)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found"
            )
        
        success = await meeting_scheduler_service.join_meeting_as_ai(meeting_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to join AI to meeting"
            )
        
        return {"message": "AI joined meeting successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining AI to meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{meeting_id}/join-link")
async def get_meeting_join_link(
    meeting_id: str,
    current_user=Depends(get_current_user)
):
    """Get the join link for a meeting"""
    try:
        meeting = await meeting_scheduler_service.get_scheduled_meeting(meeting_id, current_user.id)
        
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found"
            )
        
        from ..core.config import settings
        join_url = f"{settings.FRONTEND_URL}/meetings/join/{meeting.meeting_room_id}"
        
        return {
            "join_url": join_url,
            "meeting_room_id": meeting.meeting_room_id,
            "meeting_id": meeting_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meeting join link: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{meeting_id}/questions")
async def get_meeting_questions(
    meeting_id: str,
    current_user=Depends(get_current_user)
):
    """Get questions for a meeting (from question set + AI generated)"""
    try:
        meeting = await meeting_scheduler_service.get_scheduled_meeting(meeting_id, current_user.id)
        
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found"
            )
        
        # Get lead data
        lead_response = supabase.table("leads").select("*").eq("id", meeting.lead_id).eq("user_id", current_user.id).execute()
        
        if not lead_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        lead_data = lead_response.data[0]
        
        # Generate questions for this lead and meeting
        questions = await question_service.generate_questions_for_lead(
            lead_data, 
            meeting.question_set_id
        )
        
        return {
            "questions": questions,
            "question_set_id": meeting.question_set_id,
            "lead_id": meeting.lead_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meeting questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{meeting_id}/analysis")
async def get_meeting_analysis(
    meeting_id: str,
    current_user=Depends(get_current_user)
):
    """Get meeting analysis and insights"""
    try:
        # Verify user owns the meeting
        meeting = await meeting_scheduler_service.get_scheduled_meeting(meeting_id, current_user.id)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found"
            )
        
        # Get analysis data
        analysis_response = supabase.table("meeting_analyses").select("*").eq("meeting_id", meeting_id).execute()
        
        if not analysis_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting analysis not found"
            )
        
        analysis = analysis_response.data[0]
        
        return {
            "meeting_id": meeting_id,
            "analysis": analysis["analysis_data"],
            "transcript": analysis.get("transcript", ""),
            "lead_score_before": analysis.get("lead_score_before", 0),
            "lead_score_after": analysis.get("lead_score_after", 0),
            "created_at": analysis["created_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meeting analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{meeting_id}/transcript")
async def get_meeting_transcript(
    meeting_id: str,
    format_type: str = Query("text", description="Format: text, json"),
    current_user=Depends(get_current_user)
):
    """Get meeting transcript"""
    try:
        # Verify user owns the meeting
        meeting = await meeting_scheduler_service.get_scheduled_meeting(meeting_id, current_user.id)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found"
            )
        
        # Get transcript from analysis
        analysis_response = supabase.table("meeting_analyses").select("transcript, analysis_data").eq("meeting_id", meeting_id).execute()
        
        if not analysis_response.data:
            # Try to get from conversation events
            events_response = supabase.table("conversation_events").select("*").eq("meeting_id", meeting_id).order("timestamp").execute()
            
            if not events_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Transcript not found"
                )
            
            # Generate transcript from events
            if format_type == "json":
                return {"events": events_response.data}
            else:
                transcript = ""
                for event in events_response.data:
                    speaker = "AI Assistant" if event["speaker_type"] == "ai" else "Participant"
                    transcript += f"{speaker}: {event['message_text']}\n"
                return {"transcript": transcript}
        
        analysis = analysis_response.data[0]
        
        if format_type == "json":
            return {
                "transcript": analysis.get("transcript", ""),
                "analysis": analysis.get("analysis_data", {})
            }
        else:
            return {"transcript": analysis.get("transcript", "")}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meeting transcript: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )