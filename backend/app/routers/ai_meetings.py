from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
from ..core.auth import get_current_user
from ..core.config import supabase
from ..services.gemini import gemini_service
from ..services.question_service import question_service
from ..services.meeting_scheduler import meeting_scheduler_service
from ..services.ai_meeting_orchestrator import ai_meeting_orchestrator
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai-meetings", tags=["ai-meetings"])

class CreateAIMeetingRequest(BaseModel):
    lead_id: str
    meeting_id: Optional[str] = None
    scheduled_meeting_id: Optional[str] = None
    question_set_id: Optional[str] = None

class ConversationMessage(BaseModel):
    speaker: str  # 'ai' or 'user'
    message: str
    audio_duration: Optional[int] = None

class UpdateConversationRequest(BaseModel):
    message: str
    speaker: str = 'user'
    audio_duration: Optional[int] = None

@router.post("/create")
async def create_ai_meeting(request: CreateAIMeetingRequest, current_user=Depends(get_current_user)):
    """
    Create a new AI meeting for a lead (supports both instant and scheduled meetings)
    """
    try:
        # Verify lead exists and belongs to user
        lead_response = supabase.table("leads").select("*").eq("id", request.lead_id).eq("user_id", current_user.id).execute()
        
        if not lead_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        lead_data = lead_response.data[0]
        
        # Generate questions for this lead using question service
        questions = await question_service.generate_questions_for_lead(lead_data, request.question_set_id)
        
        # Create meeting record if not provided
        meeting_id = request.meeting_id
        if not meeting_id:
            meeting_data = {
                "user_id": current_user.id,
                "lead_id": request.lead_id,
                "subject": f"AI Discovery Call - {lead_data['name']}",
                "meeting_time": datetime.now().isoformat()
            }
            # Only add duration if the column exists (to handle schema migration issues)
            try:
                meeting_data["duration"] = None
                meeting_response = supabase.table("meetings").insert(meeting_data).execute()
            except Exception as e:
                if "duration" in str(e):
                    # Retry without duration field if it doesn't exist
                    meeting_data.pop("duration", None)
                    meeting_response = supabase.table("meetings").insert(meeting_data).execute()
                else:
                    raise e
            
            if meeting_response.data:
                meeting_id = meeting_response.data[0]["id"]
        
        # Create AI meeting record with enhanced fields
        ai_meeting_data = {
            "user_id": current_user.id,
            "lead_id": request.lead_id,
            "meeting_id": meeting_id,
            "scheduled_meeting_id": request.scheduled_meeting_id,
            "status": "pending",
            "questions": questions,
            "conversation_history": []
        }
        
        # If this is linked to a scheduled meeting, get the meeting room ID
        if request.scheduled_meeting_id:
            scheduled_meeting = await meeting_scheduler_service.get_scheduled_meeting(
                request.scheduled_meeting_id, current_user.id
            )
            if scheduled_meeting:
                ai_meeting_data["meeting_room_id"] = scheduled_meeting.meeting_room_id
                ai_meeting_data["scheduled_time"] = scheduled_meeting.scheduled_time.isoformat()
        
        response = supabase.table("ai_meetings").insert(ai_meeting_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create AI meeting"
            )
        
        ai_meeting = response.data[0]
        
        return {
            "ai_meeting_id": ai_meeting["id"],
            "meeting_id": meeting_id,
            "scheduled_meeting_id": request.scheduled_meeting_id,
            "meeting_room_id": ai_meeting.get("meeting_room_id"),
            "lead": lead_data,
            "questions": questions,
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating AI meeting: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating AI meeting: {str(e)}"
        )

