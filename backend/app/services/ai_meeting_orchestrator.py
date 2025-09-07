"""
AI Meeting Orchestrator Service

Handles AI participation in scheduled meetings including:
- Auto-joining scheduled meetings
- Conversation flow management
- Turn-taking coordination
- Meeting state management
- Post-meeting analysis and email notifications
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from ..core.config import supabase
from ..services.gemini import gemini_service
from ..services.question_service import question_service
from ..services.email_service import email_service
from ..signaling import enhanced_manager, ParticipantType
from ..models.enhanced_schemas import ConversationState, MeetingStatus

logger = logging.getLogger(__name__)

class ConversationFlow:
    """Manages conversation flow and turn-taking logic"""
    
    def __init__(self, meeting_id: str, room_id: str):
        self.meeting_id = meeting_id
        self.room_id = room_id
        self.state = ConversationState.WAITING
        self.current_question_index = 0
        self.questions: List[str] = []
        self.conversation_history: List[Dict] = []
        self.lead_data: Optional[Dict] = None
        self.silence_timeout = 5.0  # seconds
        self.ai_response_delay = 2.0  # seconds
        self.max_questions = 7
        self.last_activity = datetime.now()
        
    async def initialize(self, lead_data: Dict, question_set_id: Optional[str] = None):
        """Initialize conversation with lead data and questions"""
        self.lead_data = lead_data
        
        # Generate questions for this lead
        self.questions = await question_service.generate_questions_for_lead(
            lead_data, question_set_id
        )
        
        logger.info(f"Initialized conversation for meeting {self.meeting_id} with {len(self.questions)} questions")
        
    async def start_conversation(self) -> str:
        """Start the conversation with opening message"""
        if not self.questions:
            return "Hello! I'd like to learn more about your business needs. Can you tell me about your company?"
            
        self.state = ConversationState.AI_SPEAKING
        opening_message = f"Hello! I'm an AI assistant here to learn more about {self.lead_data.get('company', 'your business')}. {self.questions[0]}"
        
        # Save opening message
        await self._save_conversation_message("ai", opening_message)
        
        return opening_message
        
    async def process_user_response(self, user_message: str, user_id: str) -> Optional[str]:
        """Process user response and generate AI's next question/response"""
        
        # Save user message
        await self._save_conversation_message("human", user_message, user_id)
        
        self.last_activity = datetime.now()
        
        # Add delay for natural conversation flow
        await asyncio.sleep(self.ai_response_delay)
        
        # Determine next action based on conversation progress
        if len(self.conversation_history) >= (self.max_questions * 2):
            # Conversation is complete
            return await self._complete_conversation()
        else:
            # Generate next question
            return await self._generate_next_question()
            
    async def _generate_next_question(self) -> str:
        """Generate the next question based on conversation flow"""
        self.current_question_index += 1
        
        if self.current_question_index < len(self.questions):
            # Use pre-generated question
            next_question = self.questions[self.current_question_index]
        else:
            # Generate contextual follow-up question
            remaining_questions = self.questions[self.current_question_index:]
            next_question = await gemini_service.generate_next_question(
                self.conversation_history, remaining_questions, self.lead_data
            )
            
        self.state = ConversationState.AI_SPEAKING
        
        # Save AI message
        await self._save_conversation_message("ai", next_question)
        
        return next_question
        
    async def _complete_conversation(self) -> str:
        """Complete the conversation and generate summary"""
        self.state = ConversationState.COMPLETED
        
        completion_message = "Thank you for sharing all that information with me. Let me analyze what we've discussed and provide you with a summary."
        
        # Save completion message
        await self._save_conversation_message("ai", completion_message)
        
        # Analyze conversation in background
        asyncio.create_task(self._analyze_and_complete())
        
        return completion_message
        
    async def _analyze_and_complete(self):
        """Analyze conversation and update meeting status"""
        try:
            # Generate analysis
            analysis = await gemini_service.analyze_conversation(
                self.conversation_history, self.lead_data
            )
            
            # Generate transcript
            transcript = await gemini_service.generate_meeting_transcript(
                self.conversation_history, self.lead_data
            )
            
            # Save analysis to database
            supabase.table("meeting_analyses").insert({
                "meeting_id": self.meeting_id,
                "lead_id": self.lead_data.get("id"),
                "analysis_data": analysis,
                "transcript": transcript,
                "lead_score_before": self.lead_data.get("score", 0),
                "lead_score_after": analysis.get("lead_score", 0),
                "created_at": datetime.now().isoformat()
            }).execute()
            
            # Update lead record with new information
            await self._update_lead_record(analysis)
            
            # Update scheduled meeting status
            supabase.table("scheduled_meetings").update({
                "status": MeetingStatus.COMPLETED.value,
                "completed_at": datetime.now().isoformat()
            }).eq("id", self.meeting_id).execute()
            
            # Send email notifications
            await self._send_post_meeting_emails(analysis, transcript)
            
            # Broadcast analysis to participants
            await enhanced_manager.broadcast_to_room(self.room_id, {
                "type": "meeting_completed",
                "analysis": analysis,
                "summary": analysis.get("summary", "Meeting completed successfully.")
            })
            
        except Exception as e:
            logger.error(f"Failed to analyze conversation: {e}")
            
    async def _update_lead_record(self, analysis: Dict[str, Any]):
        """Update lead record with meeting insights"""
        try:
            lead_id = self.lead_data.get("id")
            if not lead_id:
                return
                
            # Prepare update data
            update_data = {
                "score": analysis.get("lead_score", self.lead_data.get("score", 0)),
                "status": self._determine_lead_status(analysis),
                "notes": self._format_meeting_notes(analysis),
                "last_contact": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Add qualification fields if available
            if "budget_indicators" in analysis:
                update_data["budget_notes"] = analysis["budget_indicators"]
            if "timeline_indicators" in analysis:
                update_data["timeline_notes"] = analysis["timeline_indicators"]
            if "decision_makers" in analysis:
                update_data["decision_maker_notes"] = analysis["decision_makers"]
                
            # Update lead record
            supabase.table("leads").update(update_data).eq("id", lead_id).execute()
            
            logger.info(f"Updated lead record {lead_id} with meeting insights")
            
        except Exception as e:
            logger.error(f"Failed to update lead record: {e}")
            
    def _determine_lead_status(self, analysis: Dict[str, Any]) -> str:
        """Determine new lead status based on analysis"""
        qualification_status = analysis.get("qualification_status", "partially_qualified")
        lead_score = analysis.get("lead_score", 0)
        
        if qualification_status == "qualified" and lead_score >= 80:
            return "hot"
        elif qualification_status == "qualified" and lead_score >= 60:
            return "warm"
        elif qualification_status == "partially_qualified":
            return "warm"
        else:
            return "cold"
            
    def _format_meeting_notes(self, analysis: Dict[str, Any]) -> str:
        """Format meeting notes from analysis"""
        notes = f"AI Meeting Summary ({datetime.now().strftime('%Y-%m-%d')})\n\n"
        notes += f"Summary: {analysis.get('summary', 'No summary available')}\n\n"
        
        if analysis.get('key_insights'):
            notes += "Key Insights:\n"
            for insight in analysis['key_insights']:
                notes += f"• {insight}\n"
            notes += "\n"
            
        if analysis.get('pain_points'):
            notes += "Pain Points:\n"
            for pain in analysis['pain_points']:
                notes += f"• {pain}\n"
            notes += "\n"
            
        if analysis.get('next_steps'):
            notes += "Next Steps:\n"
            for step in analysis['next_steps']:
                notes += f"• {step}\n"
                
        return notes
        
    async def _send_post_meeting_emails(self, analysis: Dict[str, Any], transcript: str):
        """Send post-meeting emails to user"""
        try:
            # Get meeting and user data
            meeting_response = supabase.table("scheduled_meetings").select("*, leads(*)").eq("id", self.meeting_id).execute()
            
            if not meeting_response.data:
                logger.error(f"Meeting {self.meeting_id} not found for email sending")
                return
                
            meeting_data = meeting_response.data[0]
            
            # Get user email
            user_response = supabase.table("profiles").select("email").eq("id", meeting_data["user_id"]).execute()
            
            if not user_response.data:
                logger.error(f"User profile not found for meeting {self.meeting_id}")
                return
                
            user_email = user_response.data[0]["email"]
            
            # Prepare meeting data for email
            email_meeting_data = {
                "id": meeting_data["id"],
                "lead_name": self.lead_data.get("name", "Unknown Lead"),
                "company": self.lead_data.get("company", "Unknown Company"),
                "scheduled_time": meeting_data["scheduled_time"]
            }
            
            # Send meeting summary email
            await email_service.send_meeting_summary(
                user_email=user_email,
                meeting_data=email_meeting_data,
                analysis=analysis,
                transcript=transcript
            )
            
            # Send follow-up questions email if available
            follow_up_questions = analysis.get("follow_up_questions", [])
            if follow_up_questions:
                await email_service.send_follow_up_questions(
                    user_email=user_email,
                    meeting_data=email_meeting_data,
                    questions=follow_up_questions
                )
                
            logger.info(f"Sent post-meeting emails for meeting {self.meeting_id}")
            
        except Exception as e:
            logger.error(f"Failed to send post-meeting emails: {e}")
            
    async def _save_conversation_message(self, speaker_type: str, message: str, speaker_id: Optional[str] = None):
        """Save conversation message to history and database"""
        
        message_data = {
            "speaker": speaker_type,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "speaker_id": speaker_id
        }
        
        self.conversation_history.append(message_data)
        
        # Save to database
        try:
            supabase.table("conversation_events").insert({
                "meeting_id": self.meeting_id,
                "speaker_type": speaker_type,
                "speaker_id": speaker_id,
                "message_text": message,
                "timestamp": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Failed to save conversation message: {e}")
            
    def should_prompt_user(self) -> bool:
        """Check if we should prompt user due to silence"""
        if self.state == ConversationState.WAITING_FOR_RESPONSE:
            silence_duration = (datetime.now() - self.last_activity).total_seconds()
            return silence_duration > self.silence_timeout
        return False
        
    async def handle_silence_timeout(self) -> Optional[str]:
        """Handle silence timeout with gentle prompt"""
        if self.should_prompt_user():
            prompt_message = "I'm here when you're ready to continue. Would you like me to repeat the question?"
            await self._save_conversation_message("ai", prompt_message)
            return prompt_message
        return None

class AIMeetingOrchestrator:
    """Main orchestrator for AI meeting participation"""
    
    def __init__(self):
        self.active_conversations: Dict[str, ConversationFlow] = {}
        self.scheduled_joins: Dict[str, asyncio.Task] = {}
        
    async def schedule_ai_join(self, meeting_id: str, scheduled_time: datetime, room_id: str, lead_data: Optional[Dict[str, Any]] = None):
        """Schedule AI to join a meeting at the specified time"""
        
        async def join_at_scheduled_time():
            # Wait until scheduled time
            now = datetime.now()
            if scheduled_time > now:
                wait_seconds = (scheduled_time - now).total_seconds()
                await asyncio.sleep(wait_seconds)
                
            # Join the meeting
            await self.join_scheduled_meeting(meeting_id, room_id, lead_data)
            
        task = asyncio.create_task(join_at_scheduled_time())
        self.scheduled_joins[meeting_id] = task
        
        logger.info(f"Scheduled AI to join meeting {meeting_id} at {scheduled_time}")
        
    async def join_scheduled_meeting(self, meeting_id: str, room_id: str, lead_data: Optional[Dict[str, Any]] = None) -> bool:
        """AI joins a scheduled meeting"""
        try:
            # Get meeting details
            meeting_response = supabase.table("scheduled_meetings").select("*").eq("id", meeting_id).execute()
            
            if not meeting_response.data:
                logger.error(f"Meeting {meeting_id} not found")
                return False
                
            meeting_data = meeting_response.data[0]
            
            # Get lead data if not provided
            if not lead_data:
                lead_response = supabase.table("leads").select("*").eq("id", meeting_data["lead_id"]).execute()
                
                if not lead_response.data:
                    logger.error(f"Lead {meeting_data['lead_id']} not found")
                    return False
                    
                lead_data = lead_response.data[0]
            
            # Wait for human participants (up to 10 minutes)
            await self._wait_for_participants(room_id, timeout_minutes=10)
            
            # Initialize conversation flow
            conversation = ConversationFlow(meeting_id, room_id)
            await conversation.initialize(lead_data, meeting_data.get("question_set_id"))
            self.active_conversations[meeting_id] = conversation
            
            # Update meeting status
            supabase.table("scheduled_meetings").update({
                "status": MeetingStatus.ACTIVE.value,
                "ai_joined_at": datetime.now().isoformat()
            }).eq("id", meeting_id).execute()
            
            # Announce AI joining
            await enhanced_manager.broadcast_to_room(room_id, {
                "type": "ai_joined",
                "message": "AI assistant has joined the meeting"
            })
            
            # Create AI voice participant
            from .ai_voice_participant import create_ai_voice_participant
            ai_voice_participant = await create_ai_voice_participant(meeting_id, room_id)
            
            # Join meeting with voice capabilities
            await ai_voice_participant.join_meeting()
            
            # Start conversation
            opening_message = await conversation.start_conversation()
            
            # Speak the opening message
            await ai_voice_participant.speak_message(opening_message)
            
            # Start monitoring conversation flow
            asyncio.create_task(self._monitor_conversation_flow(meeting_id, room_id))
            
            logger.info(f"AI successfully joined meeting {meeting_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to join meeting {meeting_id}: {e}")
            return False
            
    async def _wait_for_participants(self, room_id: str, timeout_minutes: int = 10):
        """Wait for human participants to join the meeting"""
        timeout_time = datetime.now() + timedelta(minutes=timeout_minutes)
        
        while datetime.now() < timeout_time:
            participants = await enhanced_manager.get_room_participants(room_id)
            human_participants = [p for p in participants if p["participant_type"] == "human"]
            
            if human_participants:
                logger.info(f"Found {len(human_participants)} human participants in room {room_id}")
                return True
                
            await asyncio.sleep(5)  # Check every 5 seconds
            
        logger.warning(f"No human participants found in room {room_id} after {timeout_minutes} minutes")
        return False
        
    async def _monitor_conversation_flow(self, meeting_id: str, room_id: str):
        """Monitor conversation flow and handle timeouts"""
        conversation = self.active_conversations.get(meeting_id)
        if not conversation:
            return
            
        while conversation.state != ConversationState.COMPLETED:
            await asyncio.sleep(2)  # Check every 2 seconds
            
            # Check for silence timeout
            prompt_message = await conversation.handle_silence_timeout()
            if prompt_message:
                await enhanced_manager.broadcast_to_room(room_id, {
                    "type": "ai_message",
                    "message": prompt_message,
                    "is_prompt": True
                })
                
        # Clean up when conversation is complete
        if meeting_id in self.active_conversations:
            del self.active_conversations[meeting_id]
            
    async def process_user_message(self, meeting_id: str, room_id: str, user_message: str, user_id: str) -> Optional[str]:
        """Process user message and generate AI response"""
        conversation = self.active_conversations.get(meeting_id)
        if not conversation:
            return None
            
        # Process the message and get AI response
        ai_response = await conversation.process_user_response(user_message, user_id)
        
        if ai_response:
            # Get AI voice participant and speak the response
            from .ai_voice_participant import get_ai_voice_participant
            ai_voice_participant = await get_ai_voice_participant(meeting_id)
            
            if ai_voice_participant:
                # Speak the AI response
                await ai_voice_participant.speak_message(ai_response)
            else:
                # Fallback to text message
                await enhanced_manager.broadcast_to_room(room_id, {
                    "type": "ai_message",
                    "message": ai_response,
                    "conversation_state": conversation.state.value
                })
            
        return ai_response
        
    async def end_meeting_gracefully(self, meeting_id: str, room_id: str) -> Dict[str, Any]:
        """End meeting gracefully and return analysis"""
        conversation = self.active_conversations.get(meeting_id)
        if not conversation:
            return {"error": "No active conversation found"}
            
        # Force completion if not already completed
        if conversation.state != ConversationState.COMPLETED:
            await conversation._complete_conversation()
            
        # Generate final analysis
        analysis = await gemini_service.analyze_conversation(
            conversation.conversation_history, conversation.lead_data
        )
        
        # Clean up
        if meeting_id in self.active_conversations:
            del self.active_conversations[meeting_id]
            
        return analysis

# Global orchestrator instance
ai_meeting_orchestrator = AIMeetingOrchestrator()