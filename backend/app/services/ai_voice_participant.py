"""
AI Voice Participant Service using Camb.ai TTS

Creates a virtual AI participant that can speak in WebRTC meetings using Camb.ai TTS
"""

import asyncio
import logging
import base64
from typing import Dict, Any, Optional
import json
from ..signaling import enhanced_manager, ParticipantType
from .voice_ai_service import voice_ai_service

logger = logging.getLogger(__name__)

class AIVoiceParticipant:
    """AI participant that can speak in meetings using Camb.ai TTS"""
    
    def __init__(self, meeting_id: str, room_id: str):
        self.meeting_id = meeting_id
        self.room_id = room_id
        self.is_speaking = False
        self.voice_id = "en-US-AriaNeural"  # Professional female voice
        self.speaking_speed = 1.0
        
    async def join_meeting(self):
        """Join the meeting as an AI voice participant"""
        try:
            # Create virtual WebSocket connection for AI
            ai_websocket = AIWebSocketMock(self)
            
            # Join meeting room
            success = await enhanced_manager.join_meeting_room(
                self.room_id, 
                f"ai-assistant", 
                ai_websocket, 
                ParticipantType.AI
            )
            
            if success:
                logger.info(f"AI voice participant joined meeting {self.meeting_id}")
                
                # Announce AI joining with voice
                await self._speak_message("Hello! I'm your AI meeting assistant. I'm here to learn about your business and help qualify this opportunity. Let's get started!")
                    
            return success
            
        except Exception as e:
            logger.error(f"Failed to join meeting as AI voice participant: {e}")
            return False
    
    async def speak_message(self, text: str):
        """Public method to make AI speak a message"""
        await self._speak_message(text)
    
    async def _speak_message(self, text: str):
        """Convert text to speech and broadcast to meeting"""
        try:
            if self.is_speaking:
                logger.warning("AI is already speaking, queuing message")
                await asyncio.sleep(1)  # Wait for current speech to finish
                
            self.is_speaking = True
            logger.info(f"AI speaking: {text[:100]}...")
            
            # Generate speech audio using Camb.ai
            audio_data = await voice_ai_service.text_to_speech(
                text, 
                voice_id=self.voice_id,
                speed=self.speaking_speed
            )
            
            if audio_data:
                # Convert audio to base64 for transmission
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                
                # Broadcast AI speaking with audio
                await enhanced_manager.broadcast_to_room(self.room_id, {
                    "type": "ai_voice_message",
                    "message": text,
                    "audio_data": audio_base64,
                    "audio_format": "mp3",
                    "voice_id": self.voice_id,
                    "from_user": "ai-assistant",
                    "timestamp": asyncio.get_event_loop().time()
                })
                
                # Calculate speaking duration based on audio length
                # Rough estimate: 1 second per 150 characters
                speaking_duration = max(len(text) / 150, 2.0)  # Minimum 2 seconds
                await asyncio.sleep(speaking_duration)
                
                # Broadcast speaking finished
                await enhanced_manager.broadcast_to_room(self.room_id, {
                    "type": "ai_speaking_finished",
                    "from_user": "ai-assistant"
                })
                
            else:
                logger.error("Failed to generate speech audio")
                # Fallback to text message
                await enhanced_manager.broadcast_to_room(self.room_id, {
                    "type": "ai_message",
                    "message": text,
                    "from_user": "ai-assistant"
                })
            
            self.is_speaking = False
            
        except Exception as e:
            logger.error(f"AI speaking error: {e}")
            self.is_speaking = False
    
    async def process_user_message(self, user_message: str, user_id: str):
        """Process user message and generate AI voice response"""
        try:
            # Import here to avoid circular imports
            from .ai_meeting_orchestrator import ai_meeting_orchestrator
            
            # Get AI response
            ai_response = await ai_meeting_orchestrator.process_user_message(
                self.meeting_id, self.room_id, user_message, user_id
            )
            
            if ai_response:
                # Speak the AI response
                await self._speak_message(ai_response)
                return ai_response
                
            return None
            
        except Exception as e:
            logger.error(f"Error processing user message: {e}")
            return None
    
    async def set_voice_settings(self, voice_id: str = None, speed: float = None):
        """Update AI voice settings"""
        if voice_id:
            self.voice_id = voice_id
        if speed:
            self.speaking_speed = max(0.5, min(2.0, speed))  # Clamp between 0.5x and 2.0x
        
        logger.info(f"AI voice settings updated: voice={self.voice_id}, speed={self.speaking_speed}")

class AIWebSocketMock:
    """Mock WebSocket for AI participant"""
    
    def __init__(self, ai_participant: AIVoiceParticipant):
        self.ai_participant = ai_participant
        self.closed = False
        
    async def send_text(self, data: str):
        """Handle outgoing messages from AI"""
        try:
            if not self.closed:
                message = json.loads(data)
                logger.debug(f"AI WebSocket sending: {message.get('type', 'unknown')}")
        except Exception as e:
            logger.error(f"AI WebSocket send error: {e}")
    
    async def close(self, code: int = 1000, reason: str = ""):
        """Handle AI disconnect"""
        self.closed = True
        logger.info(f"AI participant disconnected: {reason}")

# Global AI voice participant manager
ai_voice_participants: Dict[str, AIVoiceParticipant] = {}

async def create_ai_voice_participant(meeting_id: str, room_id: str) -> AIVoiceParticipant:
    """Create and register an AI voice participant"""
    ai_participant = AIVoiceParticipant(meeting_id, room_id)
    ai_voice_participants[meeting_id] = ai_participant
    return ai_participant

async def get_ai_voice_participant(meeting_id: str) -> Optional[AIVoiceParticipant]:
    """Get existing AI voice participant"""
    return ai_voice_participants.get(meeting_id)

async def remove_ai_voice_participant(meeting_id: str):
    """Remove AI voice participant"""
    if meeting_id in ai_voice_participants:
        del ai_voice_participants[meeting_id]
        logger.info(f"Removed AI voice participant for meeting {meeting_id}")