#!/usr/bin/env python3
"""
AI Meeting System Verification Script

Verifies all components of the AI meeting system are properly integrated:
- Backend services and their dependencies
- Database schema and migrations
- API endpoints and routing
- Frontend-backend integration points
- Configuration and environment setup
"""

import sys
import os
import importlib
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def verify_imports():
    """Verify all required modules can be imported"""
    print("🔍 Verifying Python imports...")
    
    required_modules = [
        "app.services.ai_meeting_orchestrator",
        "app.services.meeting_scheduler", 
        "app.services.gemini",
        "app.services.email_service",
        "app.services.question_service",
        "app.routers.scheduled_meetings",
        "app.routers.leads",
        "app.routers.question_sets",
        "app.models.enhanced_schemas",
        "app.core.config",
        "app.signaling"
    ]
    
    failed_imports = []
    
    for module in required_modules:
        try:
            importlib.import_module(module)
            print(f"  ✅ {module}")
        except ImportError as e:
            print(f"  ❌ {module} - {str(e)}")
            failed_imports.append(module)
    
    return len(failed_imports) == 0

def verify_service_methods():
    """Verify all required service methods exist"""
    print("\n🔍 Verifying service methods...")
    
    try:
        from app.services.ai_meeting_orchestrator import ai_meeting_orchestrator
        from app.services.meeting_scheduler import meeting_scheduler_service
        from app.services.gemini import gemini_service
        from app.services.email_service import email_service
        from app.services.question_service import question_service
        
        # Check AI Meeting Orchestrator methods
        required_orchestrator_methods = [
            'schedule_ai_join',
            'join_scheduled_meeting',
            'process_user_message',
            'end_meeting_gracefully'
        ]
        
        for method in required_orchestrator_methods:
            if hasattr(ai_meeting_orchestrator, method):
                print(f"  ✅ ai_meeting_orchestrator.{method}")
            else:
                print(f"  ❌ ai_meeting_orchestrator.{method} - Missing")
                return False
        
        # Check Meeting Scheduler methods
        required_scheduler_methods = [
            'create_scheduled_meeting',
            'get_scheduled_meeting',
            'join_meeting_as_ai',
            'get_upcoming_meetings'
        ]
        
        for method in required_scheduler_methods:
            if hasattr(meeting_scheduler_service, method):
                print(f"  ✅ meeting_scheduler_service.{method}")
            else:
                print(f"  ❌ meeting_scheduler_service.{method} - Missing")
                return False
        
        # Check Gemini Service methods
        required_gemini_methods = [
            'generate_questions_for_lead',
            'analyze_conversation',
            'generate_meeting_transcript'
        ]
        
        for method in required_gemini_methods:
            if hasattr(gemini_service, method):
                print(f"  ✅ gemini_service.{method}")
            else:
                print(f"  ❌ gemini_service.{method} - Missing")
                return False
        
        # Check Email Service methods
        required_email_methods = [
            'send_meeting_summary',
            'send_follow_up_questions'
        ]
        
        for method in required_email_methods:
            if hasattr(email_service, method):
                print(f"  ✅ email_service.{method}")
            else:
                print(f"  ❌ email_service.{method} - Missing")
                return False
        
        # Check Question Service methods
        required_question_methods = [
            'generate_questions_for_lead',
            'get_question_set',
            'create_default_question_set'
        ]
        
        for method in required_question_methods:
            if hasattr(question_service, method):
                print(f"  ✅ question_service.{method}")
            else:
                print(f"  ❌ question_service.{method} - Missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error verifying service methods: {str(e)}")
        return False

