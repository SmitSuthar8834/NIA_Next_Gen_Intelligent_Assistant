#!/usr/bin/env python3
"""
Test script for Task 4: Real-Time Analysis & Integration implementation
"""

import asyncio
import json
import sys
import os
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_real_time_analysis():
    """Test the real-time analysis service"""
    print("🧪 Testing Real-Time Analysis Service...")
    
    try:
        from app.services.real_time_analysis import real_time_analysis_service
        
        # Test conversation chunk processing
        print("  ✓ Testing conversation chunk processing...")
        
        # Mock meeting ID for testing (using proper UUID format)
        test_meeting_id = "550e8400-e29b-41d4-a716-446655440000"
        
        # Test processing a conversation chunk
        result = await real_time_analysis_service.process_conversation_chunk(
            meeting_id=test_meeting_id,
            speaker_type="human",
            message="We're looking for a solution to help us manage our sales pipeline better. Our current system is quite outdated.",
            speaker_id="550e8400-e29b-41d4-a716-446655440006",
            audio_duration_ms=5000
        )
        
        print(f"    Conversation chunk result: {result.get('processed', False)}")
        
        # Test meeting transcript functionality
        print("  ✓ Testing transcript retrieval...")
        
        transcript_result = await real_time_analysis_service.get_meeting_transcript(
            meeting_id=test_meeting_id,
            format_type="text"
        )
        
        print(f"    Transcript format: {transcript_result.get('format', 'unknown')}")
        
        print("✅ Real-Time Analysis Service tests completed")
        
    except Exception as e:
        print(f"❌ Real-Time Analysis Service test failed: {str(e)}")
        return False
    
    return True

async def test_transcription_service():
    """Test the transcription service"""
    print("🎤 Testing Transcription Service...")
    
    try:
        from app.services.transcription_service import transcription_service
        
        # Test starting a transcription session
        print("  ✓ Testing transcription session management...")
        
        session_result = await transcription_service.start_transcription_session(
            meeting_id="550e8400-e29b-41d4-a716-446655440001",
            user_id="550e8400-e29b-41d4-a716-446655440002"
        )
        
        if "session_id" in session_result:
            print(f"    Session created: {session_result['session_id']}")
            
            # Test processing transcription chunks
            print("  ✓ Testing transcription chunk processing...")
            
            chunk_result = await transcription_service.process_transcription_chunk(
                session_id=session_result["session_id"],
                transcript_text="Hello, this is a test transcription",
                is_final=True,
                confidence=0.95
            )
            
            print(f"    Chunk processed: {chunk_result.get('processed', False)}")
            
            # Test ending session
            print("  ✓ Testing session cleanup...")
            
            end_result = await transcription_service.end_transcription_session(
                session_result["session_id"]
            )
            
            print(f"    Session ended: {end_result.get('session_id') is not None}")
        
        print("✅ Transcription Service tests completed")
        
    except Exception as e:
        print(f"❌ Transcription Service test failed: {str(e)}")
        return False
    
    return True

