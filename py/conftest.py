"""Pytest configuration for SDR test suite."""
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Ensure PACE root is in sys.path so 'sdr.py.*' imports resolve
_pace_root = str(Path(__file__).resolve().parent.parent.parent)
if _pace_root not in sys.path:
    sys.path.insert(0, _pace_root)


# ── Fixtures ─────────────────────────────────────────────────────


@pytest.fixture
def mock_supabase():
    """Mock Supabase client for unit tests."""
    client = MagicMock()
    client.table.return_value = client
    client.select.return_value = client
    client.insert.return_value = client
    client.upsert.return_value = client
    client.eq.return_value = client
    client.execute.return_value = MagicMock(data=[], count=0)
    return client


@pytest.fixture
def sample_race_data() -> dict:
    """Minimal race record matching Supabase results schema."""
    return {
        "id": "result-001",
        "athlete_id": "athlete-001",
        "event_id": "event-001",
        "time_s": 870.25,
        "race_date": "2026-03-15",
        "meet_id": "meet-001",
    }


@pytest.fixture
def sample_splits() -> list[dict]:
    """Sample 1500m split data (4 laps)."""
    return [
        {"result_id": "result-001", "lap": 1, "split_s": 62.5},
        {"result_id": "result-001", "lap": 2, "split_s": 63.1},
        {"result_id": "result-001", "lap": 3, "split_s": 64.0},
        {"result_id": "result-001", "lap": 4, "split_s": 60.9},
    ]


@pytest.fixture
def sample_athlete_prs() -> dict[str, float]:
    """Normalized PRs for a mid-tier male distance runner."""
    return {
        "800m": 112.0,
        "1500m": 232.0,
        "5000m": 870.0,
    }
