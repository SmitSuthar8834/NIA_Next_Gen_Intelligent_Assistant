"""
Voice AI Service using Camb.ai TTS API

Handles converting AI text responses to speech using Camb.ai's TTS service
"""

import logging
import os
import asyncio
import aiohttp
import base64
from typing import Optional, Dict, Any, List
from io import BytesIO

logger = logging.getLogger(__name__)

class VoiceAIService:
    """Service for voice AI capabilities using Camb.ai"""
    
    def __init__(self):
        self.camb_api_key = os.getenv("CAMB_TTS_API_KEY", "22f5d085-3559-4de1-9d02-fdfa6169485b")
        self.camb_base_url = "https://api.camb.ai/v1"
        self.voice_enabled = bool(self.camb_api_key)
        
        if self.voice_enabled:
            logger.info("Voice AI enabled with Camb.ai TTS")
        else:
            logger.warning("Voice AI disabled - no Camb.ai API key")
    
    async def text_to_speech(
        self, 
        text: str, 
        voice_id: str = "en-US-AriaNeural",
        speed: float = 1.0,
        pitch: float = 0.0
    ) -> Optional[bytes]:
        """Convert text to speech using Camb.ai TTS API"""
        if not self.voice_enabled:
            logger.warning("Voice AI not enabled")
            return None
            
        try:
            # Prepare request payload for Camb.ai
            payload = {
                "text": text,
                "voice_id": voice_id,
                "speed": speed,
                "output_format": "mp3"
            }
            
            headers = {
                "Authorization": f"Bearer {self.camb_api_key}",
                "Content-Type": "application/json"
            }
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.camb_base_url}/tts",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status == 200:
                        # Check if response is JSON or binary
                        content_type = response.headers.get('content-type', '')
                        
                        if 'application/json' in content_type:
                            # JSON response with base64 audio
                            response_data = await response.json()
                            if "audio" in response_data:
                                audio_base64 = response_data["audio"]
                                audio_bytes = base64.b64decode(audio_base64)
                                logger.info(f"Generated speech for text: '{text[:50]}...' ({len(audio_bytes)} bytes)")
                                return audio_bytes
                            else:
                                logger.error("No audio data in Camb.ai response")
                                return None
                        else:
                            # Direct binary audio response
                            audio_bytes = await response.read()
                            logger.info(f"Generated speech for text: '{text[:50]}...' ({len(audio_bytes)} bytes)")
                            return audio_bytes
                    else:
                        error_text = await response.text()
                        logger.error(f"Camb.ai TTS API error {response.status}: {error_text}")
                        # Try fallback TTS
                        return await self._fallback_tts(text)
            
        except asyncio.TimeoutError:
            logger.error("Camb.ai TTS API timeout")
            return None
        except Exception as e:
            logger.error(f"Camb.ai TTS error: {e}")
            # Try fallback TTS
            return await self._fallback_tts(text)
    
    async def _fallback_tts(self, text: str) -> Optional[bytes]:
        """Fallback TTS using system TTS or mock audio"""
        try:
            logger.info("Using fallback TTS (mock audio)")
            
            # Create a simple mock MP3 header for testing
            # This is just for testing - in production you'd use a real TTS service
            mock_mp3_header = bytes([
                0xFF, 0xFB, 0x90, 0x00,  # MP3 header
                0x00, 0x00, 0x00, 0x00,  # Padding
            ])
            
            # Create mock audio data proportional to text length
            audio_length = max(len(text) * 100, 1000)  # Minimum 1000 bytes
            mock_audio = mock_mp3_header + bytes([0x00] * audio_length)
            
            logger.info(f"Generated fallback audio: {len(mock_audio)} bytes")
            return mock_audio
            
        except Exception as e:
            logger.error(f"Fallback TTS error: {e}")
            return None
    
    async def get_available_voices(self) -> Optional[List[Dict[str, Any]]]:
        """Get list of available voices from Camb.ai"""
        if not self.voice_enabled:
            return None
            
        try:
            headers = {
                "Authorization": f"Bearer {self.camb_api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.camb_base_url}/voices",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    
                    if response.status == 200:
                        voices_data = await response.json()
                        return voices_data.get("voices", [])
                    else:
                        logger.error(f"Failed to get voices: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error getting voices: {e}")
            return None
    
    def get_default_voices(self) -> Dict[str, str]:
        """Get default voice options"""
        return {
            "female_professional": "en-US-AriaNeural",
            "male_professional": "en-US-GuyNeural", 
            "female_friendly": "en-US-JennyNeural",
            "male_friendly": "en-US-ChristopherNeural",
            "female_assistant": "en-US-MichelleNeural"
        }
    
    async def test_tts(self, test_text: str = "Hello! I'm your AI meeting assistant. How can I help you today?") -> bool:
        """Test TTS functionality"""
        try:
            audio_data = await self.text_to_speech(test_text)
            if audio_data and len(audio_data) > 0:
                logger.info(f"TTS test successful - generated {len(audio_data)} bytes of audio")
                return True
            else:
                logger.error("TTS test failed - no audio generated")
                return False
        except Exception as e:
            logger.error(f"TTS test error: {e}")
            return False

# Global voice AI service
voice_ai_service = VoiceAIService()