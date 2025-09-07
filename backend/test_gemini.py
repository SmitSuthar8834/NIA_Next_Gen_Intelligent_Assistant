#!/usr/bin/env python3
"""
Test script to verify Gemini API connectivity and functionality
"""

import asyncio
import os
import sys
from app.services.gemini import gemini_service

async def test_gemini_api():
    """Test the Gemini API service"""
    
    print("🧪 Testing Gemini API Service...")
    
    # Test data
    test_lead = {
        'name': 'John Smith',
        'company': 'TechCorp',
        'email': 'john@techcorp.com',
        'phone': '+1-555-0123',
        'status': 'new',
        'notes': 'Interested in our software solutions'
    }
    
    try:
        print("\n1️⃣ Testing question generation...")
        questions = await gemini_service.generate_lead_questions(test_lead)
        print(f"✅ Generated {len(questions)} questions:")
        for i, q in enumerate(questions, 1):
            print(f"   {i}. {q}")
        
        print("\n2️⃣ Testing conversation analysis...")
        test_conversation = [
            {"speaker": "ai", "message": "What challenges is your company facing?"},
            {"speaker": "user", "message": "We're struggling with manual processes and need automation"},
            {"speaker": "ai", "message": "What's your budget for a solution?"},
            {"speaker": "user", "message": "We have around $50,000 allocated for this project"}
        ]
        
        analysis = await gemini_service.analyze_conversation(test_conversation, test_lead)
        print(f"✅ Analysis completed:")
        print(f"   Lead Score: {analysis.get('lead_score', 'N/A')}")
        print(f"   Recommended Status: {analysis.get('recommended_status', 'N/A')}")
        print(f"   Key Insights: {len(analysis.get('key_insights', []))} insights")
        print(f"   Summary: {analysis.get('summary', 'N/A')[:100]}...")
        
        print("\n3️⃣ Testing next question generation...")
        remaining_questions = questions[2:]  # Simulate some questions already asked
        next_question = await gemini_service.generate_next_question(
            test_conversation, remaining_questions, test_lead
        )
        print(f"✅ Next question: {next_question}")
        
        print("\n🎉 All tests passed! Gemini API is working correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        print(f"Full error: {traceback.format_exc()}")
        return False

def main():
    """Main test function"""
    print("Gemini API Test Script")
    print("=" * 50)
    
    # Check environment variables
    api_keys = os.getenv("GEMINI_API_KEYS")
    if not api_keys:
        print("❌ GEMINI_API_KEYS environment variable not set")
        sys.exit(1)
    
    print(f"🔑 Found {len(api_keys.split(','))} API keys")
    print(f"🤖 Using model: {os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')}")
    
    # Run async test
    success = asyncio.run(test_gemini_api())
    
    if success:
        print("\n✅ Gemini service is ready for production!")
        sys.exit(0)
    else:
        print("\n❌ Gemini service has issues that need to be resolved")
        sys.exit(1)

if __name__ == "__main__":
    main()