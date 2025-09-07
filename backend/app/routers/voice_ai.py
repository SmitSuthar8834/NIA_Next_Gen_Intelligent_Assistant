"""
Voice AI Router

Endpoints for testing and managing voice AI functionality
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
import logging
from ..core.auth import get_current_user
from ..services.voice_ai_service import voice_ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice-ai", tags=["voice-ai"])

@router.post("/test-tts")
async def test_text_to_speech(
    text: str = "Hello! I'm your AI meeting assistant. How can I help you today?",
    voice_id: str = "en-US-AriaNeural",
    current_user=Depends(get_current_user)
):
    """Test text-to-speech functionality"""
    try:
        audio_data = await voice_ai_service.text_to_speech(text, voice_id=voice_id)
        
        if audio_data:
            return Response(
                content=audio_data,
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": "attachment; filename=test_tts.mp3"
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate speech"
            )
            
    except Exception as e:
        logger.error(f"TTS test error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/voices")
async def get_available_voices(current_user=Depends(get_current_user)):
    """Get available voice options"""
    try:
        # Get voices from Camb.ai API
        voices = await voice_ai_service.get_available_voices()
        
        if voices:
            return {"voices": voices}
        else:
            # Return default voices if API call fails
            default_voices = voice_ai_service.get_default_voices()
            return {"voices": default_voices, "source": "default"}
            
    except Exception as e:
        logger.error(f"Error getting voices: {e}")
        # Return default voices as fallback
        default_voices = voice_ai_service.get_default_voices()
        return {"voices": default_voices, "source": "fallback"}

@router.get("/status")
async def get_voice_ai_status(current_user=Depends(get_current_user)):
    """Get voice AI service status"""
    try:
        # Test TTS functionality
        test_result = await voice_ai_service.test_tts()
        
        return {
            "voice_enabled": voice_ai_service.voice_enabled,
            "api_key_configured": bool(voice_ai_service.camb_api_key),
            "tts_test_passed": test_result,
            "service": "Camb.ai TTS"
        }
        
    except Exception as e:
        logger.error(f"Voice AI status error: {e}")
        return {
            "voice_enabled": False,
            "api_key_configured": bool(voice_ai_service.camb_api_key),
            "tts_test_passed": False,
            "error": str(e),
            "service": "Camb.ai TTS"
        }

@router.post("/meetings/{meeting_id}/speak")
async def make_ai_speak(
    meeting_id: str,
    text: str,
    voice_id: str = "en-US-AriaNeural",
    current_user=Depends(get_current_user)
):
    """Make AI speak in a specific meeting"""
    try:
        from ..services.ai_voice_participant import get_ai_voice_participant
        
        # Get AI voice participant for the meeting
        ai_participant = await get_ai_voice_participant(meeting_id)
        
        if not ai_participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI voice participant not found for this meeting"
            )
        
        # Update voice settings if different
        await ai_participant.set_voice_settings(voice_id=voice_id)
        
        # Make AI speak
        await ai_participant.speak_message(text)
        
        return {
            "message": "AI speech initiated",
            "text": text,
            "voice_id": voice_id,
            "meeting_id": meeting_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI speak error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )