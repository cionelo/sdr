"""World Athletics points calculator.

Computes WA performance scores using the quadratic model:
    P = a * T² + b * T + c

Where T is finish time in seconds, and a, b, c are event-specific
and sex-specific fitted constants derived from degree-2 polynomial
regression on the official WA scoring tables.
"""
from sdr.py.constants.wa_scoring import WA_COEFFICIENTS


def compute_wa_points(event: str, sex: str, time_sec: float) -> int | None:
    """Compute WA performance score for a given result.

    Args:
        event: Canonical event name (e.g., '1500m', '5000m')
        sex: 'male' or 'female'
        time_sec: Finish time in seconds (normalized)

    Returns:
        Integer WA points score, or None if coefficients not available.
    """
    key = (event, sex)
    coeffs = WA_COEFFICIENTS.get(key)
    if coeffs is None:
        return None

    points = coeffs.a * time_sec * time_sec + coeffs.b * time_sec + coeffs.c
    return max(0, round(points))
