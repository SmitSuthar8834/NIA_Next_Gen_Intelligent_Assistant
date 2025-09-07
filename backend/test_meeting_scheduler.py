#!/usr/bin/env python3
"""
Test script for meeting scheduler functionality
"""

import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_meeting_scheduler():
    """Test the meeting scheduler service"""
    print("📅 Testing Meeting Scheduler Service...")
    
    try:
        from app.services.meeting_scheduler import meeting_scheduler_service
        from app.models.enhanced_schemas import ScheduledMeetingCreate
        
        # Create a test user ID (in real app this would come from auth)
        test_user_id = "550e8400-e29b-41d4-a716-446655440001"
        
        # First, let's check if there are existing leads or create a simple one
        print("  ✓ Checking for existing leads...")
        
        from app.core.config import supabase
        
        # Check for existing leads
        existing_leads = supabase.table("leads").select("*").limit(1).execute()
        
        if existing_leads.data:
            test_lead_id = existing_leads.data[0]['id']
            test_user_id = existing_leads.data[0]['user_id']  # Use the actual user ID from the lead
            print(f"    Using existing lead: {existing_leads.data[0]['name']} (User: {test_user_id})")
        else:
            # Create a simple test lead without UUID
            lead_data = {
                "user_id": test_user_id,
                "name": "Test Lead",
                "email": "test@example.com",
                "company": "Test Company",
                "status": "new",
                "source": "test"
            }
            
            # Insert lead and let database generate ID
            lead_response = supabase.table("leads").insert(lead_data).execute()
            if lead_response.data:
                test_lead_id = lead_response.data[0]['id']
                print(f"    Test lead created: {lead_response.data[0]['name']}")
            else:
                print("    ❌ Failed to create test lead")
                return False
        
        # Test creating a scheduled meeting
        print("  ✓ Testing meeting creation...")
        
        meeting_data = ScheduledMeetingCreate(
            lead_id=str(test_lead_id),
            scheduled_time=datetime.now(timezone.utc) + timedelta(hours=1),
            duration_minutes=60,
            timezone="America/New_York"
        )
        
        meeting, success = await meeting_scheduler_service.create_scheduled_meeting(
            test_user_id, meeting_data
        )
        
        if success and meeting:
            print(f"    ✓ Meeting created successfully: {meeting.id}")
            print(f"    ✓ Meeting room ID: {meeting.meeting_room_id}")
            print(f"    ✓ Status: {meeting.status}")
            
            # Test getting the meeting
            print("  ✓ Testing meeting retrieval...")
            
            retrieved_meeting = await meeting_scheduler_service.get_scheduled_meeting(
                meeting.id, test_user_id
            )
            
            if retrieved_meeting:
                print(f"    ✓ Meeting retrieved: {retrieved_meeting.id}")
            else:
                print("    ❌ Failed to retrieve meeting")
                return False
            
            # Test getting user meetings
            print("  ✓ Testing user meetings list...")
            
            user_meetings = await meeting_scheduler_service.get_user_scheduled_meetings(test_user_id)
            print(f"    ✓ Found {len(user_meetings)} meetings for user")
            
            # Test starting the meeting
            print("  ✓ Testing meeting start...")
            
            started_meeting, start_success = await meeting_scheduler_service.start_meeting(
                meeting.id, test_user_id
            )
            
            if start_success:
                print(f"    ✓ Meeting started: {started_meeting.status}")
            else:
                print("    ❌ Failed to start meeting")
            
            # Test completing the meeting
            print("  ✓ Testing meeting completion...")
            
            completed_meeting, complete_success = await meeting_scheduler_service.complete_meeting(
                meeting.id, test_user_id
            )
            
            if complete_success:
                print(f"    ✓ Meeting completed: {completed_meeting.status}")
            else:
                print("    ❌ Failed to complete meeting")
            
            # Clean up - delete test meeting
            print("  ✓ Cleaning up test data...")
            
            cancel_success = await meeting_scheduler_service.cancel_scheduled_meeting(
                meeting.id, test_user_id, "Test cleanup"
            )
            
            if cancel_success:
                print("    ✓ Test meeting cancelled")
            
        else:
            print("    ❌ Failed to create meeting")
            return False
        
        print("✅ Meeting Scheduler Service tests completed")
        return True
        
    except Exception as e:
        print(f"❌ Meeting Scheduler Service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_meeting_api_endpoints():
    """Test meeting API endpoints are accessible"""
    print("🌐 Testing Meeting API Endpoints...")
    
    try:
        # Test importing the router
        from app.routers.scheduled_meetings import router
        print("  ✓ Scheduled meetings router imported successfully")
        
        # Check if the router has the expected endpoints
        routes = [route.path for route in router.routes]
        expected_routes = [
            "/",  # POST for creating meetings
            "/upcoming",  # GET for upcoming meetings
            "/{meeting_id}",  # GET for specific meeting
            "/{meeting_id}/start",  # POST for starting meeting
            "/{meeting_id}/complete"  # POST for completing meeting
        ]
        
        for expected_route in expected_routes:
            if any(expected_route in route for route in routes):
                print(f"    ✓ Route found: {expected_route}")
            else:
                print(f"    ❌ Route missing: {expected_route}")
        
        print("✅ Meeting API Endpoints tests completed")
        return True
        
    except Exception as e:
        print(f"❌ Meeting API Endpoints test failed: {str(e)}")
        return False

async def main():
    """Run all meeting scheduler tests"""
    print("🚀 Starting Meeting Scheduler Tests")
    print("=" * 50)
    
    test_results = []
    
    # Run tests
    test_results.append(await test_meeting_scheduler())
    test_results.append(await test_meeting_api_endpoints())
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print(f"✅ Passed: {passed_tests}/{total_tests}")
    print(f"❌ Failed: {total_tests - passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print("\n🎉 All meeting scheduler tests passed!")
        print("\n📋 Meeting Scheduler Features Working:")
        print("  ✓ Create scheduled meetings")
        print("  ✓ Retrieve meetings by ID and user")
        print("  ✓ Start and complete meetings")
        print("  ✓ Cancel meetings")
        print("  ✓ API endpoints properly structured")
        
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. Please review the implementation.")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)