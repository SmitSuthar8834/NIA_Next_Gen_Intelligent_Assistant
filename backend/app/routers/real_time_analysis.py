from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
from ..core.auth import get_current_user
from ..services.real_time_analysis import real_time_analysis_service
from ..services.transcription_service import transcription_service
from ..services.creatio import sync_meeting_insights_to_creatio
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/real-time-analysis", tags=["real-time-analysis"])

class ProcessMessageRequest(BaseModel):
    meeting_id: str
    speaker_type: str  # "human" or "ai"
    message: str
    speaker_id: Optional[str] = None
    audio_duration_ms: Optional[int] = None

class TranscriptionChunkRequest(BaseModel):
    session_id: str
    transcript_text: str
    is_final: bool = False
    confidence: float = 0.0
    audio_duration_ms: Optional[int] = None

class StartTranscriptionRequest(BaseModel):
    meeting_id: str

class SearchRequest(BaseModel):
    query: str
    meeting_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

@router.post("/process-message")
async def process_conversation_message(
    request: ProcessMessageRequest,
    current_user=Depends(get_current_user)
):
    """Process a conversation message for real-time analysis"""
    
    try:
        # Verify user has access to the meeting
        # This would typically check if the user is a participant or organizer
        
        result = await real_time_analysis_service.process_conversation_chunk(
            meeting_id=request.meeting_id,
            speaker_type=request.speaker_type,
            message=request.message,
            speaker_id=request.speaker_id or current_user.id,
            audio_duration_ms=request.audio_duration_ms
        )
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing conversation message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}"
        )

@router.post("/generate-analysis/{meeting_id}")
async def generate_meeting_analysis(
    meeting_id: str,
    sync_to_crm: bool = Query(default=True, description="Whether to sync insights to CRM"),
    current_user=Depends(get_current_user)
):
    """Generate comprehensive meeting analysis"""
    
    try:
        # Generate analysis
        analysis = await real_time_analysis_service.generate_meeting_analysis(meeting_id)
        
        if "error" in analysis:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=analysis["error"]
            )
        
        # Update lead status based on analysis
        context = await real_time_analysis_service._get_meeting_context(meeting_id)
        if context:
            await real_time_analysis_service.update_lead_status_from_analysis(
                context["lead_id"], analysis
            )
            
            # Sync to Creatio CRM if requested and lead has external_id
            if sync_to_crm and context["lead_data"].get("external_id"):
                try:
                    await sync_meeting_insights_to_creatio(
                        user_id=current_user.id,
                        meeting_analysis=analysis,
                        lead_external_id=context["lead_data"]["external_id"]
                    )
                    analysis["crm_sync_status"] = "success"
                except Exception as e:
                    logger.error(f"Failed to sync to CRM: {str(e)}")
                    analysis["crm_sync_status"] = "failed"
                    analysis["crm_sync_error"] = str(e)
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating meeting analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating analysis: {str(e)}"
        )

@router.get("/meeting-transcript/{meeting_id}")
async def get_meeting_transcript(
    meeting_id: str,
    format_type: str = Query(default="text", description="Format: text, json, or summary"),
    current_user=Depends(get_current_user)
):
    """Get meeting transcript in various formats"""
    
    try:
        transcript = await real_time_analysis_service.get_meeting_transcript(
            meeting_id=meeting_id,
            format_type=format_type
        )
        
        if "error" in transcript:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=transcript["error"]
            )
        
        return transcript
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meeting transcript: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting transcript: {str(e)}"
        )

@router.post("/search-conversations")
async def search_conversations(
    request: SearchRequest,
    current_user=Depends(get_current_user)
):
    """Search across conversation content"""
    
    try:
        results = await real_time_analysis_service.search_conversation_content(
            user_id=current_user.id,
            search_query=request.query,
            meeting_id=request.meeting_id
        )
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching: {str(e)}"
        )

# Transcription endpoints

@router.post("/transcription/start")
async def start_transcription(
    request: StartTranscriptionRequest,
    current_user=Depends(get_current_user)
):
    """Start a transcription session for a meeting"""
    
    try:
        result = await transcription_service.start_transcription_session(
            meeting_id=request.meeting_id,
            user_id=current_user.id
        )
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting transcription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting transcription: {str(e)}"
        )

@router.post("/transcription/process-chunk")
async def process_transcription_chunk(
    request: TranscriptionChunkRequest,
    current_user=Depends(get_current_user)
):
    """Process a chunk of transcribed text"""
    
    try:
        result = await transcription_service.process_transcription_chunk(
            session_id=request.session_id,
            transcript_text=request.transcript_text,
            is_final=request.is_final,
            confidence=request.confidence,
            audio_duration_ms=request.audio_duration_ms
        )
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing transcription chunk: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing transcription: {str(e)}"
        )

@router.post("/transcription/end/{session_id}")
async def end_transcription(
    session_id: str,
    current_user=Depends(get_current_user)
):
    """End a transcription session"""
    
    try:
        result = await transcription_service.end_transcription_session(session_id)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending transcription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ending transcription: {str(e)}"
        )

@router.get("/transcription/status/{session_id}")
async def get_transcription_status(
    session_id: str,
    current_user=Depends(get_current_user)
):
    """Get transcription session status"""
    
    try:
        result = await transcription_service.get_session_status(session_id)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transcription status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting status: {str(e)}"
        )

@router.get("/transcription/live/{meeting_id}")
async def get_live_transcript(
    meeting_id: str,
    current_user=Depends(get_current_user)
):
    """Get live transcript for a meeting"""
    
    try:
        result = await transcription_service.get_meeting_transcript_live(
            meeting_id=meeting_id,
            user_id=current_user.id
        )
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting live transcript: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting live transcript: {str(e)}"
        )

@router.post("/transcription/search")
async def search_transcripts(
    request: SearchRequest,
    current_user=Depends(get_current_user)
):
    """Search across meeting transcripts"""
    
    try:
        results = await transcription_service.search_transcripts(
            user_id=current_user.id,
            search_query=request.query,
            meeting_id=request.meeting_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching transcripts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching transcripts: {str(e)}"
        )

@router.get("/transcription/export/{meeting_id}")
async def export_transcript(
    meeting_id: str,
    format_type: str = Query(default="text", description="Export format: text, json, or summary"),
    current_user=Depends(get_current_user)
):
    """Export meeting transcript"""
    
    try:
        result = await transcription_service.export_transcript(
            meeting_id=meeting_id,
            user_id=current_user.id,
            format_type=format_type
        )
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting transcript: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting transcript: {str(e)}"
        )

@router.post("/transcription/cleanup")
async def cleanup_expired_sessions(
    max_age_hours: int = Query(default=24, description="Maximum age in hours for active sessions"),
    current_user=Depends(get_current_user)
):
    """Clean up expired transcription sessions (admin only)"""
    
    try:
        # Note: In a real implementation, you'd want to check if the user has admin privileges
        cleaned_count = await transcription_service.cleanup_expired_sessions(max_age_hours)
        
        return {
            "cleaned_sessions": cleaned_count,
            "max_age_hours": max_age_hours
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cleaning up sessions: {str(e)}"
        )