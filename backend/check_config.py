#!/usr/bin/env python3
"""
Configuration Checker for AI Meeting System

Checks if all required environment variables are properly configured
"""

import os
from pathlib import Path
from dotenv import load_dotenv

def check_config():
    """Check configuration status"""
    print("🔍 AI Meeting System Configuration Checker")
    print("=" * 50)
    
    # Load environment variables
    env_file = Path(".env")
    if env_file.exists():
        load_dotenv()
        print("✅ .env file found and loaded")
    else:
        print("⚠️  .env file not found - using system environment variables")
    
    # Required configurations
    configs = {
        "Database": {
            "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
            "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        },
        "AI Service": {
            "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", "")
        },
        "Email (Optional)": {
            "SMTP_SERVER": os.getenv("SMTP_SERVER", ""),
            "SMTP_USERNAME": os.getenv("SMTP_USERNAME", ""),
            "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD", "")
        },
        "Application": {
            "FRONTEND_URL": os.getenv("FRONTEND_URL", "http://localhost:3000"),
            "BACKEND_URL": os.getenv("BACKEND_URL", "http://localhost:8000")
        }
    }
    
    all_good = True
    
    for category, vars in configs.items():
        print(f"\n📋 {category} Configuration:")
        
        for var_name, var_value in vars.items():
            if not var_value:
                print(f"  ❌ {var_name}: Not set")
                if category != "Email (Optional)":
                    all_good = False
            elif "your-" in var_value or var_value in ["", "not-set"]:
                print(f"  ⚠️  {var_name}: Placeholder value detected")
                if category != "Email (Optional)":
                    all_good = False
            else:
                # Mask sensitive values
                if "KEY" in var_name or "PASSWORD" in var_name:
                    masked_value = var_value[:8] + "..." if len(var_value) > 8 else "***"
                    print(f"  ✅ {var_name}: {masked_value}")
                else:
                    print(f"  ✅ {var_name}: {var_value}")
    
    print("\n" + "=" * 50)
    
    if all_good:
        print("🎉 Configuration looks good! You can run the full test.")
        print("\nNext steps:")
        print("1. Run: python test_complete_ai_meeting_flow.py")
        print("2. Start the backend: uvicorn app.main:app --reload")
    else:
        print("❌ Configuration issues found. Please fix the following:")
        print("\n📝 Setup Instructions:")
        print("1. Copy .env.example to .env: cp .env.example .env")
        print("2. Edit .env with your actual values:")
        print("   - Get Supabase URL and Service Role Key from your Supabase dashboard")
        print("   - Get Gemini API key from Google AI Studio")
        print("   - Configure SMTP for email notifications (optional)")
        print("3. Run this checker again: python check_config.py")
    
    return all_good

if __name__ == "__main__":
    check_config()