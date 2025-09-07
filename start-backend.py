#!/usr/bin/env python3
"""
Development startup script for NIA Sales Assistant Backend
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    # Change to backend directory
    backend_dir = Path(__file__).parent / "backend"
    os.chdir(backend_dir)
    
    print("🚀 Starting NIA Sales Assistant Backend...")
    print(f"📁 Working directory: {backend_dir}")
    
    # Check if .env exists
    env_file = backend_dir / ".env"
    if not env_file.exists():
        print("❌ .env file not found!")
        print("📝 Please create backend/.env with required configuration:")
        print("""
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-app-client-secret
MICROSOFT_TENANT_ID=common
FRONTEND_URL=http://localhost:3000
        """)
        return 1
    
    # Check if virtual environment should be used
    if "--venv" in sys.argv:
        venv_path = backend_dir / "venv"
        if not venv_path.exists():
            print("🔧 Creating virtual environment...")
            subprocess.run([sys.executable, "-m", "venv", "venv"])
        
        # Activate virtual environment
        if os.name == "nt":  # Windows
            python_path = venv_path / "Scripts" / "python.exe"
            pip_path = venv_path / "Scripts" / "pip.exe"
        else:  # Unix/Linux/macOS
            python_path = venv_path / "bin" / "python"
            pip_path = venv_path / "bin" / "pip"
        
        # Install dependencies
        print("📦 Installing dependencies...")
        subprocess.run([str(pip_path), "install", "-r", "requirements.txt"])
        
        # Run with virtual environment python
        cmd = [str(python_path), "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
    else:
        # Run with system python
        cmd = ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
    
    print("🌐 Starting server at http://localhost:8000")
    print("📖 API docs will be available at http://localhost:8000/docs")
    print("🔄 Auto-reload enabled for development")
    print()
    
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        return 0
    except FileNotFoundError:
        print("❌ uvicorn not found!")
        print("📦 Please install dependencies: pip install -r requirements.txt")
        print("💡 Or use --venv flag to create virtual environment")
        return 1

if __name__ == "__main__":
    sys.exit(main())