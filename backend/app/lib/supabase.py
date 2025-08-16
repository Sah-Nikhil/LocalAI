import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise ValueError("❌ Supabase URL and Key are required. Check your .env file.")

    try:
        client = create_client(url, key)
        return client
    except Exception as e:
        raise RuntimeError(f"❌ Failed to create Supabase client: {e}")
