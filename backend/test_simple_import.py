#!/usr/bin/env python3
"""Simple import test"""

import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

try:
    print("Testing imports step by step...")
    
    print("1. Testing basic imports...")
    import uuid
    import logging
    print("✅ Basic imports successful")
    
    print("2. Testing enhanced schemas...")
    from models.enhanced_schemas import ScheduledMeeting, MeetingStatus
    print("✅ Enhanced schemas import successful")
    
    print("3. Testing config...")
    from core.config import supabase
    print("✅ Config import successful")
    
    print("4. Testing email service...")
    from services.email_service import email_service
    print("✅ Email service import successful")
    
    print("5. Testing meeting scheduler class definition...")
    
    class MeetingSchedulerService:
        def __init__(self):
            pass
        
        def _generate_meeting_room_id(self) -> str:
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            return ''.join(secrets.choice(alphabet) for _ in range(8))
    
    print("✅ MeetingSchedulerService class defined successfully")
    
    print("6. Testing class instantiation...")
    service = MeetingSchedulerService()
    room_id = service._generate_meeting_room_id()
    print(f"✅ Service instantiated successfully, generated room ID: {room_id}")
    
    print("\n🎉 All imports and class definition work correctly!")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    print(f"Traceback: {traceback.format_exc()}")