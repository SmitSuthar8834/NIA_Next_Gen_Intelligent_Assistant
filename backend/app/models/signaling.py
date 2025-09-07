from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any, List
from datetime import datetime, timezone
from enum import Enum

class SignalingMessageType(str, Enum):
    JOIN = "join"
    LEAVE = "leave"
    OFFER = "offer"
    ANSWER = "answer"
    ICE_CANDIDATE = "ice"
    VOICE_ACTIVITY = "voice_activity"
    PARTICIPANT_UPDATE = "participant_update"
    MEETING_STATUS = "meeting_status"
    ERROR = "error"

class ParticipantAction(str, Enum):
    JOINED = "joined"
    LEFT = "left"
    MUTED = "muted"
    UNMUTED = "unmuted"
    AUDIO_ENABLED = "audio_enabled"
    AUDIO_DISABLED = "audio_disabled"

# Legacy signaling message for backward compatibility
class SignalingMessage(BaseModel):
    type: Literal["join", "offer", "answer", "ice", "leave"]
    from_user: str
    to_user: Optional[str] = None
    sdp: Optional[str] = None
    candidate: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

# Enhanced signaling messages for multi-user support
class VoiceActivityData(BaseModel):
    """Voice activity detection data"""
    is_speaking: bool = Field(..., description="Whether the user is currently speaking")
    audio_level: float = Field(..., ge=0.0, le=1.0, description="Audio level from 0.0 to 1.0")
    user_id: str = Field(..., description="ID of the user")

class ParticipantData(BaseModel):
    """Participant information"""
    user_id: str = Field(..., description="User ID")
    display_name: Optional[str] = Field(None, description="Display name")
    audio_enabled: bool = Field(default=True, description="Whether audio is enabled")
    is_speaking: bool = Field(default=False, description="Whether currently speaking")
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ParticipantUpdateData(BaseModel):
    """Participant update data"""
    user_id: str = Field(..., description="ID of the user")
    action: ParticipantAction = Field(..., description="Participant action")
    audio_enabled: bool = Field(..., description="Whether audio is enabled")
    display_name: Optional[str] = Field(None, description="Display name of the participant")

class MeetingStatusData(BaseModel):
    """Meeting status update data"""
    status: Literal["scheduled", "active", "completed", "cancelled"] = Field(..., description="Current meeting status")
    participant_count: int = Field(..., ge=0, description="Current number of participants")
    ai_present: bool = Field(..., description="Whether AI is present in the meeting")
    participants: List[ParticipantData] = Field(default_factory=list, description="Current participants")

class ErrorData(BaseModel):
    """Error information"""
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

class EnhancedSignalingMessage(BaseModel):
    """Enhanced signaling message for multi-user WebRTC support"""
    type: SignalingMessageType = Field(..., description="Type of signaling message")
    meeting_room_id: str = Field(..., description="Meeting room identifier")
    from_user: str = Field(..., description="Sender user ID")
    to_user: Optional[str] = Field(None, description="Target user ID (null for broadcast)")
    
    # WebRTC specific fields
    sdp: Optional[str] = Field(None, description="SDP offer/answer")
    candidate: Optional[Dict[str, Any]] = Field(None, description="ICE candidate data")
    
    # Enhanced fields for multi-user support
    voice_activity: Optional[VoiceActivityData] = Field(None, description="Voice activity data")
    participant_update: Optional[ParticipantUpdateData] = Field(None, description="Participant update data")
    meeting_status: Optional[MeetingStatusData] = Field(None, description="Meeting status data")
    error_data: Optional[ErrorData] = Field(None, description="Error information")
    
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Message timestamp")
    sequence_number: Optional[int] = Field(None, description="Message sequence number for ordering")

# WebRTC connection management
class WebRTCConnectionInfo(BaseModel):
    """WebRTC connection information"""
    user_id: str = Field(..., description="User ID")
    connection_id: str = Field(..., description="Unique connection ID")
    peer_connection_state: str = Field(..., description="Peer connection state")
    ice_connection_state: str = Field(..., description="ICE connection state")
    audio_enabled: bool = Field(default=True, description="Whether audio is enabled")
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MeetingRoomState(BaseModel):
    """Complete meeting room state"""
    room_id: str = Field(..., description="Meeting room ID")
    meeting_id: str = Field(..., description="Associated meeting ID")
    status: Literal["scheduled", "active", "completed", "cancelled"] = Field(..., description="Room status")
    participants: List[ParticipantData] = Field(default_factory=list, description="Current participants")
    connections: List[WebRTCConnectionInfo] = Field(default_factory=list, description="WebRTC connections")
    ai_present: bool = Field(default=False, description="Whether AI is present")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response schemas for WebRTC operations
class JoinRoomRequest(BaseModel):
    """Request to join a meeting room"""
    meeting_room_id: str = Field(..., description="Meeting room ID")
    user_id: str = Field(..., description="User ID")
    display_name: Optional[str] = Field(None, description="Display name")
    audio_enabled: bool = Field(default=True, description="Initial audio state")

class JoinRoomResponse(BaseModel):
    """Response when joining a meeting room"""
    success: bool = Field(..., description="Whether join was successful")
    room_state: Optional[MeetingRoomState] = Field(None, description="Current room state")
    your_user_id: str = Field(..., description="Your user ID in the room")
    error_message: Optional[str] = Field(None, description="Error message if join failed")

class LeaveRoomRequest(BaseModel):
    """Request to leave a meeting room"""
    meeting_room_id: str = Field(..., description="Meeting room ID")
    user_id: str = Field(..., description="User ID")

class UpdateAudioRequest(BaseModel):
    """Request to update audio settings"""
    meeting_room_id: str = Field(..., description="Meeting room ID")
    user_id: str = Field(..., description="User ID")
    audio_enabled: bool = Field(..., description="New audio state")

class VoiceActivityRequest(BaseModel):
    """Request to update voice activity"""
    meeting_room_id: str = Field(..., description="Meeting room ID")
    user_id: str = Field(..., description="User ID")
    is_speaking: bool = Field(..., description="Whether user is speaking")
    audio_level: float = Field(..., ge=0.0, le=1.0, description="Audio level")