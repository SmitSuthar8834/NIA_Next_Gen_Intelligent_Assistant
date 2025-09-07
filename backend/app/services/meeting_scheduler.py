# backend/app/services/meeting_schedular.py
import uuid
import logging
import secrets
import string
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple, Union

from ..core.config import supabase
from ..models.enhanced_schemas import (
    ScheduledMeeting,
    ScheduledMeetingCreate,
    ScheduledMeetingUpdate,
    MeetingStatus,
    MeetingParticipant,
    MeetingParticipantCreate,
    EmailNotification,
    EmailNotificationCreate,
    NotificationType,
    DeliveryStatus,
)

logger = logging.getLogger(__name__)


class MeetingSchedulerService:
    """Service for managing scheduled AI meetings"""

    def __init__(self):
        pass

    def _prepare_meeting_data(self, raw_data: dict) -> dict:
        """Prepare raw database data for ScheduledMeeting model"""
        prepared_data = raw_data.copy()
        # Convert lead_id from int to string if needed
        if "lead_id" in prepared_data and isinstance(prepared_data["lead_id"], int):
            prepared_data["lead_id"] = str(prepared_data["lead_id"])
        return prepared_data

    def _generate_meeting_room_id(self) -> str:
        """Generate a unique meeting room ID"""
        # Generate a random 8-character alphanumeric string
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(8))

    async def create_scheduled_meeting(
        self,
        user_id: str,
        meeting_data: Union[dict, ScheduledMeetingCreate],
    ) -> Tuple[Optional[ScheduledMeeting], bool]:
        """
        Create a new scheduled meeting.
        Accepts either a dict payload or a ScheduledMeetingCreate Pydantic model.
        Returns (ScheduledMeeting instance, True) on success, or (None, False) on failure.
        """
        try:
            # Normalize input to plain dict (meeting_dict)
            if isinstance(meeting_data, dict):
                meeting_dict = meeting_data.copy()
            else:
                # assume it's a Pydantic model with model_dump or dict
                try:
                    # Pydantic v2
                    meeting_dict = meeting_data.model_dump(mode="json")
                except Exception:
                    # Pydantic v1 fallback
                    meeting_dict = meeting_data.dict()

            # Basic validation: ensure lead_id and scheduled_time exist
            if "lead_id" not in meeting_dict:
                raise ValueError("Missing required field: lead_id")
            if "scheduled_time" not in meeting_dict:
                raise ValueError("Missing required field: scheduled_time")

            # Generate unique meeting room id (existing helper)
            meeting_room_id = self._generate_meeting_room_id()

            # Verify lead exists and belongs to user
            lead_response = (
                supabase.table("leads")
                .select("*")
                .eq("id", meeting_dict["lead_id"])
                .eq("user_id", user_id)
                .execute()
            )
            if not lead_response.data:
                raise ValueError("Lead not found or access denied")
                
            lead_data = lead_response.data[0]

            # Remove timezone field if present (your DB doesn't store that column)
            meeting_dict.pop("timezone", None)

            # Ensure scheduled_time is an ISO string (if it was a datetime, convert)
            scheduled_time_val = meeting_dict.get("scheduled_time")
            if isinstance(scheduled_time_val, datetime):
                # ensure timezone-aware in UTC
                if scheduled_time_val.tzinfo is None:
                    scheduled_time_val = scheduled_time_val.replace(tzinfo=timezone.utc)
                scheduled_time_iso = scheduled_time_val.astimezone(timezone.utc).isoformat()
                meeting_dict["scheduled_time"] = scheduled_time_iso
            else:
                # leave the string as-is (router should normalize), but ensure it's a string
                meeting_dict["scheduled_time"] = str(scheduled_time_val)

            now = datetime.now(timezone.utc)
            # Add DB fields
            meeting_dict.update(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "meeting_room_id": meeting_room_id,
                    "status": MeetingStatus.SCHEDULED.value
                    if hasattr(MeetingStatus, "SCHEDULED")
                    else "scheduled",
                    "participants_joined": 0,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
            )

            # Insert into DB
            response = supabase.table("scheduled_meetings").insert(meeting_dict).execute()

            if not response.data:
                raise Exception("Failed to create scheduled meeting in DB")

            # Prepare the returned meeting (normalize types)
            db_row = response.data[0]
            prepared = self._prepare_meeting_data(db_row)

            created_meeting = ScheduledMeeting(**prepared)

            # Schedule AI to auto-join (best-effort)
            try:
                await self._schedule_ai_auto_join(created_meeting, lead_data)
            except Exception as schedule_err:
                logger.exception(
                    "Failed to schedule AI auto-join after creating meeting %s: %s",
                    created_meeting.id,
                    schedule_err,
                )

            logger.info("Created scheduled meeting %s for user %s", created_meeting.id, user_id)
            return created_meeting, True

        except Exception as e:
            logger.exception("Failed to create scheduled meeting: %s", str(e))
            return None, False

    async def get_scheduled_meeting(self, meeting_id: str, user_id: str) -> Optional[ScheduledMeeting]:
        """Get a scheduled meeting by ID"""
        try:
            response = (
                supabase.table("scheduled_meetings")
                .select("*")
                .eq("id", meeting_id)
                .eq("user_id", user_id)
                .execute()
            )

            if response.data:
                meeting_data = self._prepare_meeting_data(response.data[0])
                return ScheduledMeeting(**meeting_data)
            return None

        except Exception as e:
            logger.error(f"Failed to get scheduled meeting {meeting_id}: {str(e)}")
            return None

    async def get_user_scheduled_meetings(
        self, user_id: str, status: Optional[MeetingStatus] = None
    ) -> List[ScheduledMeeting]:
        """Get all scheduled meetings for a user, optionally filtered by status"""
        try:
            query = supabase.table("scheduled_meetings").select("*").eq("user_id", user_id)

            if status:
                query = query.eq("status", status.value)

            response = query.order("scheduled_time", desc=False).execute()

            return [ScheduledMeeting(**self._prepare_meeting_data(meeting)) for meeting in response.data]

        except Exception as e:
            logger.error(f"Failed to get scheduled meetings for user {user_id}: {str(e)}")
            return []

    async def update_scheduled_meeting(
        self, meeting_id: str, user_id: str, update_data: ScheduledMeetingUpdate
    ) -> Tuple[Optional[ScheduledMeeting], bool]:
        """Update a scheduled meeting"""
        try:
            # Prepare update data
            try:
                update_dict = {k: v for k, v in update_data.model_dump(mode="json").items() if v is not None}
            except Exception:
                update_dict = {k: v for k, v in update_data.dict().items() if v is not None}

            update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

            response = (
                supabase.table("scheduled_meetings")
                .update(update_dict)
                .eq("id", meeting_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                raise Exception("Failed to update scheduled meeting")

            updated_meeting = ScheduledMeeting(**self._prepare_meeting_data(response.data[0]))

            # If the scheduled time changed, reschedule AI auto-join
            if getattr(update_data, "scheduled_time", None):
                await self._schedule_ai_auto_join(updated_meeting)

            logger.info(f"Updated scheduled meeting {meeting_id}")
            return updated_meeting, True

        except Exception as e:
            logger.error(f"Failed to update scheduled meeting {meeting_id}: {str(e)}")
            return None, False

    async def cancel_scheduled_meeting(self, meeting_id: str, user_id: str, reason: Optional[str] = None) -> bool:
        """Cancel a scheduled meeting"""
        try:
            update_data = {
                "status": MeetingStatus.CANCELLED.value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            response = (
                supabase.table("scheduled_meetings")
                .update(update_data)
                .eq("id", meeting_id)
                .eq("user_id", user_id)
                .execute()
            )

            if response.data:
                logger.info(f"Cancelled scheduled meeting {meeting_id}")
                return True
            return False

        except Exception as e:
            logger.error(f"Failed to cancel scheduled meeting {meeting_id}: {str(e)}")
            return False

    async def start_meeting(self, meeting_id: str, user_id: str) -> Tuple[Optional[ScheduledMeeting], bool]:
        """Start a scheduled meeting (update status to active)"""
        try:
            update_data = {
                "status": MeetingStatus.ACTIVE.value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            response = (
                supabase.table("scheduled_meetings")
                .update(update_data)
                .eq("id", meeting_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                raise Exception("Failed to start meeting")

            started_meeting = ScheduledMeeting(**self._prepare_meeting_data(response.data[0]))

            logger.info(f"Started meeting {meeting_id}")
            return started_meeting, True

        except Exception as e:
            logger.error(f"Failed to start meeting {meeting_id}: {str(e)}")
            return None, False

    async def complete_meeting(self, meeting_id: str, user_id: str) -> Tuple[Optional[ScheduledMeeting], bool]:
        """Complete a scheduled meeting"""
        try:
            update_data = {
                "status": MeetingStatus.COMPLETED.value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            response = (
                supabase.table("scheduled_meetings")
                .update(update_data)
                .eq("id", meeting_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                raise Exception("Failed to complete meeting")

            completed_meeting = ScheduledMeeting(**self._prepare_meeting_data(response.data[0]))

            logger.info(f"Completed meeting {meeting_id}")
            return completed_meeting, True

        except Exception as e:
            logger.error(f"Failed to complete meeting {meeting_id}: {str(e)}")
            return None, False

    async def get_meetings_by_room_id(self, room_id: str) -> Optional[ScheduledMeeting]:
        """Get meeting by room ID"""
        try:
            response = supabase.table("scheduled_meetings").select("*").eq("meeting_room_id", room_id).execute()

            if response.data:
                meeting_data = self._prepare_meeting_data(response.data[0])
                return ScheduledMeeting(**meeting_data)
            return None

        except Exception as e:
            logger.error(f"Failed to get meeting by room ID {room_id}: {str(e)}")
            return None

    async def check_meeting_conflicts(
        self, user_id: str, scheduled_time: datetime, duration_minutes: int = 60, exclude_meeting_id: Optional[str] = None
    ) -> List[ScheduledMeeting]:
        """Check for meeting conflicts for a user at a given time"""
        try:
            start_time = scheduled_time
            end_time = scheduled_time + timedelta(minutes=duration_minutes)

            # Query for overlapping meetings
            query = supabase.table("scheduled_meetings").select("*").eq("user_id", user_id).neq(
                "status", MeetingStatus.CANCELLED.value
            )

            if exclude_meeting_id:
                query = query.neq("id", exclude_meeting_id)

            response = query.execute()

            conflicts = []
            for meeting_data in response.data:
                meeting = ScheduledMeeting(**self._prepare_meeting_data(meeting_data))
                meeting_start = meeting.scheduled_time
                meeting_end = meeting_start + timedelta(minutes=meeting.duration_minutes)

                # Check for overlap
                if start_time < meeting_end and end_time > meeting_start:
                    conflicts.append(meeting)

            return conflicts

        except Exception as e:
            logger.error(f"Failed to check meeting conflicts: {str(e)}")
            return []

    async def _schedule_ai_auto_join(self, meeting: ScheduledMeeting, lead_data: Dict[str, Any]):
        """Schedule AI to automatically join the meeting"""
        try:
            # Import here to avoid circular imports
            from .ai_meeting_orchestrator import ai_meeting_orchestrator

            # Schedule AI to join at the meeting time
            await ai_meeting_orchestrator.schedule_ai_join(
                meeting.id,
                meeting.scheduled_time,
                meeting.meeting_room_id,
                lead_data
            )

            logger.info(f"Scheduled AI auto-join for meeting {meeting.id} at {meeting.scheduled_time}")

        except Exception as e:
            logger.error(f"Failed to schedule AI auto-join for meeting {meeting.id}: {str(e)}")

    async def join_meeting_as_ai(self, meeting_id: str) -> bool:
        """Mark AI as joined to the meeting"""
        try:
            update_data = {
                "ai_joined_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            response = supabase.table("scheduled_meetings").update(update_data).eq("id", meeting_id).execute()
            
            if response.data:
                logger.info(f"AI joined meeting {meeting_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to join AI to meeting {meeting_id}: {str(e)}")
            return False

    async def get_upcoming_meetings(self, user_id: str, limit: int = 10) -> List[ScheduledMeeting]:
        """Get upcoming meetings for a user"""
        try:
            now = datetime.now(timezone.utc)
            
            response = (
                supabase.table("scheduled_meetings")
                .select("*")
                .eq("user_id", user_id)
                .gte("scheduled_time", now.isoformat())
                .neq("status", MeetingStatus.CANCELLED.value)
                .order("scheduled_time", desc=False)
                .limit(limit)
                .execute()
            )
            
            return [ScheduledMeeting(**self._prepare_meeting_data(meeting)) for meeting in response.data]
            
        except Exception as e:
            logger.error(f"Failed to get upcoming meetings for user {user_id}: {str(e)}")
            return []

    async def get_meetings_by_date_range(
        self, 
        user_id: str, 
        start_date: datetime, 
        end_date: datetime, 
        status_filter: Optional[MeetingStatus] = None
    ) -> List[ScheduledMeeting]:
        """Get meetings within a date range"""
        try:
            query = (
                supabase.table("scheduled_meetings")
                .select("*")
                .eq("user_id", user_id)
                .gte("scheduled_time", start_date.isoformat())
                .lte("scheduled_time", end_date.isoformat())
            )
            
            if status_filter:
                query = query.eq("status", status_filter.value)
                
            response = query.order("scheduled_time", desc=False).execute()
            
            return [ScheduledMeeting(**self._prepare_meeting_data(meeting)) for meeting in response.data]
            
        except Exception as e:
            logger.error(f"Failed to get meetings by date range: {str(e)}")
            return []


# Global instance
meeting_scheduler_service = MeetingSchedulerService()
