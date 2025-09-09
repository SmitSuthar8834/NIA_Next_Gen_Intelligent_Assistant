from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional, List, Dict, Any, Literal, Union
from datetime import datetime, timezone, timedelta
from enum import Enum
import pytz

# Enums for better type safety
class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ParticipantType(str, Enum):
    HUMAN = "human"
    AI = "ai"

class QuestionType(str, Enum):
    OPEN_ENDED = "open_ended"
    MULTIPLE_CHOICE = "multiple_choice"
    RATING = "rating"

class NotificationType(str, Enum):
    INVITATION = "invitation"
    REMINDER = "reminder"
    AI_JOINED = "ai_joined"
    SUMMARY = "summary"

class DeliveryStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"

class SpeakerType(str, Enum):
    AI = "ai"
    HUMAN = "human"

class SignalingMessageType(str, Enum):
    JOIN = "join"
    LEAVE = "leave"
    OFFER = "offer"
    ANSWER = "answer"
    ICE_CANDIDATE = "ice"
    VOICE_ACTIVITY = "voice_activity"
    PARTICIPANT_UPDATE = "participant_update"
    MEETING_STATUS = "meeting_status"

class ConversationState(str, Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    AI_SPEAKING = "ai_speaking"
    USER_SPEAKING = "user_speaking"
    WAITING_FOR_RESPONSE = "waiting_for_response"
    LISTENING = "listening"
    PROCESSING = "processing"
    RESPONDING = "responding"
    COMPLETED = "completed"

# Timezone validation helper
def validate_timezone(tz_string: str) -> str:
    """Validate timezone string"""
    try:
        pytz.timezone(tz_string)
        return tz_string
    except pytz.exceptions.UnknownTimeZoneError:
        raise ValueError(f"Invalid timezone: {tz_string}")

# Base schemas for scheduled meetings
class ScheduledMeetingBase(BaseModel):
    lead_id: Union[str, int] = Field(..., description="ID of the associated lead")
    scheduled_time: datetime = Field(..., description="Meeting start time with timezone")
    duration_minutes: int = Field(default=60, ge=15, le=480, description="Meeting duration in minutes (15-480)")
    question_set_id: Optional[str] = Field(None, description="ID of the question set to use")
    meeting_type: str = Field(default="ai_discovery", description="Type of meeting")
    max_participants: int = Field(default=10, ge=2, le=50, description="Maximum number of participants")
    recording_enabled: bool = Field(default=True, description="Whether to record the meeting")
    transcript_enabled: bool = Field(default=True, description="Whether to generate transcript")
    email_notifications_enabled: bool = Field(default=True, description="Whether to send email notifications")
    timezone: str = Field(default="UTC", description="Timezone for the meeting")

    # NOTE: Do not enforce time-in-future here to allow reading past meetings
    @field_validator('scheduled_time')
    @classmethod
    def normalize_scheduled_time(cls, v):
        # Convert string to datetime if needed and normalize to aware datetime
        if isinstance(v, str):
            v = datetime.fromisoformat(v.replace('Z', '+00:00'))
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v

    @field_validator('timezone')
    @classmethod
    def validate_timezone_field(cls, v):
        """Validate timezone string"""
        return validate_timezone(v)
    
    @field_validator('lead_id')
    @classmethod
    def validate_lead_id(cls, v):
        """Convert lead_id to string"""
        return str(v)

class ScheduledMeetingCreate(ScheduledMeetingBase):
    """Schema for creating a new scheduled meeting"""
    @field_validator('scheduled_time')
    @classmethod
    def validate_scheduled_time_future_on_create(cls, v):
        # Allow slight slack but not past on create
        now = datetime.now(timezone.utc)
        min_time = now - timedelta(minutes=1)
        if v < min_time:
            raise ValueError("Scheduled time must not be in the past")
        return v

class ScheduledMeetingUpdate(BaseModel):
    """Schema for updating a scheduled meeting"""
    scheduled_time: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    question_set_id: Optional[str] = None
    max_participants: Optional[int] = Field(None, ge=2, le=50)
    recording_enabled: Optional[bool] = None
    transcript_enabled: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None
    timezone: Optional[str] = None
    status: Optional[MeetingStatus] = None

    @field_validator('scheduled_time')
    @classmethod
    def validate_scheduled_time_future_on_update(cls, v):
        """Ensure scheduled time is in the future if provided"""
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v.replace('Z', '+00:00'))
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= datetime.now(timezone.utc):
            raise ValueError("Scheduled time must be in the future")
        return v

    @field_validator('timezone')
    @classmethod
    def validate_timezone_field(cls, v):
        """Validate timezone string if provided"""
        if v is not None:
            return validate_timezone(v)
        return v