def verify_database_schema():
    """Verify database schema requirements"""
    print("\n🔍 Verifying database schema...")
    
    # Check if migration file exists
    migration_file = Path("../database/migrations/008_complete_ai_meeting_system.sql")
    if migration_file.exists():
        print("  ✅ Migration file exists")
        
        # Check migration content
        with open(migration_file, 'r') as f:
            content = f.read()
            
        required_tables = [
            'meeting_analyses',
            'conversation_events', 
            'email_notifications'
        ]
        
        for table in required_tables:
            if f"CREATE TABLE IF NOT EXISTS {table}" in content:
                print(f"  ✅ {table} table creation")
            else:
                print(f"  ❌ {table} table creation - Missing")
                return False
        
        required_columns = [
            'budget_notes',
            'timeline_notes',
            'decision_maker_notes',
            'last_contact',
            'score'
        ]
        
        for column in required_columns:
            if f"ADD COLUMN IF NOT EXISTS {column}" in content:
                print(f"  ✅ leads.{column} column")
            else:
                print(f"  ❌ leads.{column} column - Missing")
                return False
        
        return True
    else:
        print("  ❌ Migration file missing")
        return False

def verify_api_endpoints():
    """Verify API endpoint definitions"""
    print("\n🔍 Verifying API endpoints...")
    
    try:
        from app.routers import scheduled_meetings, leads, question_sets
        
        # Check scheduled meetings endpoints
        scheduled_endpoints = [
            'create_scheduled_meeting',
            'get_scheduled_meetings', 
            'get_scheduled_meeting',
            'get_meeting_analysis',
            'get_meeting_transcript'
        ]
        
        for endpoint in scheduled_endpoints:
            if hasattr(scheduled_meetings, endpoint):
                print(f"  ✅ /scheduled-meetings/ - {endpoint}")
            else:
                print(f"  ❌ /scheduled-meetings/ - {endpoint} - Missing")
                return False
        
        # Check leads endpoints
        leads_endpoints = [
            'create_lead',
            'get_leads',
            'get_lead'
        ]
        
        for endpoint in leads_endpoints:
            if hasattr(leads, endpoint):
                print(f"  ✅ /leads/ - {endpoint}")
            else:
                print(f"  ❌ /leads/ - {endpoint} - Missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error verifying API endpoints: {str(e)}")
        return False

def verify_configuration():
    """Verify configuration setup"""
    print("\n🔍 Verifying configuration...")
    
    try:
        from app.core.config import settings
        
        required_settings = [
            'SUPABASE_URL',
            'SUPABASE_SERVICE_ROLE_KEY',
            'FRONTEND_URL',
            'BACKEND_URL'
        ]
        
        for setting in required_settings:
            if hasattr(settings, setting):
                print(f"  ✅ {setting}")
            else:
                print(f"  ❌ {setting} - Missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error verifying configuration: {str(e)}")
        return False

def verify_frontend_files():
    """Verify frontend files exist"""
    print("\n🔍 Verifying frontend files...")
    
    required_files = [
        "components/meetings/MeetingScheduler.tsx",
        "app/(meet)/meeting/[id]/page.tsx",
        "lib/webrtc/client.ts",
        "lib/signaling.ts",
        "hooks/useUser.ts",
        "hooks/use-leads.ts",
        "types/meetings.ts"
    ]
    
    missing_files = []
    
    for file_path in required_files:
        full_path = Path("..") / file_path
        if full_path.exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path} - Missing")
            missing_files.append(file_path)
    
    return len(missing_files) == 0

def main():
    """Run all verification checks"""
    print("🤖 AI Meeting System Verification")
    print("=" * 50)
    
    checks = [
        ("Python Imports", verify_imports),
        ("Service Methods", verify_service_methods),
        ("Database Schema", verify_database_schema),
        ("API Endpoints", verify_api_endpoints),
        ("Configuration", verify_configuration),
        ("Frontend Files", verify_frontend_files)
    ]
    
    passed_checks = 0
    total_checks = len(checks)
    
    for check_name, check_func in checks:
        try:
            if check_func():
                passed_checks += 1
            else:
                print(f"\n❌ {check_name} verification failed")
        except Exception as e:
            print(f"\n❌ {check_name} verification error: {str(e)}")
    
    print("\n" + "=" * 50)
    print(f"📊 Verification Results: {passed_checks}/{total_checks} checks passed")
    
    if passed_checks == total_checks:
        print("🎉 All verifications passed! The AI meeting system is properly integrated.")
        return 0
    else:
        print("❌ Some verifications failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)