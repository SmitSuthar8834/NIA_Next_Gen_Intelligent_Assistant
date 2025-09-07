import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from ..core.config import supabase
from ..services.gemini import gemini_service
from ..models.enhanced_schemas import (
    ConversationEventCreate, 
    MeetingAnalysisCreate, 
    MeetingAnalysisData
)

logger = logging.getLogger(__name__)

class RealTimeAnalysisService:
    """Service for real-time conversation analysis and lead scoring"""
    
    def __init__(self):
        self.analysis_cache = {}  # Cache for ongoing analysis
        self.score_adjustments = {}  # Track score changes during conversation
    
    async def process_conversation_chunk(
        self, 
        meeting_id: str, 
        speaker_type: str, 
        message: str, 
        speaker_id: Optional[str] = None,
        audio_duration_ms: Optional[int] = None
    ) -> Dict[str, Any]:
        """Process a conversation chunk in real-time"""
        
        try:
            # Store conversation event
            conversation_event = ConversationEventCreate(
                meeting_id=meeting_id,
                speaker_type=speaker_type,
                speaker_id=speaker_id,
                message_text=message,
                audio_duration_ms=audio_duration_ms
            )
            
            # Save to database
            event_response = supabase.table("conversation_events").insert(
                conversation_event.model_dump()
            ).execute()
            
            if not event_response.data:
                logger.error("Failed to save conversation event")
                return {"error": "Failed to save conversation event"}
            
            # Get meeting and lead context
            context = await self._get_meeting_context(meeting_id)
            if not context:
                return {"error": "Meeting context not found"}
            
            # Perform real-time analysis for human messages
            if speaker_type == "human" and len(message.strip()) > 10:
                analysis = await self._analyze_message_real_time(message, context)
                
                # Update lead score if significant change detected
                if abs(analysis.get("lead_score_adjustment", 0)) >= 5:
                    await self._update_lead_score_real_time(
                        context["lead_id"], 
                        analysis["lead_score_adjustment"],
                        analysis.get("reasoning", "Real-time conversation analysis")
                    )
                
                # Cache analysis for meeting summary
                if meeting_id not in self.analysis_cache:
                    self.analysis_cache[meeting_id] = []
                
                self.analysis_cache[meeting_id].append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "message": message,
                    "analysis": analysis
                })
                
                return {
                    "event_id": event_response.data[0]["id"],
                    "real_time_analysis": analysis,
                    "processed": True
                }
            
            return {
                "event_id": event_response.data[0]["id"],
                "processed": True
            }
            
        except Exception as e:
            logger.error(f"Error processing conversation chunk: {str(e)}")
            return {"error": str(e)}
    
    async def generate_meeting_analysis(self, meeting_id: str) -> Dict[str, Any]:
        """Generate comprehensive meeting analysis from all conversation events"""
        
        try:
            # Get all conversation events for the meeting
            events_response = supabase.table("conversation_events").select("*").eq(
                "meeting_id", meeting_id
            ).order("timestamp").execute()
            
            if not events_response.data:
                return {"error": "No conversation events found"}
            
            # Get meeting context
            context = await self._get_meeting_context(meeting_id)
            if not context:
                return {"error": "Meeting context not found"}
            
            # Format conversation history
            conversation_history = []
            for event in events_response.data:
                conversation_history.append({
                    "speaker": event["speaker_type"],
                    "message": event["message_text"],
                    "timestamp": event["timestamp"]
                })
            
            # Generate comprehensive analysis
            analysis = await gemini_service.analyze_conversation(
                conversation_history, context["lead_data"]
            )
            
            # Generate enhanced scoring
            current_score = context["lead_data"].get("lead_score", 50)
            scoring_analysis = await gemini_service.generate_enhanced_lead_scoring(
                conversation_history, context["lead_data"], current_score
            )
            
            # Extract detailed insights
            insights = await gemini_service.extract_conversation_insights(
                conversation_history, context["lead_data"]
            )
            
            # Combine all analysis
            comprehensive_analysis = {
                **analysis,
                "enhanced_scoring": scoring_analysis,
                "detailed_insights": insights,
                "conversation_stats": {
                    "total_messages": len(conversation_history),
                    "human_messages": len([m for m in conversation_history if m["speaker"] == "human"]),
                    "ai_messages": len([m for m in conversation_history if m["speaker"] == "ai"]),
                    "duration_estimate": len(conversation_history) * 30  # Rough estimate in seconds
                }
            }
            
            # Create meeting analysis record
            analysis_data = MeetingAnalysisData(
                lead_score=scoring_analysis.get("new_lead_score", current_score),
                qualification_status=scoring_analysis.get("qualification_status", "needs_follow_up"),
                key_insights=analysis.get("key_insights", []),
                pain_points=analysis.get("pain_points", []),
                buying_signals=analysis.get("buying_signals", []),
                budget_indication=insights.get("business_insights", {}).get("budget_signals"),
                timeline_indication=insights.get("opportunity_assessment", {}).get("urgency_level"),
                decision_makers=insights.get("follow_up_strategy", {}).get("key_stakeholders_to_involve", []),
                next_steps=analysis.get("next_steps", []),
                sentiment_score=self._calculate_sentiment_score(analysis.get("sentiment", "neutral")),
                engagement_level=insights.get("conversation_quality", {}).get("response_quality", "medium"),
                follow_up_priority=scoring_analysis.get("priority_level", "medium")
            )
            
            meeting_analysis = MeetingAnalysisCreate(
                meeting_id=meeting_id,
                lead_id=context["lead_id"],
                analysis_data=analysis_data,
                lead_score_before=current_score,
                lead_score_after=scoring_analysis.get("new_lead_score", current_score),
                status_changed_from=context["lead_data"].get("status"),
                status_changed_to=self._determine_new_status(scoring_analysis)
            )
            
            # Save analysis to database
            analysis_response = supabase.table("meeting_analyses").insert(
                meeting_analysis.model_dump()
            ).execute()
            
            if analysis_response.data:
                comprehensive_analysis["analysis_id"] = analysis_response.data[0]["id"]
            
            # Update lead with new insights
            await self._update_lead_with_analysis(context["lead_id"], comprehensive_analysis)
            
            # Clear cache for this meeting
            if meeting_id in self.analysis_cache:
                del self.analysis_cache[meeting_id]
            
            return comprehensive_analysis
            
        except Exception as e:
            logger.error(f"Error generating meeting analysis: {str(e)}")
            return {"error": str(e)}
    
    async def update_lead_status_from_analysis(self, lead_id: str, analysis: Dict[str, Any]) -> bool:
        """Update lead status based on AI analysis"""
        
        try:
            scoring = analysis.get("enhanced_scoring", {})
            new_status = self._determine_new_status(scoring)
            new_score = scoring.get("new_lead_score")
            
            update_data = {}
            
            if new_status:
                update_data["status"] = new_status
            
            if new_score is not None:
                update_data["lead_score"] = new_score
            
            # Add AI insights to lead
            if analysis.get("key_insights"):
                current_insights = await self._get_current_lead_insights(lead_id)
                updated_insights = {
                    **current_insights,
                    "meeting_insights": analysis["key_insights"],
                    "last_analysis": datetime.now(timezone.utc).isoformat(),
                    "conversation_quality": analysis.get("detailed_insights", {}).get("conversation_quality"),
                    "opportunity_assessment": analysis.get("detailed_insights", {}).get("opportunity_assessment")
                }
                update_data["ai_insights"] = updated_insights
            
            if update_data:
                response = supabase.table("leads").update(update_data).eq("id", lead_id).execute()
                return bool(response.data)
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating lead status from analysis: {str(e)}")
            return False
    
    async def get_meeting_transcript(self, meeting_id: str, format_type: str = "text") -> Dict[str, Any]:
        """Get formatted meeting transcript"""
        
        try:
            # Get all conversation events
            events_response = supabase.table("conversation_events").select("*").eq(
                "meeting_id", meeting_id
            ).order("timestamp").execute()
            
            if not events_response.data:
                return {"error": "No conversation found"}
            
            # Format transcript based on requested format
            if format_type == "json":
                return {
                    "transcript": events_response.data,
                    "format": "json",
                    "message_count": len(events_response.data)
                }
            
            elif format_type == "text":
                transcript_text = ""
                for event in events_response.data:
                    timestamp = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
                    speaker = "AI Assistant" if event["speaker_type"] == "ai" else "Participant"
                    transcript_text += f"[{timestamp.strftime('%H:%M:%S')}] {speaker}: {event['message_text']}\n\n"
                
                return {
                    "transcript": transcript_text,
                    "format": "text",
                    "message_count": len(events_response.data)
                }
            
            elif format_type == "summary":
                # Generate AI summary of the transcript
                conversation_history = [
                    {"speaker": event["speaker_type"], "message": event["message_text"]}
                    for event in events_response.data
                ]
                
                context = await self._get_meeting_context(meeting_id)
                summary_analysis = await gemini_service.analyze_conversation(
                    conversation_history, context["lead_data"] if context else {}
                )
                
                return {
                    "transcript": summary_analysis.get("summary", "Meeting completed"),
                    "format": "summary",
                    "key_points": summary_analysis.get("key_insights", []),
                    "message_count": len(events_response.data)
                }
            
            return {"error": "Invalid format type"}
            
        except Exception as e:
            logger.error(f"Error getting meeting transcript: {str(e)}")
            return {"error": str(e)}
    
    async def search_conversation_content(
        self, 
        user_id: str, 
        search_query: str, 
        meeting_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search conversation content across meetings"""
        
        try:
            # Build query
            query = supabase.table("conversation_events").select(
                "*, scheduled_meetings!inner(user_id, lead_id, meeting_room_id)"
            ).ilike("message_text", f"%{search_query}%").eq(
                "scheduled_meetings.user_id", user_id
            )
            
            if meeting_id:
                query = query.eq("meeting_id", meeting_id)
            
            response = query.limit(50).execute()
            
            if not response.data:
                return {"results": [], "total": 0}
            
            # Group results by meeting
            results_by_meeting = {}
            for event in response.data:
                meeting_id = event["meeting_id"]
                if meeting_id not in results_by_meeting:
                    results_by_meeting[meeting_id] = {
                        "meeting_id": meeting_id,
                        "meeting_room_id": event["scheduled_meetings"]["meeting_room_id"],
                        "lead_id": event["scheduled_meetings"]["lead_id"],
                        "matches": []
                    }
                
                results_by_meeting[meeting_id]["matches"].append({
                    "message": event["message_text"],
                    "speaker": event["speaker_type"],
                    "timestamp": event["timestamp"],
                    "context": self._extract_search_context(event["message_text"], search_query)
                })
            
            return {
                "results": list(results_by_meeting.values()),
                "total": len(response.data),
                "query": search_query
            }
            
        except Exception as e:
            logger.error(f"Error searching conversation content: {str(e)}")
            return {"error": str(e)}
    
    # Helper methods
    
    async def _get_meeting_context(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        """Get meeting and lead context"""
        
        try:
            # Get scheduled meeting
            meeting_response = supabase.table("scheduled_meetings").select(
                "*, leads(*)"
            ).eq("id", meeting_id).execute()
            
            if not meeting_response.data:
                return None
            
            meeting_data = meeting_response.data[0]
            
            return {
                "meeting_id": meeting_id,
                "lead_id": meeting_data["lead_id"],
                "lead_data": meeting_data["leads"],
                "meeting_data": meeting_data
            }
            
        except Exception as e:
            logger.error(f"Error getting meeting context: {str(e)}")
            return None
    
    async def _analyze_message_real_time(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a single message in real-time"""
        
        # Get recent conversation for context
        recent_events = supabase.table("conversation_events").select("*").eq(
            "meeting_id", context["meeting_id"]
        ).order("timestamp", desc=True).limit(6).execute()
        
        conversation_chunk = message
        if recent_events.data:
            recent_messages = [event["message_text"] for event in reversed(recent_events.data)]
            conversation_chunk = "\n".join(recent_messages + [message])
        
        analysis_context = {
            "lead_name": context["lead_data"].get("name"),
            "company": context["lead_data"].get("company"),
            "previous_insights": context["lead_data"].get("ai_insights", {}).get("meeting_insights", [])
        }
        
        return await gemini_service.analyze_conversation_real_time(conversation_chunk, analysis_context)
    
    async def _update_lead_score_real_time(self, lead_id: str, score_adjustment: int, reasoning: str) -> bool:
        """Update lead score in real-time"""
        
        try:
            # Get current lead data
            lead_response = supabase.table("leads").select("lead_score").eq("id", lead_id).execute()
            
            if not lead_response.data:
                return False
            
            current_score = lead_response.data[0].get("lead_score", 50)
            new_score = max(0, min(100, current_score + score_adjustment))
            
            # Update lead score
            update_response = supabase.table("leads").update({
                "lead_score": new_score
            }).eq("id", lead_id).execute()
            
            return bool(update_response.data)
            
        except Exception as e:
            logger.error(f"Error updating lead score real-time: {str(e)}")
            return False
    
    async def _get_current_lead_insights(self, lead_id: str) -> Dict[str, Any]:
        """Get current lead insights"""
        
        try:
            response = supabase.table("leads").select("ai_insights").eq("id", lead_id).execute()
            
            if response.data and response.data[0].get("ai_insights"):
                return response.data[0]["ai_insights"]
            
            return {}
            
        except Exception:
            return {}
    
    async def _update_lead_with_analysis(self, lead_id: str, analysis: Dict[str, Any]) -> bool:
        """Update lead with comprehensive analysis results"""
        
        try:
            scoring = analysis.get("enhanced_scoring", {})
            insights = analysis.get("detailed_insights", {})
            
            # Prepare update data
            update_data = {}
            
            # Update score if changed significantly
            new_score = scoring.get("new_lead_score")
            if new_score is not None:
                update_data["lead_score"] = new_score
            
            # Update status based on analysis
            new_status = self._determine_new_status(scoring)
            if new_status:
                update_data["status"] = new_status
            
            # Update AI insights
            current_insights = await self._get_current_lead_insights(lead_id)
            updated_insights = {
                **current_insights,
                "last_meeting_analysis": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "key_insights": analysis.get("key_insights", []),
                    "pain_points": analysis.get("pain_points", []),
                    "buying_signals": analysis.get("buying_signals", []),
                    "lead_score": new_score,
                    "qualification_status": scoring.get("qualification_status"),
                    "engagement_level": insights.get("conversation_quality", {}).get("response_quality"),
                    "opportunity_fit": insights.get("opportunity_assessment", {}).get("fit_score"),
                    "next_steps": analysis.get("next_steps", [])
                }
            }
            update_data["ai_insights"] = updated_insights
            
            if update_data:
                response = supabase.table("leads").update(update_data).eq("id", lead_id).execute()
                return bool(response.data)
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating lead with analysis: {str(e)}")
            return False
    
    def _determine_new_status(self, scoring_analysis: Dict[str, Any]) -> Optional[str]:
        """Determine new lead status based on scoring analysis"""
        
        qualification_status = scoring_analysis.get("qualification_status", "")
        lead_score = scoring_analysis.get("new_lead_score", 50)
        
        if qualification_status == "qualified" and lead_score >= 70:
            return "qualified"
        elif qualification_status == "unqualified" or lead_score < 30:
            return "unqualified"
        elif lead_score >= 50:
            return "contacted"
        else:
            return "new"
    
    def _calculate_sentiment_score(self, sentiment: str) -> float:
        """Convert sentiment string to numeric score"""
        
        sentiment_map = {
            "very_positive": 1.0,
            "positive": 0.7,
            "neutral": 0.0,
            "negative": -0.7,
            "very_negative": -1.0
        }
        
        return sentiment_map.get(sentiment.lower(), 0.0)
    
    def _extract_search_context(self, message: str, search_query: str) -> str:
        """Extract context around search query in message"""
        
        query_pos = message.lower().find(search_query.lower())
        if query_pos == -1:
            return message[:100] + "..." if len(message) > 100 else message
        
        start = max(0, query_pos - 50)
        end = min(len(message), query_pos + len(search_query) + 50)
        
        context = message[start:end]
        if start > 0:
            context = "..." + context
        if end < len(message):
            context = context + "..."
        
        return context

# Global instance
real_time_analysis_service = RealTimeAnalysisService()