class ScheduledMeeting(ScheduledMeetingBase):
    """Complete scheduled meeting schema"""
    id: str
    user_id: str
    meeting_room_id: str = Field(..., description="Unique meeting room identifier")
    status: MeetingStatus = Field(default=MeetingStatus.SCHEDULED)
    ai_joined_at: Optional[datetime] = None
    participants_joined: int = Field(default=0, description="Current number of participants")
    created_at: datetime
    updated_at: datetime

    @field_validator('id', 'user_id', 'meeting_room_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Question Set schemas
class QuestionSetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the question set")
    description: Optional[str] = Field(None, description="Description of the question set")
    is_default: bool = Field(default=False, description="Whether this is a default question set")

class QuestionSetCreate(QuestionSetBase):
    """Schema for creating a new question set"""
    pass

class QuestionSetUpdate(BaseModel):
    """Schema for updating a question set"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_default: Optional[bool] = None

class QuestionSet(QuestionSetBase):
    """Complete question set schema"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    @field_validator('id', 'user_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Question schemas
class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1, description="The question text")
    question_type: QuestionType = Field(default=QuestionType.OPEN_ENDED, description="Type of question")
    order_index: int = Field(default=0, ge=0, description="Order of the question in the set")
    is_active: bool = Field(default=True, description="Whether the question is active")

class QuestionCreate(QuestionBase):
    """Schema for creating a new question"""
    question_set_id: str = Field(..., description="ID of the question set")