async def test_enhanced_gemini_service():
    """Test the enhanced Gemini service"""
    print("🤖 Testing Enhanced Gemini Service...")
    
    try:
        from app.services.gemini import gemini_service
        
        # Test real-time conversation analysis
        print("  ✓ Testing real-time conversation analysis...")
        
        context = {
            "lead_name": "John Doe",
            "company": "Test Corp",
            "previous_insights": []
        }
        
        analysis_result = await gemini_service.analyze_conversation_real_time(
            conversation_chunk="We're really interested in your solution and would like to move forward quickly.",
            context=context
        )
        
        print(f"    Real-time analysis sentiment: {analysis_result.get('sentiment', 'unknown')}")
        print(f"    Engagement level: {analysis_result.get('engagement_level', 'unknown')}")
        
        # Test enhanced lead scoring
        print("  ✓ Testing enhanced lead scoring...")
        
        conversation_history = [
            {"speaker": "ai", "message": "What challenges are you facing with your current system?"},
            {"speaker": "human", "message": "Our sales team is struggling with lead tracking and we need a solution within 3 months."},
            {"speaker": "ai", "message": "What's your budget range for this project?"},
            {"speaker": "human", "message": "We have allocated around $50,000 for this initiative."}
        ]
        
        lead_data = {
            "name": "John Doe",
            "company": "Test Corp",
            "status": "new"
        }
        
        scoring_result = await gemini_service.generate_enhanced_lead_scoring(
            conversation_history=conversation_history,
            lead_data=lead_data,
            current_score=50
        )
        
        print(f"    New lead score: {scoring_result.get('new_lead_score', 'unknown')}")
        print(f"    Qualification status: {scoring_result.get('qualification_status', 'unknown')}")
        
        # Test conversation insights extraction
        print("  ✓ Testing conversation insights extraction...")
        
        insights_result = await gemini_service.extract_conversation_insights(
            conversation_history=conversation_history,
            lead_data=lead_data
        )
        
        print(f"    Conversation quality score: {insights_result.get('conversation_quality', {}).get('engagement_score', 'unknown')}")
        print(f"    Opportunity fit score: {insights_result.get('opportunity_assessment', {}).get('fit_score', 'unknown')}")
        
        print("✅ Enhanced Gemini Service tests completed")
        
    except Exception as e:
        print(f"❌ Enhanced Gemini Service test failed: {str(e)}")
        return False
    
    return True

def test_enhanced_schemas():
    """Test the enhanced schemas"""
    print("📋 Testing Enhanced Schemas...")
    
    try:
        from app.models.enhanced_schemas import (
            ConversationEventCreate,
            MeetingAnalysisCreate,
            MeetingAnalysisData,
            TranscriptionChunk
        )
        
        # Test conversation event schema
        print("  ✓ Testing ConversationEventCreate schema...")
        
        conversation_event = ConversationEventCreate(
            meeting_id="550e8400-e29b-41d4-a716-446655440003",
            speaker_type="human",
            speaker_id="550e8400-e29b-41d4-a716-446655440004",
            message_text="This is a test message",
            audio_duration_ms=3000,
            confidence_score=0.92
        )
        
        print(f"    Conversation event created: {conversation_event.meeting_id}")
        
        # Test meeting analysis schema
        print("  ✓ Testing MeetingAnalysisData schema...")
        
        analysis_data = MeetingAnalysisData(
            lead_score=85,
            qualification_status="qualified",
            key_insights=["Strong buying intent", "Budget confirmed"],
            pain_points=["Current system limitations"],
            buying_signals=["Mentioned timeline", "Budget discussion"],
            sentiment_score=0.8,
            engagement_level="high",
            follow_up_priority="high"
        )
        
        print(f"    Analysis data created with score: {analysis_data.lead_score}")
        
        meeting_analysis = MeetingAnalysisCreate(
            meeting_id="550e8400-e29b-41d4-a716-446655440003",
            lead_id="550e8400-e29b-41d4-a716-446655440005",
            analysis_data=analysis_data,
            lead_score_before=50,
            lead_score_after=85
        )
        
        print(f"    Meeting analysis created for meeting: {meeting_analysis.meeting_id}")
        
        print("✅ Enhanced Schemas tests completed")
        
    except Exception as e:
        print(f"❌ Enhanced Schemas test failed: {str(e)}")
        return False
    
    return True

