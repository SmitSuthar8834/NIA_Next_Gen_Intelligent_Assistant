from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, Set, Optional, List
import json
import logging
import asyncio
import uuid
from datetime import datetime, timedelta
from .core.config import supabase
from .models.enhanced_schemas import ParticipantType, MeetingParticipant

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Participant:
    def __init__(self, user_id: str, websocket: WebSocket, participant_type: ParticipantType = ParticipantType.HUMAN, is_organizer: bool = False):
        self.user_id = user_id
        self.websocket = websocket
        self.participant_type = participant_type
        self.is_organizer = is_organizer
        self.joined_at = datetime.now()
        self.audio_enabled = True
        self.voice_activity = False
        self.last_activity = datetime.now()
        
    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "participant_type": self.participant_type.value,
            "is_organizer": self.is_organizer,
            "joined_at": self.joined_at.isoformat(),
            "audio_enabled": self.audio_enabled,
            "voice_activity": self.voice_activity,
            "last_activity": self.last_activity.isoformat()
        }

class MeetingRoom:
    def __init__(self, room_id: str, max_participants: int = 10):
        self.room_id = room_id
        self.max_participants = max_participants
        self.participants: Dict[str, Participant] = {}
        self.created_at = datetime.now()
        self.ai_participant: Optional[Participant] = None
        self.conversation_state = "waiting"  # waiting, active, ai_speaking, user_speaking, completed
        self.current_speaker: Optional[str] = None
        self.voice_activity_timeout = 3.0  # seconds
        self.ai_speaking_timeout = 30.0  # seconds
        
    def add_participant(self, participant: Participant) -> bool:
        if len(self.participants) >= self.max_participants:
            return False
            
        self.participants[participant.user_id] = participant
        logger.info(f"Participant {participant.user_id} joined room {self.room_id}")
        return True
        
    def remove_participant(self, user_id: str) -> bool:
        if user_id in self.participants:
            del self.participants[user_id]
            logger.info(f"Participant {user_id} left room {self.room_id}")
            return True
        return False
        
    def get_participant_list(self) -> List[dict]:
        return [p.to_dict() for p in self.participants.values()]
        
    def has_human_participants(self) -> bool:
        return any(p.participant_type == ParticipantType.HUMAN for p in self.participants.values())
        
    def get_human_participants(self) -> List[Participant]:
        return [p for p in self.participants.values() if p.participant_type == ParticipantType.HUMAN]
        
    def set_voice_activity(self, user_id: str, is_active: bool):
        if user_id in self.participants:
            self.participants[user_id].voice_activity = is_active
            self.participants[user_id].last_activity = datetime.now()
            
            if is_active:
                self.current_speaker = user_id
                if self.participants[user_id].participant_type == ParticipantType.HUMAN:
                    self.conversation_state = "user_speaking"
                else:
                    self.conversation_state = "ai_speaking"
            else:
                # Check if anyone else is speaking
                active_speakers = [p.user_id for p in self.participants.values() if p.voice_activity]
                if not active_speakers:
                    self.current_speaker = None
                    self.conversation_state = "active"
                    
    def is_empty(self) -> bool:
        return len(self.participants) == 0
        
    def should_cleanup(self) -> bool:
        # Cleanup if empty for more than 5 minutes
        if self.is_empty():
            return datetime.now() - self.created_at > timedelta(minutes=5)
        return False