class QuestionUpdate(BaseModel):
    """Schema for updating a question"""
    question_text: Optional[str] = Field(None, min_length=1)
    question_type: Optional[QuestionType] = None
    order_index: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class Question(QuestionBase):
    """Complete question schema"""
    id: str
    question_set_id: str
    created_at: datetime
    updated_at: datetime

    @field_validator('id', 'question_set_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Meeting Participant schemas
class MeetingParticipantBase(BaseModel):
    participant_type: ParticipantType = Field(default=ParticipantType.HUMAN, description="Type of participant")
    audio_enabled: bool = Field(default=True, description="Whether audio is enabled for participant")
    is_organizer: bool = Field(default=False, description="Whether participant is the meeting organizer")

class MeetingParticipantCreate(MeetingParticipantBase):
    """Schema for adding a participant to a meeting"""
    meeting_id: str = Field(..., description="ID of the meeting")
    user_id: Optional[str] = Field(None, description="User ID for human participants")

class MeetingParticipantUpdate(BaseModel):
    """Schema for updating a meeting participant"""
    audio_enabled: Optional[bool] = None
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None

class MeetingParticipant(MeetingParticipantBase):
    """Complete meeting participant schema"""
    id: str
    meeting_id: str
    user_id: Optional[str] = None
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None
    created_at: datetime

    @field_validator('id', 'meeting_id', 'user_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Email Notification schemas
class EmailNotificationBase(BaseModel):
    recipient_email: EmailStr = Field(..., description="Email address of the recipient")
    notification_type: NotificationType = Field(..., description="Type of notification")

class EmailNotificationCreate(EmailNotificationBase):
    """Schema for creating an email notification record"""
    meeting_id: str = Field(..., description="ID of the associated meeting")

class EmailNotificationUpdate(BaseModel):
    """Schema for updating email notification status"""
    sent_at: Optional[datetime] = None
    delivery_status: Optional[DeliveryStatus] = None
    error_message: Optional[str] = None
    retry_count: Optional[int] = Field(None, ge=0)

class EmailNotification(EmailNotificationBase):
    """Complete email notification schema"""
    id: str
    meeting_id: str
    sent_at: Optional[datetime] = None
    delivery_status: DeliveryStatus = Field(default=DeliveryStatus.PENDING)
    error_message: Optional[str] = None
    retry_count: int = Field(default=0)
    created_at: datetime
    updated_at: datetime

    @field_validator('id', 'meeting_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Enhanced AI Meeting schemas (updating existing)
class EnhancedAIMeetingBase(BaseModel):
    lead_id: str = Field(..., description="ID of the associated lead")
    meeting_id: Optional[str] = Field(None, description="ID of the associated meeting record")
    scheduled_meeting_id: Optional[str] = Field(None, description="ID of the scheduled meeting")
    meeting_room_id: Optional[str] = Field(None, description="WebRTC meeting room ID")
    scheduled_time: Optional[datetime] = Field(None, description="Scheduled meeting time")
    status: str = Field(default="pending", description="AI meeting status")
    questions: Optional[List[str]] = Field(default_factory=list, description="Questions for the meeting")
    conversation_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Conversation history")
    ai_analysis: Optional[Dict[str, Any]] = Field(None, description="AI analysis results")

class EnhancedAIMeetingCreate(EnhancedAIMeetingBase):
    """Schema for creating an enhanced AI meeting"""
    pass

class EnhancedAIMeetingUpdate(BaseModel):
    """Schema for updating an enhanced AI meeting"""
    status: Optional[str] = None
    questions: Optional[List[str]] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    scheduled_time: Optional[datetime] = None

class EnhancedAIMeeting(EnhancedAIMeetingBase):
    """Complete enhanced AI meeting schema"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    @field_validator('id', 'user_id', 'lead_id', 'meeting_id', 'scheduled_meeting_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Conversation Event schemas
class ConversationEventBase(BaseModel):
    speaker_type: SpeakerType = Field(..., description="Type of speaker (AI or human)")
    speaker_id: Optional[str] = Field(None, description="User ID for human speakers, null for AI")
    message_text: str = Field(..., min_length=1, description="The message content")
    audio_duration_ms: Optional[int] = Field(None, ge=0, description="Audio duration in milliseconds")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence score for transcription")

class ConversationEventCreate(ConversationEventBase):
    """Schema for creating a conversation event"""
    meeting_id: str = Field(..., description="ID of the meeting")

class ConversationEventUpdate(BaseModel):
    """Schema for updating a conversation event"""
    processed: Optional[bool] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)

class ConversationEvent(ConversationEventBase):
    """Complete conversation event schema"""
    id: str
    meeting_id: str
    timestamp: datetime
    processed: bool = Field(default=False)

    @field_validator('id', 'meeting_id', 'speaker_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Meeting Analysis schemas
class MeetingAnalysisData(BaseModel):
    """Schema for meeting analysis data"""
    lead_score: int = Field(..., ge=0, le=100, description="Lead score from 0-100")
    qualification_status: str = Field(..., description="Qualification status")
    key_insights: List[str] = Field(default_factory=list, description="Key insights from the conversation")
    pain_points: List[str] = Field(default_factory=list, description="Identified pain points")
    buying_signals: List[str] = Field(default_factory=list, description="Buying signals detected")
    budget_indication: Optional[str] = Field(None, description="Budget indication if mentioned")
    timeline_indication: Optional[str] = Field(None, description="Timeline indication if mentioned")
    decision_makers: List[str] = Field(default_factory=list, description="Decision makers identified")
    next_steps: List[str] = Field(default_factory=list, description="Recommended next steps")
    sentiment_score: float = Field(..., ge=-1.0, le=1.0, description="Sentiment score from -1 to 1")
    engagement_level: str = Field(..., description="Engagement level (high, medium, low)")
    follow_up_priority: str = Field(..., description="Follow-up priority (urgent, high, medium, low)")

class MeetingAnalysisBase(BaseModel):
    analysis_data: MeetingAnalysisData = Field(..., description="Analysis results")
    lead_score_before: Optional[int] = Field(None, ge=0, le=100, description="Lead score before meeting")
    lead_score_after: Optional[int] = Field(None, ge=0, le=100, description="Lead score after meeting")
    status_changed_from: Optional[str] = Field(None, description="Previous lead status")
    status_changed_to: Optional[str] = Field(None, description="New lead status")

class MeetingAnalysisCreate(MeetingAnalysisBase):
    """Schema for creating a meeting analysis"""
    meeting_id: str = Field(..., description="ID of the meeting")
    lead_id: str = Field(..., description="ID of the lead")

class MeetingAnalysis(MeetingAnalysisBase):
    """Complete meeting analysis schema"""
    id: str
    meeting_id: str
    lead_id: str
    created_at: datetime

    @field_validator('id', 'meeting_id', 'lead_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Enhanced WebRTC Signaling schemas for multi-user support
class VoiceActivityData(BaseModel):
    """Voice activity detection data"""
    is_speaking: bool = Field(..., description="Whether the user is currently speaking")
    audio_level: float = Field(..., ge=0.0, le=1.0, description="Audio level from 0.0 to 1.0")
    user_id: str = Field(..., description="ID of the user")

class ParticipantUpdateData(BaseModel):
    """Participant update data"""
    user_id: str = Field(..., description="ID of the user")
    action: Literal["joined", "left", "muted", "unmuted"] = Field(..., description="Participant action")
    audio_enabled: bool = Field(..., description="Whether audio is enabled")
    display_name: Optional[str] = Field(None, description="Display name of the participant")

class MeetingStatusData(BaseModel):
    """Meeting status update data"""
    status: MeetingStatus = Field(..., description="Current meeting status")
    participant_count: int = Field(..., ge=0, description="Current number of participants")
    ai_present: bool = Field(..., description="Whether AI is present in the meeting")

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
    
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Message timestamp")
    sequence_number: Optional[int] = Field(None, description="Message sequence number for ordering")

# Meeting Room Management schemas
class MeetingRoomInfo(BaseModel):
    """Meeting room information"""
    room_id: str = Field(..., description="Meeting room ID")
    meeting_id: str = Field(..., description="Associated meeting ID")
    status: MeetingStatus = Field(..., description="Room status")
    participant_count: int = Field(..., ge=0, description="Current participant count")
    max_participants: int = Field(..., ge=2, description="Maximum allowed participants")
    ai_present: bool = Field(..., description="Whether AI is present")
    created_at: datetime = Field(..., description="Room creation time")
    expires_at: Optional[datetime] = Field(None, description="Room expiration time")

class JoinMeetingRequest(BaseModel):
    """Request to join a meeting room"""
    meeting_room_id: str = Field(..., description="Meeting room ID to join")
    display_name: Optional[str] = Field(None, description="Display name for the participant")
    audio_enabled: bool = Field(default=True, description="Whether to enable audio initially")

class JoinMeetingResponse(BaseModel):
    """Response when joining a meeting room"""
    success: bool = Field(..., description="Whether join was successful")
    room_info: Optional[MeetingRoomInfo] = Field(None, description="Room information if successful")
    participants: List[MeetingParticipant] = Field(default_factory=list, description="Current participants")
    error_message: Optional[str] = Field(None, description="Error message if join failed")

# Transcription schemas
class TranscriptionChunk(BaseModel):
    """Schema for transcription chunks"""
    text: str = Field(..., description="Transcribed text")
    is_final: bool = Field(..., description="Whether this is a final transcription")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    timestamp: int = Field(..., description="Timestamp in milliseconds")

# Bulk operations schemas
class BulkQuestionCreate(BaseModel):
    """Schema for creating multiple questions at once"""
    question_set_id: str = Field(..., description="ID of the question set")
    questions: List[QuestionBase] = Field(..., min_items=1, description="List of questions to create")

class BulkQuestionUpdate(BaseModel):
    """Schema for updating question order"""
    question_updates: List[Dict[str, Any]] = Field(..., description="List of question updates with IDs")

# Response schemas for API endpoints
class ScheduledMeetingListResponse(BaseModel):
    """Response schema for listing scheduled meetings"""
    meetings: List[ScheduledMeeting] = Field(..., description="List of scheduled meetings")
    total_count: int = Field(..., description="Total number of meetings")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")

class QuestionSetWithQuestions(QuestionSet):
    """Question set with its questions included"""
    questions: List[Question] = Field(default_factory=list, description="Questions in this set")

class MeetingWithParticipants(ScheduledMeeting):
    """Scheduled meeting with participants included"""
    participants: List[MeetingParticipant] = Field(default_factory=list, description="Meeting participants")
    lead: Optional[Dict[str, Any]] = Field(None, description="Associated lead data")
    question_set: Optional[QuestionSet] = Field(None, description="Associated question set")