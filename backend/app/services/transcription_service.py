import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from ..core.config import supabase
from ..services.real_time_analysis import real_time_analysis_service

logger = logging.getLogger(__name__)

class TranscriptionService:
    """Service for handling real-time transcription and storage"""
    
    def __init__(self):
        self.active_sessions = {}  # Track active transcription sessions
        self.transcription_buffer = {}  # Buffer for partial transcriptions
    
    async def start_transcription_session(self, meeting_id: str, user_id: str) -> Dict[str, Any]:
        """Start a new transcription session for a meeting"""
        
        try:
            # Verify meeting exists and user has access
            meeting_response = supabase.table("scheduled_meetings").select("*").eq(
                "id", meeting_id
            ).eq("user_id", user_id).execute()
            
            if not meeting_response.data:
                return {"error": "Meeting not found or access denied"}
            
            meeting_data = meeting_response.data[0]
            
            # Check if transcription is enabled for this meeting
            if not meeting_data.get("transcript_enabled", True):
                return {"error": "Transcription is disabled for this meeting"}
            
            # Create session
            session_id = f"{meeting_id}_{user_id}_{int(datetime.now().timestamp())}"
            
            self.active_sessions[session_id] = {
                "meeting_id": meeting_id,
                "user_id": user_id,
                "started_at": datetime.now(timezone.utc),
                "status": "active",
                "total_chunks": 0,
                "total_duration": 0
            }
            
            self.transcription_buffer[session_id] = {
                "partial_text": "",
                "confidence_scores": [],
                "last_update": datetime.now(timezone.utc)
            }
            
            logger.info(f"Started transcription session {session_id} for meeting {meeting_id}")
            
            return {
                "session_id": session_id,
                "meeting_id": meeting_id,
                "status": "active",
                "websocket_config": {
                    "sample_rate": 16000,
                    "language": "en-US",
                    "interim_results": True,
                    "max_alternatives": 1
                }
            }
            
        except Exception as e:
            logger.error(f"Error starting transcription session: {str(e)}")
            return {"error": str(e)}
    
    async def process_transcription_chunk(
        self, 
        session_id: str, 
        transcript_text: str, 
        is_final: bool = False,
        confidence: float = 0.0,
        audio_duration_ms: Optional[int] = None
    ) -> Dict[str, Any]:
        """Process a chunk of transcribed text"""
        
        try:
            if session_id not in self.active_sessions:
                return {"error": "Invalid or expired session"}
            
            session = self.active_sessions[session_id]
            buffer = self.transcription_buffer[session_id]
            
            # Update buffer with new text
            if is_final:
                # Final transcription - save to database and analyze
                final_text = buffer["partial_text"] + " " + transcript_text
                final_text = final_text.strip()
                
                if len(final_text) > 5:  # Only process meaningful text
                    # Save to conversation events
                    analysis_result = await real_time_analysis_service.process_conversation_chunk(
                        meeting_id=session["meeting_id"],
                        speaker_type="human",
                        message=final_text,
                        speaker_id=session["user_id"],
                        audio_duration_ms=audio_duration_ms
                    )
                    
                    # Update session stats
                    session["total_chunks"] += 1
                    if audio_duration_ms:
                        session["total_duration"] += audio_duration_ms
                    
                    # Clear buffer
                    buffer["partial_text"] = ""
                    buffer["confidence_scores"] = []
                    buffer["last_update"] = datetime.now(timezone.utc)
                    
                    logger.info(f"Processed final transcription chunk for session {session_id}: {final_text[:50]}...")
                    
                    return {
                        "session_id": session_id,
                        "processed": True,
                        "final_text": final_text,
                        "confidence": confidence,
                        "analysis": analysis_result.get("real_time_analysis"),
                        "chunk_number": session["total_chunks"]
                    }
                else:
                    # Clear buffer for short/empty text
                    buffer["partial_text"] = ""
                    return {
                        "session_id": session_id,
                        "processed": False,
                        "reason": "Text too short"
                    }
            else:
                # Interim result - update buffer
                buffer["partial_text"] = transcript_text
                buffer["confidence_scores"].append(confidence)
                buffer["last_update"] = datetime.now(timezone.utc)
                
                return {
                    "session_id": session_id,
                    "interim": True,
                    "partial_text": transcript_text,
                    "confidence": confidence
                }
                
        except Exception as e:
            logger.error(f"Error processing transcription chunk: {str(e)}")
            return {"error": str(e)}
    
    async def end_transcription_session(self, session_id: str) -> Dict[str, Any]:
        """End a transcription session"""
        
        try:
            if session_id not in self.active_sessions:
                return {"error": "Session not found"}
            
            session = self.active_sessions[session_id]
            buffer = self.transcription_buffer[session_id]
            
            # Process any remaining partial text
            if buffer["partial_text"].strip():
                await self.process_transcription_chunk(
                    session_id, 
                    buffer["partial_text"], 
                    is_final=True
                )
            
            # Calculate session statistics
            session_duration = datetime.now(timezone.utc) - session["started_at"]
            
            session_stats = {
                "session_id": session_id,
                "meeting_id": session["meeting_id"],
                "total_chunks": session["total_chunks"],
                "total_audio_duration_ms": session["total_duration"],
                "session_duration_seconds": session_duration.total_seconds(),
                "average_confidence": sum(buffer["confidence_scores"]) / len(buffer["confidence_scores"]) if buffer["confidence_scores"] else 0.0,
                "ended_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Clean up
            del self.active_sessions[session_id]
            del self.transcription_buffer[session_id]
            
            logger.info(f"Ended transcription session {session_id} - {session['total_chunks']} chunks processed")
            
            return session_stats
            
        except Exception as e:
            logger.error(f"Error ending transcription session: {str(e)}")
            return {"error": str(e)}
    
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get current status of a transcription session"""
        
        if session_id not in self.active_sessions:
            return {"error": "Session not found"}
        
        session = self.active_sessions[session_id]
        buffer = self.transcription_buffer[session_id]
        
        session_duration = datetime.now(timezone.utc) - session["started_at"]
        
        return {
            "session_id": session_id,
            "meeting_id": session["meeting_id"],
            "status": session["status"],
            "duration_seconds": session_duration.total_seconds(),
            "total_chunks": session["total_chunks"],
            "current_partial_text": buffer["partial_text"],
            "last_update": buffer["last_update"].isoformat(),
            "buffer_size": len(buffer["partial_text"])
        }
    
    async def get_meeting_transcript_live(self, meeting_id: str, user_id: str) -> Dict[str, Any]:
        """Get live transcript for a meeting"""
        
        try:
            # Verify access
            meeting_response = supabase.table("scheduled_meetings").select("*").eq(
                "id", meeting_id
            ).eq("user_id", user_id).execute()
            
            if not meeting_response.data:
                return {"error": "Meeting not found or access denied"}
            
            # Get conversation events
            events_response = supabase.table("conversation_events").select("*").eq(
                "meeting_id", meeting_id
            ).order("timestamp").execute()
            
            transcript_entries = []
            for event in events_response.data:
                transcript_entries.append({
                    "timestamp": event["timestamp"],
                    "speaker": "AI Assistant" if event["speaker_type"] == "ai" else "Participant",
                    "text": event["message_text"],
                    "confidence": event.get("confidence_score"),
                    "duration_ms": event.get("audio_duration_ms")
                })
            
            # Add any active session partial text
            active_session = None
            for session_id, session in self.active_sessions.items():
                if session["meeting_id"] == meeting_id and session["user_id"] == user_id:
                    active_session = session_id
                    break
            
            partial_text = ""
            if active_session and active_session in self.transcription_buffer:
                partial_text = self.transcription_buffer[active_session]["partial_text"]
            
            return {
                "meeting_id": meeting_id,
                "transcript": transcript_entries,
                "total_entries": len(transcript_entries),
                "active_session": active_session,
                "partial_text": partial_text,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting live transcript: {str(e)}")
            return {"error": str(e)}
    
    async def search_transcripts(
        self, 
        user_id: str, 
        search_query: str, 
        meeting_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Search across meeting transcripts"""
        
        try:
            # Use the real-time analysis service search functionality
            search_results = await real_time_analysis_service.search_conversation_content(
                user_id=user_id,
                search_query=search_query,
                meeting_id=meeting_id
            )
            
            # Filter by date if provided
            if date_from or date_to:
                filtered_results = []
                for result in search_results.get("results", []):
                    for match in result["matches"]:
                        match_date = datetime.fromisoformat(match["timestamp"].replace("Z", "+00:00"))
                        
                        if date_from and match_date < date_from:
                            continue
                        if date_to and match_date > date_to:
                            continue
                        
                        filtered_results.append({
                            **result,
                            "matches": [match]
                        })
                
                search_results["results"] = filtered_results
                search_results["total"] = len(filtered_results)
            
            return search_results
            
        except Exception as e:
            logger.error(f"Error searching transcripts: {str(e)}")
            return {"error": str(e)}
    
    async def export_transcript(
        self, 
        meeting_id: str, 
        user_id: str, 
        format_type: str = "text"
    ) -> Dict[str, Any]:
        """Export meeting transcript in various formats"""
        
        try:
            # Use real-time analysis service to get transcript
            transcript_result = await real_time_analysis_service.get_meeting_transcript(
                meeting_id=meeting_id,
                format_type=format_type
            )
            
            if "error" in transcript_result:
                return transcript_result
            
            # Add metadata
            meeting_response = supabase.table("scheduled_meetings").select(
                "*, leads(name, company)"
            ).eq("id", meeting_id).eq("user_id", user_id).execute()
            
            if meeting_response.data:
                meeting_data = meeting_response.data[0]
                transcript_result["metadata"] = {
                    "meeting_id": meeting_id,
                    "lead_name": meeting_data["leads"]["name"],
                    "company": meeting_data["leads"]["company"],
                    "scheduled_time": meeting_data["scheduled_time"],
                    "exported_at": datetime.now(timezone.utc).isoformat(),
                    "exported_by": user_id
                }
            
            return transcript_result
            
        except Exception as e:
            logger.error(f"Error exporting transcript: {str(e)}")
            return {"error": str(e)}
    
    async def cleanup_expired_sessions(self, max_age_hours: int = 24) -> int:
        """Clean up expired transcription sessions"""
        
        try:
            current_time = datetime.now(timezone.utc)
            expired_sessions = []
            
            for session_id, session in self.active_sessions.items():
                session_age = current_time - session["started_at"]
                if session_age.total_seconds() > (max_age_hours * 3600):
                    expired_sessions.append(session_id)
            
            # Clean up expired sessions
            for session_id in expired_sessions:
                await self.end_transcription_session(session_id)
            
            logger.info(f"Cleaned up {len(expired_sessions)} expired transcription sessions")
            return len(expired_sessions)
            
        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {str(e)}")
            return 0

# Global instance
transcription_service = TranscriptionService()