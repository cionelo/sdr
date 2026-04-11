"""Event definitions and conversion factors for PACE SDR."""

# Canonical event list (outdoor, v1 scope)
EVENTS = ("800m", "1500m", "mile", "3000m", "3000m_steeple", "5000m", "10000m")

# Canonical distance mapping (all computation uses these)
CANONICAL_DISTANCES = {
    "800m": "800m",
    "1500m": "1500m",
    "mile": "1500m",       # Mile converts to 1500m for scoring
    "3000m": "3000m",
    "3000m_steeple": "3000m_steeple",
    "5000m": "5000m",
    "10000m": "10000m",
}

# NCAA event conversion factors
EVENT_CONVERSION_FACTORS = {
    ("mile", "1500m"): 0.9259,
    ("1500m", "mile"): 1 / 0.9259,
}

# Approximate aerobic fraction per event (for altitude model interpolation)
AEROBIC_FRACTION = {
    "800m": 0.60,
    "1500m": 0.80,
    "mile": 0.82,
    "3000m": 0.90,
    "3000m_steeple": 0.90,
    "5000m": 0.95,
    "10000m": 0.98,
}

# Lap count per event (400m laps)
LAPS_PER_EVENT = {
    "800m": 2,
    "1500m": 3.75,
    "mile": 4.0225,
    "3000m": 7.5,
    "3000m_steeple": 7.5,
    "5000m": 12.5,
    "10000m": 25,
}