@router.get("/{ai_meeting_id}")
async def get_ai_meeting(ai_meeting_id: str, current_user=Depends(get_current_user)):
    """
    Get AI meeting details
    """
    try:
        response = supabase.table("ai_meetings").select("*").eq("id", ai_meeting_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI meeting not found"
            )
        
        ai_meeting = response.data[0]
        
        # Get lead data separately
        lead_response = supabase.table("leads").select("id, name, company, email, phone, status, notes").eq("id", ai_meeting["lead_id"]).eq("user_id", current_user.id).execute()
        
        if lead_response.data:
            ai_meeting["leads"] = lead_response.data[0]
        
        # Get meeting data separately if meeting_id exists
        if ai_meeting.get("meeting_id"):
            meeting_response = supabase.table("meetings").select("id, subject, meeting_time").eq("id", ai_meeting["meeting_id"]).eq("user_id", current_user.id).execute()
            if meeting_response.data:
                ai_meeting["meetings"] = meeting_response.data[0]
        
        return ai_meeting
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching AI meeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching AI meeting: {str(e)}"
        )

@router.post("/{ai_meeting_id}/start")
async def start_ai_meeting(ai_meeting_id: str, current_user=Depends(get_current_user)):
    """
    Start the AI meeting and get the first question
    """
    try:
        # Get AI meeting
        response = supabase.table("ai_meetings").select("*").eq("id", ai_meeting_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="AI meeting not found")
        
        ai_meeting = response.data[0]
        
        # Get lead data separately
        lead_response = supabase.table("leads").select("*").eq("id", ai_meeting["lead_id"]).eq("user_id", current_user.id).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = lead_response.data[0]
        
        # Update status to active
        supabase.table("ai_meetings").update({
            "status": "active"
        }).eq("id", ai_meeting_id).execute()
        
        # Get first question
        questions = ai_meeting.get("questions", [])
        if not questions:
            questions = await gemini_service.generate_lead_questions(lead_data)
            supabase.table("ai_meetings").update({
                "questions": questions
            }).eq("id", ai_meeting_id).execute()
        
        first_question = questions[0] if questions else "Hello! I'd like to learn more about your business needs. Can you tell me about your company?"
        
        # Add AI's first message to conversation
        conversation_history = ai_meeting.get("conversation_history", [])
        conversation_history.append({
            "speaker": "ai",
            "message": first_question,
            "timestamp": datetime.now().isoformat()
        })
        
        supabase.table("ai_meetings").update({
            "conversation_history": conversation_history
        }).eq("id", ai_meeting_id).execute()
        
        # Also save to conversation_messages table
        supabase.table("conversation_messages").insert({
            "ai_meeting_id": ai_meeting_id,
            "speaker": "ai",
            "message": first_question
        }).execute()
        
        return {
            "status": "active",
            "first_question": first_question,
            "lead": lead_data,
            "total_questions": len(questions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting AI meeting: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error starting AI meeting: {str(e)}")

@router.post("/{ai_meeting_id}/message")
async def add_conversation_message(
    ai_meeting_id: str, 
    request: UpdateConversationRequest, 
    current_user=Depends(get_current_user)
):
    """
    Add a message to the conversation and get AI's response
    """
    try:
        # Get AI meeting
        response = supabase.table("ai_meetings").select("*").eq("id", ai_meeting_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="AI meeting not found")
        
        ai_meeting = response.data[0]
        
        if ai_meeting["status"] != "active":
            raise HTTPException(status_code=400, detail="AI meeting is not active")
        
        # Get lead data separately
        lead_response = supabase.table("leads").select("*").eq("id", ai_meeting["lead_id"]).eq("user_id", current_user.id).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = lead_response.data[0]
        conversation_history = ai_meeting.get("conversation_history", [])
        questions = ai_meeting.get("questions", [])
        
        # Add user's message
        user_message = {
            "speaker": request.speaker,
            "message": request.message,
            "timestamp": datetime.now().isoformat()
        }
        conversation_history.append(user_message)
        
        # Save user message to database
        supabase.table("conversation_messages").insert({
            "ai_meeting_id": ai_meeting_id,
            "speaker": request.speaker,
            "message": request.message,
            "audio_duration": request.audio_duration
        }).execute()
        
        # Determine remaining questions
        asked_questions = [msg["message"] for msg in conversation_history if msg["speaker"] == "ai"]
        remaining_questions = [q for q in questions if q not in asked_questions]
        
        # Generate AI's next question or response
        if len(conversation_history) >= 14:  # 7 questions + 7 answers = 14 messages
            # Meeting is complete, analyze conversation
            ai_response = "Thank you for sharing all that information with me. Let me analyze what we've discussed and I'll provide you with a summary of our conversation."
            
            # Analyze conversation
            analysis = await gemini_service.analyze_conversation(conversation_history, lead_data)
            
            # Update AI meeting with analysis and mark as completed
            supabase.table("ai_meetings").update({
                "conversation_history": conversation_history,
                "ai_analysis": analysis,
                "status": "completed"
            }).eq("id", ai_meeting_id).execute()
            
            # Add AI's final message
            ai_message = {
                "speaker": "ai",
                "message": ai_response,
                "timestamp": datetime.now().isoformat()
            }
            conversation_history.append(ai_message)
            
            supabase.table("conversation_messages").insert({
                "ai_meeting_id": ai_meeting_id,
                "speaker": "ai",
                "message": ai_response
            }).execute()
            
            return {
                "ai_response": ai_response,
                "status": "completed",
                "analysis": analysis,
                "conversation_complete": True
            }
        
        else:
            # Generate next question
            next_question = await gemini_service.generate_next_question(
                conversation_history, remaining_questions, lead_data
            )
            
            # Add AI's response to conversation
            ai_message = {
                "speaker": "ai",
                "message": next_question,
                "timestamp": datetime.now().isoformat()
            }
            conversation_history.append(ai_message)
            
            # Update conversation in database
            supabase.table("ai_meetings").update({
                "conversation_history": conversation_history
            }).eq("id", ai_meeting_id).execute()
            
            # Save AI message to database
            supabase.table("conversation_messages").insert({
                "ai_meeting_id": ai_meeting_id,
                "speaker": "ai",
                "message": next_question
            }).execute()
            
            return {
                "ai_response": next_question,
                "status": "active",
                "remaining_questions": len(remaining_questions) - 1,
                "conversation_complete": False
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing conversation: {str(e)}")

@router.post("/{ai_meeting_id}/complete")
async def complete_ai_meeting(ai_meeting_id: str, current_user=Depends(get_current_user)):
    """
    Manually complete an AI meeting and analyze the conversation
    """
    try:
        # Get AI meeting
        response = supabase.table("ai_meetings").select("*").eq("id", ai_meeting_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="AI meeting not found")
        
        ai_meeting = response.data[0]
        
        # Get lead data separately
        lead_response = supabase.table("leads").select("*").eq("id", ai_meeting["lead_id"]).eq("user_id", current_user.id).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = lead_response.data[0]
        conversation_history = ai_meeting.get("conversation_history", [])
        
        if not conversation_history:
            raise HTTPException(status_code=400, detail="No conversation to analyze")
        
        # Analyze conversation
        analysis = await gemini_service.analyze_conversation(conversation_history, lead_data)
        
        # Update AI meeting
        supabase.table("ai_meetings").update({
            "ai_analysis": analysis,
            "status": "completed"
        }).eq("id", ai_meeting_id).execute()
        
        return {
            "status": "completed",
            "analysis": analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing AI meeting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error completing AI meeting: {str(e)}")

@router.post("/{ai_meeting_id}/join-room")
async def join_meeting_room(ai_meeting_id: str, current_user=Depends(get_current_user)):
    """
    Join an AI meeting room (for scheduled meetings)
    """
    try:
        # Get AI meeting
        response = supabase.table("ai_meetings").select("*").eq("id", ai_meeting_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="AI meeting not found")
        
        ai_meeting = response.data[0]
        
        # Check if this is a scheduled meeting
        if not ai_meeting.get("scheduled_meeting_id"):
            raise HTTPException(status_code=400, detail="This is not a scheduled meeting")
            
        # Get scheduled meeting details
        scheduled_meeting = await meeting_scheduler_service.get_scheduled_meeting(
            ai_meeting["scheduled_meeting_id"], current_user.id
        )
        
        if not scheduled_meeting:
            raise HTTPException(status_code=404, detail="Scheduled meeting not found")
            
        return {
            "room_id": scheduled_meeting.meeting_room_id,
            "meeting_id": ai_meeting_id,
            "scheduled_meeting_id": ai_meeting["scheduled_meeting_id"],
            "websocket_url": f"/ws/signaling/{scheduled_meeting.meeting_room_id}",
            "status": scheduled_meeting.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error joining meeting room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error joining meeting room: {str(e)}")

@router.post("/room/{room_id}/process-message")
async def process_room_message(
    room_id: str,
    request: UpdateConversationRequest,
    current_user=Depends(get_current_user)
):
    """
    Process a user message in a meeting room and get AI response
    """
    try:
        # Get the meeting ID from room_id
        scheduled_meeting_response = supabase.table("scheduled_meetings").select("id").eq("meeting_room_id", room_id).execute()
        
        if not scheduled_meeting_response.data:
            raise HTTPException(status_code=404, detail="Meeting room not found")
            
        meeting_id = scheduled_meeting_response.data[0]["id"]
        
        # Process the message through the AI orchestrator
        ai_response = await ai_meeting_orchestrator.process_user_message(
            meeting_id, room_id, request.message, current_user.id
        )
        
        return {
            "ai_response": ai_response,
            "room_id": room_id,
            "processed": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing room message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing room message: {str(e)}")

@router.post("/room/{room_id}/end-meeting")
async def end_meeting_room(room_id: str, current_user=Depends(get_current_user)):
    """
    End a meeting room gracefully and get analysis
    """
    try:
        # Get the meeting ID from room_id
        scheduled_meeting_response = supabase.table("scheduled_meetings").select("id").eq("meeting_room_id", room_id).execute()
        
        if not scheduled_meeting_response.data:
            raise HTTPException(status_code=404, detail="Meeting room not found")
            
        meeting_id = scheduled_meeting_response.data[0]["id"]
        
        # End the meeting through the AI orchestrator
        analysis = await ai_meeting_orchestrator.end_meeting_gracefully(meeting_id, room_id)
        
        return {
            "meeting_ended": True,
            "analysis": analysis,
            "room_id": room_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending meeting room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error ending meeting room: {str(e)}")

@router.get("/")
async def get_user_ai_meetings(current_user=Depends(get_current_user)):
    """
    Get all AI meetings for the current user
    """
    try:
        response = supabase.table("ai_meetings").select("*").eq("user_id", current_user.id).order("created_at", desc=True).execute()
        
        # Enrich with lead and meeting data
        enriched_meetings = []
        for ai_meeting in response.data:
            # Get lead data
            if ai_meeting.get("lead_id"):
                lead_response = supabase.table("leads").select("id, name, company, status").eq("id", ai_meeting["lead_id"]).execute()
                if lead_response.data:
                    ai_meeting["leads"] = lead_response.data[0]
            
            # Get meeting data
            if ai_meeting.get("meeting_id"):
                meeting_response = supabase.table("meetings").select("id, subject, meeting_time").eq("id", ai_meeting["meeting_id"]).execute()
                if meeting_response.data:
                    ai_meeting["meetings"] = meeting_response.data[0]
                    
            # Get scheduled meeting data if applicable
            if ai_meeting.get("scheduled_meeting_id"):
                scheduled_response = supabase.table("scheduled_meetings").select("meeting_room_id, scheduled_time, status").eq("id", ai_meeting["scheduled_meeting_id"]).execute()
                if scheduled_response.data:
                    ai_meeting["scheduled_meetings"] = scheduled_response.data[0]
            
            enriched_meetings.append(ai_meeting)
        
        return enriched_meetings
        
    except Exception as e:
        logger.error(f"Error fetching AI meetings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching AI meetings: {str(e)}")