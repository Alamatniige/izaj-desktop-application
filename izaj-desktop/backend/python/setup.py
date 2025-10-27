#!/usr/bin/env python3
"""
Setup script for Python Analytics Service
Run this script to install dependencies and verify setup
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def check_env_file():
    """Check if .env file exists in parent directory"""
    env_path = Path("../../.env")
    if not env_path.exists():
        print("❌ .env file not found in parent directory")
        print("Please ensure you have a .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY")
        return False
    print("✅ .env file found")
    return True

def main():
    """Main setup function"""
    print("🚀 Setting up Python Analytics Service...")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Check .env file
    if not check_env_file():
        sys.exit(1)
    
    # Install dependencies
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("💡 Try running: pip install --upgrade pip")
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Add PYTHON_SERVICE_URL=http://localhost:8002 to your .env file")
    print("2. Run: npm install (in backend/nodejs) to install concurrently")
    print("3. Run: npm run dev (in backend/nodejs) to start both services")
    print("4. Visit: http://localhost:8002/docs to see Python API documentation")

if __name__ == "__main__":
    main()
