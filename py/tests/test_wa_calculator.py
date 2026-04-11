"""Tests for WA points calculator.

Benchmark references (approximate WA points, 2025 coefficients):
  - Men 800m 1:43 (103s) ≈ 1236 pts
  - Men 1500m 3:30 (210s) ≈ 1245 pts
  - Men 5000m 14:00 (840s) ≈ 1000 pts
  - Men 10000m 28:00 (1680s) ≈ 1132 pts
  - Women 800m 2:00 (120s) ≈ 1163 pts
  - Women 5000m 15:00 (900s) ≈ 1164 pts
"""
from sdr.py.utils.wa_calculator import compute_wa_points


# ── Edge cases ────────────────────────────────────────────────────


def test_unknown_event_returns_none():
    """Returns None for events without coefficients."""
    assert compute_wa_points("marathon", "male", 7200.0) is None


def test_unknown_sex_returns_none():
    """Returns None for unrecognised sex key."""
    assert compute_wa_points("800m", "nonbinary", 110.0) is None


def test_zero_time_returns_nonnegative():
    """A degenerate zero-second time should not crash."""
    result = compute_wa_points("800m", "male", 0.0)
    assert result is not None
    assert result >= 0


# ── Men's distance benchmarks ────────────────────────────────────


def test_men_800m_world_class():
    """Men's 800m in 1:43 (103s) should score ~1200-1270 WA points."""
    pts = compute_wa_points("800m", "male", 103.0)
    assert pts is not None
    assert 1200 <= pts <= 1270


def test_men_800m_good_collegiate():
    """Men's 800m in 1:50 (110s) should score ~1000-1060."""
    pts = compute_wa_points("800m", "male", 110.0)
    assert pts is not None
    assert 1000 <= pts <= 1060


def test_men_1500m_sub_3_30():
    """Men's 1500m in 3:30 (210s) should score ~1220-1270."""
    pts = compute_wa_points("1500m", "male", 210.0)
    assert pts is not None
    assert 1220 <= pts <= 1270


def test_men_5000m_14_flat():
    """Men's 5K in 14:00 (840s) should score ~980-1020."""
    pts = compute_wa_points("5000m", "male", 840.0)
    assert pts is not None
    assert 980 <= pts <= 1020


def test_men_5000m_13_flat():
    """Men's 5K in 13:00 (780s) should score ~1190-1230."""
    pts = compute_wa_points("5000m", "male", 780.0)
    assert pts is not None
    assert 1190 <= pts <= 1230


def test_men_10000m_28_flat():
    """Men's 10K in 28:00 (1680s) should score ~1110-1160."""
    pts = compute_wa_points("10000m", "male", 1680.0)
    assert pts is not None
    assert 1110 <= pts <= 1160


def test_men_3000m_steeple_8_30():
    """Men's 3000m SC in 8:30 (510s) should score ~1100-1150."""
    pts = compute_wa_points("3000m_steeple", "male", 510.0)
    assert pts is not None
    assert 1100 <= pts <= 1150


# ── Women's distance benchmarks ──────────────────────────────────


def test_women_800m_2_00():
    """Women's 800m in 2:00 (120s) should score ~1140-1190."""
    pts = compute_wa_points("800m", "female", 120.0)
    assert pts is not None
    assert 1140 <= pts <= 1190


def test_women_1500m_4_05():
    """Women's 1500m in 4:05 (245s) should score ~1140-1190."""
    pts = compute_wa_points("1500m", "female", 245.0)
    assert pts is not None
    assert 1140 <= pts <= 1190


def test_women_5000m_15_flat():
    """Women's 5K in 15:00 (900s) should score ~1140-1190."""
    pts = compute_wa_points("5000m", "female", 900.0)
    assert pts is not None
    assert 1140 <= pts <= 1190


def test_women_10000m_32_flat():
    """Women's 10K in 32:00 (1920s) should score ~1110-1170."""
    pts = compute_wa_points("10000m", "female", 1920.0)
    assert pts is not None
    assert 1110 <= pts <= 1170


# ── Cross-event consistency ──────────────────────────────────────


def test_faster_time_scores_higher():
    """Within the same event, a faster time always scores higher."""
    slow = compute_wa_points("5000m", "male", 900.0)
    fast = compute_wa_points("5000m", "male", 780.0)
    assert slow is not None and fast is not None
    assert fast > slow


def test_all_events_have_both_sexes():
    """Every supported event has both male and female coefficients."""
    from sdr.py.constants.wa_scoring import WA_COEFFICIENTS

    events = {key[0] for key in WA_COEFFICIENTS}
    for event in events:
        assert (event, "male") in WA_COEFFICIENTS, f"Missing male {event}"
        assert (event, "female") in WA_COEFFICIENTS, f"Missing female {event}"
