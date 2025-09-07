from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Union, Dict
from datetime import datetime

# Lead schemas
class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = "new"
    external_id: Optional[str] = None
    source: Optional[str] = "manual"
    # Additional Creatio fields
    lead_name: Optional[str] = None
    contact_name: Optional[str] = None
    business_phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    job_title: Optional[str] = None
    budget: Optional[float] = 0
    score: Optional[float] = 0
    commentary: Optional[str] = None
    creatio_created_on: Optional[datetime] = None
    creatio_modified_on: Optional[datetime] = None
    status_id: Optional[str] = None
    qualify_status_id: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class Lead(LeadBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Additional fields that might be present in database
    creatio_id: Optional[str] = None
    notes: Optional[str] = None
    ai_insights: Optional[dict] = None
    lead_score: Optional[int] = 0
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# Meeting schemas
class MeetingBase(BaseModel):
    subject: str
    lead_id: Optional[str] = None
    meeting_time: Optional[datetime] = None
    duration: Optional[int] = None  # in minutes
    meeting_link: Optional[str] = None
    event_id: Optional[str] = None

class MeetingCreate(MeetingBase):
    pass

class Meeting(MeetingBase):
    id: str
    user_id: str
    transcript: Optional[str] = None
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Teams integration schemas
class TeamsConfig(BaseModel):
    microsoft_access_token: str
    microsoft_refresh_token: str
    microsoft_token_expires_at: datetime

class TeamsConfigResponse(BaseModel):
    id: str
    user_id: str
    microsoft_token_expires_at: datetime
    created_at: datetime
    updated_at: datetime

class TeamsSyncResponse(BaseModel):
    status: str
    synced_meetings: int
    total_meetings: int
    errors: List[str]
    message: str

class TranscriptResponse(BaseModel):
    meeting_id: str
    transcript: Optional[str]
    source: Optional[str]
    created_at: Optional[datetime]
    message: Optional[str]
    note: Optional[str]

class SummaryResponse(BaseModel):
    meeting_id: str
    summary: Optional[str]
    ai_model: Optional[str]
    created_at: Optional[datetime]
    message: Optional[str]
    note: Optional[str]

# AI Meeting schemas (enhanced)
class AIMeetingBase(BaseModel):
    lead_id: str
    meeting_id: Optional[str] = None
    status: str = "pending"
    questions: Optional[List[str]] = None
    conversation_history: Optional[List[dict]] = None
    ai_analysis: Optional[dict] = None
    # Enhanced fields for scheduling support
    scheduled_meeting_id: Optional[str] = None
    meeting_room_id: Optional[str] = None
    scheduled_time: Optional[datetime] = None

class AIMeetingCreate(AIMeetingBase):
    pass

class AIMeetingUpdate(BaseModel):
    status: Optional[str] = None
    questions: Optional[List[str]] = None
    conversation_history: Optional[List[dict]] = None
    ai_analysis: Optional[dict] = None
    scheduled_time: Optional[datetime] = None

class AIMeeting(AIMeetingBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    @field_validator('id', 'user_id', 'lead_id', 'meeting_id', 'scheduled_meeting_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v) if v is not None else v

# AI schemas
class SummarizeRequest(BaseModel):
    transcript: str

class SummarizeResponse(BaseModel):
    summary: str

# Creatio integration schemas
class CreatioConfig(BaseModel):
    base_url: str
    base_identity_url: str
    client_id: str
    client_secret: str
    collection_name: str = "Lead"

class CreatioConfigCreate(CreatioConfig):
    pass

class CreatioConfigResponse(BaseModel):
    id: str
    user_id: str
    base_url: str
    base_identity_url: str
    client_id: str
    collection_name: str
    created_at: datetime
    updated_at: datetime

class CreatioSyncResponse(BaseModel):
    status: str
    synced_leads: int
    message: str

# User schema
class User(BaseModel):
    id: str
    email: str
    created_at: datetime