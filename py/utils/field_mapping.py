"""Field mapping utilities between PACE and SDR conventions.

PACE uses "Men"/"Women" in events.gender.
SDR uses "male"/"female" internally for all computations.
"""

# ── Gender mapping ───────────────────────────────────────────────

_PACE_TO_SDR_GENDER: dict[str, str] = {
    "Men": "male",
    "Women": "female",
}

_SDR_TO_PACE_GENDER: dict[str, str] = {v: k for k, v in _PACE_TO_SDR_GENDER.items()}


def pace_gender_to_sdr(pace_gender: str) -> str:
    """Convert PACE gender ('Men'/'Women') to SDR sex ('male'/'female').

    Raises:
        ValueError: If the input is not a recognized PACE gender value.
    """
    result = _PACE_TO_SDR_GENDER.get(pace_gender)
    if result is None:
        raise ValueError(f"Unknown PACE gender value: {pace_gender!r} (expected 'Men' or 'Women')")
    return result


def sdr_gender_to_pace(sdr_sex: str) -> str:
    """Convert SDR sex ('male'/'female') to PACE gender ('Men'/'Women').

    Raises:
        ValueError: If the input is not a recognized SDR sex value.
    """
    result = _SDR_TO_PACE_GENDER.get(sdr_sex)
    if result is None:
        raise ValueError(f"Unknown SDR sex value: {sdr_sex!r} (expected 'male' or 'female')")
    return result


# ── Event distance mapping ───────────────────────────────────────

# Events that need conversion flagging when coming from PACE
# PACE events.distance stores the raw distance text (e.g., "5000m", "Mile")
# SDR canonical events use the values from constants/events.py

_PACE_DISTANCE_TO_CANONICAL: dict[str, str] = {
    "800m": "800m",
    "800": "800m",
    "1500m": "1500m",
    "1500": "1500m",
    "Mile": "1500m",
    "1 Mile": "1500m",
    "mile": "1500m",
    "3000m": "3000m",
    "3000": "3000m",
    "3000m Steeplechase": "3000m_steeple",
    "3000m SC": "3000m_steeple",
    "3000m_steeple": "3000m_steeple",
    "5000m": "5000m",
    "5000": "5000m",
    "5K": "5000m",
    "10000m": "10000m",
    "10000": "10000m",
    "10K": "10000m",
    "10,000m": "10000m",
}

# Events requiring time conversion (mile → 1500m equivalent)
EVENTS_REQUIRING_CONVERSION = frozenset({"Mile", "1 Mile", "mile"})


def pace_distance_to_canonical(distance: str) -> str | None:
    """Map a PACE distance string to SDR canonical event name.

    Returns:
        Canonical event name, or None if the distance is not an SDR-tracked event.
    """
    return _PACE_DISTANCE_TO_CANONICAL.get(distance.strip())


def needs_event_conversion(distance: str) -> bool:
    """Check if a PACE distance requires time conversion (e.g., Mile → 1500m)."""
    return distance.strip() in EVENTS_REQUIRING_CONVERSION
