"""Supabase client for SDR pipeline.

Usage:
    from sdr.py.db import get_client
    sb = get_client()
    rows = sb.table("results").select("*").limit(10).execute()
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env from sdr/py/ directory
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

_client: Client | None = None


def get_client() -> Client:
    """Return a singleton Supabase client.

    Reads SUPABASE_URL and SUPABASE_KEY from environment.
    Falls back to SUPABASE_SERVICE_KEY if SUPABASE_KEY is not set.
    """
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        print("[err] Set SUPABASE_URL and SUPABASE_KEY in sdr/py/.env")
        sys.exit(1)

    _client = create_client(url, key)
    return _client