class EnhancedSessionManager:
    def __init__(self):
        self.meeting_rooms: Dict[str, MeetingRoom] = {}
        self.participant_to_room: Dict[str, str] = {}  # user_id -> room_id mapping
        self.ai_auto_join_tasks: Dict[str, asyncio.Task] = {}
        
    async def create_meeting_room(self, room_id: str, max_participants: int = 10) -> MeetingRoom:
        """Create a new meeting room"""
        if room_id not in self.meeting_rooms:
            self.meeting_rooms[room_id] = MeetingRoom(room_id, max_participants)
            logger.info(f"Created meeting room {room_id}")
        return self.meeting_rooms[room_id]
        
    async def join_meeting_room(self, room_id: str, user_id: str, websocket: WebSocket, 
                               participant_type: ParticipantType = ParticipantType.HUMAN, 
                               is_organizer: bool = False) -> bool:
        """Join a participant to a meeting room"""
        # Create room if it doesn't exist
        if room_id not in self.meeting_rooms:
            await self.create_meeting_room(room_id)
            
        room = self.meeting_rooms[room_id]
        participant = Participant(user_id, websocket, participant_type, is_organizer)
        
        if room.add_participant(participant):
            self.participant_to_room[user_id] = room_id
            
            # Store AI participant reference
            if participant_type == ParticipantType.AI:
                room.ai_participant = participant
                
            # Save to database
            await self._save_participant_to_db(room_id, participant)
            
            # Notify other participants
            await self._broadcast_participant_update(room_id, "participant_joined", participant.to_dict())
            
            # If this is the first human participant and AI should auto-join, schedule it
            if (participant_type == ParticipantType.HUMAN and 
                len(room.get_human_participants()) == 1 and 
                not room.ai_participant):
                await self._schedule_ai_auto_join(room_id)
                
            return True
        return False
        
    async def leave_meeting_room(self, user_id: str) -> bool:
        """Remove a participant from their meeting room"""
        if user_id not in self.participant_to_room:
            return False
            
        room_id = self.participant_to_room[user_id]
        room = self.meeting_rooms.get(room_id)
        
        if room and room.remove_participant(user_id):
            del self.participant_to_room[user_id]
            
            # Update database
            await self._update_participant_left_db(room_id, user_id)
            
            # Notify other participants
            await self._broadcast_participant_update(room_id, "participant_left", {"user_id": user_id})
            
            # Clean up empty rooms
            if room.should_cleanup():
                await self._cleanup_room(room_id)
                
            return True
        return False
        
    async def handle_voice_activity(self, user_id: str, is_active: bool):
        """Handle voice activity detection for a participant"""
        if user_id not in self.participant_to_room:
            return
            
        room_id = self.participant_to_room[user_id]
        room = self.meeting_rooms.get(room_id)
        
        if room:
            room.set_voice_activity(user_id, is_active)
            
            # Broadcast voice activity to other participants
            await self._broadcast_to_room(room_id, {
                "type": "voice_activity",
                "user_id": user_id,
                "is_active": is_active,
                "conversation_state": room.conversation_state,
                "current_speaker": room.current_speaker,
                "from_user": user_id
            }, exclude_user=user_id)
            
    async def broadcast_to_room(self, room_id: str, message: dict, sender_user_id: Optional[str] = None):
        """Broadcast a message to all participants in a room"""
        await self._broadcast_to_room(room_id, message, exclude_user=sender_user_id)
        
    async def get_room_participants(self, room_id: str) -> List[dict]:
        """Get list of participants in a room"""
        room = self.meeting_rooms.get(room_id)
        return room.get_participant_list() if room else []
        
    async def get_meeting_by_room_id(self, room_id: str):
        """Get meeting by room ID"""
        try:
            from .services.meeting_scheduler import meeting_scheduler_service
            return await meeting_scheduler_service.get_meetings_by_room_id(room_id)
        except Exception as e:
            logger.error(f"Failed to get meeting by room ID {room_id}: {e}")
            return None
        
    async def _broadcast_to_room(self, room_id: str, message: dict, exclude_user: Optional[str] = None):
        """Internal method to broadcast to room participants"""
        room = self.meeting_rooms.get(room_id)
        if not room:
            return
            
        message["timestamp"] = datetime.now().isoformat()
        disconnected_participants = []
        
        for participant in room.participants.values():
            if exclude_user and participant.user_id == exclude_user:
                continue
                
            try:
                await participant.websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to {participant.user_id}: {e}")
                disconnected_participants.append(participant.user_id)
                
        # Clean up disconnected participants
        for user_id in disconnected_participants:
            await self.leave_meeting_room(user_id)
            
    async def _broadcast_participant_update(self, room_id: str, event_type: str, participant_data: dict):
        """Broadcast participant join/leave events"""
        await self._broadcast_to_room(room_id, {
            "type": event_type,
            "participant": participant_data,
            "participants": await self.get_room_participants(room_id),
            "from_user": participant_data.get("user_id")
        })
        
    async def _save_participant_to_db(self, room_id: str, participant: Participant):
        """Save participant join to database"""
        try:
            # Get the scheduled meeting ID from room_id
            scheduled_meeting_response = supabase.table("scheduled_meetings").select("id").eq("meeting_room_id", room_id).execute()
            
            if scheduled_meeting_response.data:
                meeting_id = scheduled_meeting_response.data[0]["id"]
                
                # Save participant
                supabase.table("meeting_participants").insert({
                    "meeting_id": meeting_id,
                    "user_id": participant.user_id if participant.participant_type == ParticipantType.HUMAN else None,
                    "participant_type": participant.participant_type.value,
                    "joined_at": participant.joined_at.isoformat(),
                    "audio_enabled": participant.audio_enabled,
                    "is_organizer": participant.is_organizer
                }).execute()
                
        except Exception as e:
            logger.error(f"Failed to save participant to database: {e}")
            
    async def _update_participant_left_db(self, room_id: str, user_id: str):
        """Update participant left time in database"""
        try:
            scheduled_meeting_response = supabase.table("scheduled_meetings").select("id").eq("meeting_room_id", room_id).execute()
            
            if scheduled_meeting_response.data:
                meeting_id = scheduled_meeting_response.data[0]["id"]
                
                supabase.table("meeting_participants").update({
                    "left_at": datetime.now().isoformat()
                }).eq("meeting_id", meeting_id).eq("user_id", user_id).execute()
                
        except Exception as e:
            logger.error(f"Failed to update participant left time: {e}")
            
    async def _schedule_ai_auto_join(self, room_id: str):
        """Schedule AI to auto-join the meeting after a delay"""
        async def ai_auto_join():
            await asyncio.sleep(5)  # Wait 5 seconds for human participants to settle
            
            room = self.meeting_rooms.get(room_id)
            if room and room.has_human_participants() and not room.ai_participant:
                # Create AI participant (this will be handled by the AI meeting service)
                await self._broadcast_to_room(room_id, {
                    "type": "ai_auto_join_scheduled",
                    "message": "AI assistant will join shortly...",
                    "from_user": "system"
                })
                
        task = asyncio.create_task(ai_auto_join())
        self.ai_auto_join_tasks[room_id] = task
        
    async def _cleanup_room(self, room_id: str):
        """Clean up an empty meeting room"""
        if room_id in self.meeting_rooms:
            del self.meeting_rooms[room_id]
            
        # Cancel any pending AI auto-join tasks
        if room_id in self.ai_auto_join_tasks:
            self.ai_auto_join_tasks[room_id].cancel()
            del self.ai_auto_join_tasks[room_id]
            
        logger.info(f"Cleaned up meeting room {room_id}")