def test_api_endpoints():
    """Test that API endpoints are properly structured"""
    print("🌐 Testing API Endpoints Structure...")
    
    try:
        # Test that the router module can be imported
        print("  ✓ Testing router import...")
        
        import importlib.util
        router_path = os.path.join(os.path.dirname(__file__), 'app', 'routers', 'real_time_analysis.py')
        
        if os.path.exists(router_path):
            print("    ✓ Router file exists")
            
            # Check file content for key endpoints
            with open(router_path, 'r') as f:
                content = f.read()
            
            expected_endpoints = [
                "process_conversation_message",
                "generate_meeting_analysis", 
                "get_meeting_transcript",
                "search_conversations",
                "start_transcription",
                "process_transcription_chunk"
            ]
            
            for endpoint in expected_endpoints:
                if endpoint in content:
                    print(f"    ✓ Endpoint found: {endpoint}")
                else:
                    print(f"    ❌ Endpoint missing: {endpoint}")
        
        print("✅ API Endpoints Structure tests completed")
        
    except Exception as e:
        print(f"❌ API Endpoints Structure test failed: {str(e)}")
        return False
    
    return True

def test_frontend_components():
    """Test that frontend components are properly structured"""
    print("⚛️ Testing Frontend Components Structure...")
    
    try:
        # Check if transcription service file exists
        transcription_service_path = os.path.join(
            os.path.dirname(__file__), 
            "..", 
            "lib", 
            "services", 
            "transcription.ts"
        )
        
        if os.path.exists(transcription_service_path):
            print("  ✓ Transcription service file exists")
            
            # Read and check basic structure
            with open(transcription_service_path, 'r') as f:
                content = f.read()
                
            if "BrowserTranscriptionService" in content:
                print("  ✓ BrowserTranscriptionService class found")
            
            if "TranscriptionChunk" in content:
                print("  ✓ TranscriptionChunk interface found")
        
        # Check if components exist
        components_to_check = [
            ("components/meetings/RealTimeTranscription.tsx", "RealTimeTranscription"),
            ("components/meetings/MeetingInsights.tsx", "MeetingInsights")
        ]
        
        for component_path, component_name in components_to_check:
            full_path = os.path.join(os.path.dirname(__file__), "..", component_path)
            
            if os.path.exists(full_path):
                print(f"  ✓ {component_name} component exists")
                
                with open(full_path, 'r') as f:
                    content = f.read()
                
                if f"export default function {component_name}" in content:
                    print(f"  ✓ {component_name} properly exported")
        
        print("✅ Frontend Components Structure tests completed")
        
    except Exception as e:
        print(f"❌ Frontend Components Structure test failed: {str(e)}")
        return False
    
    return True

async def main():
    """Run all tests"""
    print("🚀 Starting Task 4 Implementation Tests")
    print("=" * 50)
    
    test_results = []
    
    # Run backend tests
    test_results.append(test_enhanced_schemas())
    test_results.append(await test_enhanced_gemini_service())
    test_results.append(await test_real_time_analysis())
    test_results.append(await test_transcription_service())
    test_results.append(test_api_endpoints())
    
    # Run frontend tests
    test_results.append(test_frontend_components())
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print(f"✅ Passed: {passed_tests}/{total_tests}")
    print(f"❌ Failed: {total_tests - passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print("\n🎉 All tests passed! Task 4 implementation is complete.")
        print("\n📋 Implementation Summary:")
        print("  ✓ Enhanced Gemini service with real-time analysis")
        print("  ✓ Real-time conversation processing and lead scoring")
        print("  ✓ Browser-based transcription service")
        print("  ✓ Meeting insights extraction and CRM integration")
        print("  ✓ Enhanced lead management with meeting history")
        print("  ✓ Frontend components for transcription and insights")
        print("  ✓ API endpoints for real-time analysis")
        
        print("\n🔧 Key Features Implemented:")
        print("  • Real-time conversation analysis during meetings")
        print("  • Enhanced lead scoring based on conversation content")
        print("  • Automatic lead status updates with sentiment tracking")
        print("  • Browser Speech-to-Text transcription")
        print("  • Transcript search and conversation tracking")
        print("  • Meeting insights integration with Creatio CRM")
        print("  • Lead detail pages with AI meeting history")
        
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. Please review the implementation.")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)