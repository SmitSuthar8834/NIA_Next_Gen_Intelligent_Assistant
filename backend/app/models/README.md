# Enhanced AI Meeting System Models

This directory contains the Pydantic models and schemas for the Enhanced AI Meeting System.

## Files Overview

### `schemas.py`
Contains the original models plus enhanced AI meeting models:
- Lead management schemas
- Meeting schemas (updated with scheduling support)
- Teams integration schemas
- Creatio integration schemas
- Enhanced AI meeting schemas with scheduling support

### `enhanced_schemas.py`
Contains new models for the enhanced AI meeting system:
- **Scheduled Meeting Models**: For creating and managing scheduled AI meetings with timezone support
- **Question Management Models**: For customizable question sets and individual questions
- **Participant Models**: For tracking meeting participants (human and AI)
- **Email Notification Models**: For managing email notifications with delivery tracking
- **Conversation Models**: For real-time conversation events and analysis
- **Analysis Models**: For storing AI analysis results and lead insights
- **WebRTC Signaling Models**: Enhanced signaling for multi-user support

### `signaling.py`
Contains WebRTC signaling models:
- Legacy signaling message (backward compatibility)
- Enhanced signaling messages for multi-user support
- Voice activity detection models
- Meeting room state management
- Participant management models

## Key Features

### Timezone Support
All scheduled meeting models include proper timezone validation using `pytz`.

### Email Validation
Email notification models use `EmailStr` from Pydantic for proper email validation.

### Type Safety
Extensive use of Enums for better type safety:
- `MeetingStatus`: scheduled, active, completed, cancelled
- `ParticipantType`: human, ai
- `QuestionType`: open_ended, multiple_choice, rating
- `NotificationType`: invitation, reminder, ai_joined, summary
- `SignalingMessageType`: join, leave, offer, answer, ice, voice_activity, etc.

### Validation
Comprehensive validation including:
- Future date validation for scheduled meetings
- Timezone validation
- Email format validation
- Audio level ranges (0.0 to 1.0)
- Lead score ranges (0 to 100)
- Sentiment score ranges (-1.0 to 1.0)

### Multi-User WebRTC Support
Enhanced signaling models support:
- Voice activity detection
- Participant updates (join/leave/mute/unmute)
- Meeting status broadcasts
- Error handling
- Connection state management

## Usage Examples

### Creating a Scheduled Meeting
```python
from models.enhanced_schemas import ScheduledMeetingCreate
from datetime import datetime, timezone, timedelta

meeting = ScheduledMeetingCreate(
    lead_id="lead-123",
    scheduled_time=datetime.now(timezone.utc) + timedelta(hours=2),
    duration_minutes=60,
    timezone="America/New_York"
)
```

### Creating a Question Set
```python
from models.enhanced_schemas import QuestionSetCreate, QuestionCreate, QuestionType

question_set = QuestionSetCreate(
    name="Discovery Questions",
    description="Standard discovery questions for sales meetings"
)

question = QuestionCreate(
    question_set_id="set-123",
    question_text="What is your biggest challenge?",
    question_type=QuestionType.OPEN_ENDED,
    order_index=1
)
```

### Enhanced Signaling
```python
from models.signaling import EnhancedSignalingMessage, SignalingMessageType, VoiceActivityData

voice_activity = VoiceActivityData(
    is_speaking=True,
    audio_level=0.8,
    user_id="user-123"
)

message = EnhancedSignalingMessage(
    type=SignalingMessageType.VOICE_ACTIVITY,
    meeting_room_id="room-123",
    from_user="user-123",
    voice_activity=voice_activity
)
```

## Requirements

The enhanced models require the following additional packages:
- `pytz>=2023.3` - For timezone validation
- `email-validator>=2.1.0` - For email validation (used by Pydantic's EmailStr)

These are included in the `requirements.txt` file.