async def _save_conversation_message(room_id: str, user_id: str, message: dict):
    """Save conversation message to database"""
    try:
        # Get meeting ID from room ID
        meeting_response = supabase.table("scheduled_meetings").select("id").eq("meeting_room_id", room_id).execute()
        
        if meeting_response.data:
            meeting_id = meeting_response.data[0]["id"]
            
            # Save to conversation_events table
            supabase.table("conversation_events").insert({
                "meeting_id": meeting_id,
                "speaker_type": "human",
                "speaker_id": user_id,
                "message_text": message.get("message", ""),
                "timestamp": datetime.now().isoformat()
            }).execute()
            
    except Exception as e:
        logger.error(f"Failed to save conversation message: {e}")

# Global enhanced session manager
enhanced_manager = EnhancedSessionManager()

async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str = None, participant_type: str = "human"):
    """Enhanced WebSocket endpoint for multi-user meeting rooms"""
    logger.info(f"WebSocket connection attempt for room {room_id}, user {user_id}")
    
    # Generate user ID if not provided
    if not user_id:
        user_id = f"user-{uuid.uuid4().hex[:8]}"
        
    # Convert participant type
    try:
        p_type = ParticipantType(participant_type.lower())
    except ValueError:
        p_type = ParticipantType.HUMAN
        
    try:
        await websocket.accept()
        logger.info(f"WebSocket accepted for room {room_id}, user {user_id}")
        
        # Join the meeting room
        success = await enhanced_manager.join_meeting_room(room_id, user_id, websocket, p_type)
        if not success:
            await websocket.close(code=1000, reason="Room is full")
            return
            
        # Send initial room state
        participants = await enhanced_manager.get_room_participants(room_id)
        await websocket.send_text(json.dumps({
            "type": "room_joined",
            "room_id": room_id,
            "user_id": user_id,
            "from_user": user_id,
            "participants": participants
        }))
        
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received message in room {room_id} from {user_id}: {data}")
            message = json.loads(data)
            
            # Handle different message types
            message_type = message.get("type")
            
            if message_type == "voice_activity":
                # Handle voice activity detection
                is_active = message.get("is_active", False)
                await enhanced_manager.handle_voice_activity(user_id, is_active)
                
            elif message_type in ["offer", "answer", "ice"]:
                # WebRTC signaling messages - broadcast to specific target or all
                target_user = message.get("to_user")
                if target_user:
                    # Send to specific user (not implemented in this version)
                    pass
                else:
                    # Broadcast to all other participants
                    message["from_user"] = user_id
                    await enhanced_manager.broadcast_to_room(room_id, message, user_id)
                    
            elif message_type == "conversation_message":
                # Handle conversation messages
                message["from_user"] = user_id
                await enhanced_manager.broadcast_to_room(room_id, message, user_id)
                
                # Save conversation message to database
                await _save_conversation_message(room_id, user_id, message)
                
                # Process with AI if this is a human message
                if p_type == ParticipantType.HUMAN:
                    from .services.ai_meeting_orchestrator import ai_meeting_orchestrator
                    
                    # Get meeting ID from room ID
                    meeting = await enhanced_manager.get_meeting_by_room_id(room_id)
                    if meeting:
                        await ai_meeting_orchestrator.process_user_message(
                            meeting.id, room_id, message.get("message", ""), user_id
                        )
                
            else:
                # Generic message broadcasting
                message["from_user"] = user_id
                message["timestamp"] = datetime.now().isoformat()
                await enhanced_manager.broadcast_to_room(room_id, message, user_id)
            
    except WebSocketDisconnect:
        logger.info(f"Client {user_id} disconnected from room {room_id}")
        await enhanced_manager.leave_meeting_room(user_id)
    except Exception as e:
        logger.error(f"WebSocket error in room {room_id} for user {user_id}: {e}")
        await enhanced_manager.leave_meeting_room(user_id)

async def _save_conversation_message(room_id: str, user_id: str, message: dict):
    """Save conversation message to database"""
    try:
        # Get the scheduled meeting ID from room_id
        scheduled_meeting_response = supabase.table("scheduled_meetings").select("id").eq("meeting_room_id", room_id).execute()
        
        if scheduled_meeting_response.data:
            meeting_id = scheduled_meeting_response.data[0]["id"]
            
            # Determine speaker type
            speaker_type = "human" if message.get("participant_type", "human") == "human" else "ai"
            
            # Save conversation event
            supabase.table("conversation_events").insert({
                "meeting_id": meeting_id,
                "speaker_type": speaker_type,
                "speaker_id": user_id if speaker_type == "human" else None,
                "message_text": message.get("message", ""),
                "audio_duration_ms": message.get("audio_duration", 0),
                "confidence_score": message.get("confidence", 1.0)
            }).execute()
            
    except Exception as e:
        logger.error(f"Failed to save conversation message: {e}")