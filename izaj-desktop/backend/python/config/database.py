import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from parent .env file
load_dotenv(dotenv_path='../../.env')

# Get Supabase credentials
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_url or not supabase_key:
    raise ValueError('Missing Supabase environment variables. Please check your .env file.')

# Create Supabase client with service role key (bypasses RLS)
# Use minimal configuration to avoid compatibility issues
supabase: Client = create_client(supabase_url, supabase_key)

def get_supabase_client() -> Client:
    """Get the Supabase client instance"""
    return supabase
