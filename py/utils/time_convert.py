"""Time conversion utilities for PACE SDR."""
import math


def time_str_to_seconds(time_str: str) -> float:
    """Convert a time string like '14:30.25' or '1:52.44' to seconds."""
    parts = time_str.strip().split(":")
    if len(parts) == 2:
        minutes, sec_str = parts
        return int(minutes) * 60 + float(sec_str)
    if len(parts) == 3:
        hours, minutes, sec_str = parts
        return int(hours) * 3600 + int(minutes) * 60 + float(sec_str)
    return float(parts[0])


def seconds_to_time_str(seconds: float) -> str:
    """Convert seconds to a formatted time string like '14:30.25'."""
    if seconds < 0:
        raise ValueError(f"Negative time: {seconds}")
    minutes = int(seconds // 60)
    remaining = seconds - minutes * 60
    if minutes >= 60:
        hours = minutes // 60
        minutes = minutes % 60
        return f"{hours}:{minutes:02d}:{remaining:05.2f}"
    return f"{minutes}:{remaining:05.2f}"


def ceil_hundredths(seconds: float) -> float:
    """Round up to nearest 0.01s (NCAA convention)."""
    return math.ceil(seconds * 100) / 100
