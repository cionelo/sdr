"""Tests for Pass 2 — Performance Normalization.

Covers:
- Sea-level pass-through (no adjustment)
- Altitude adjustment (subtracts time × pct)
- Mile → 1500m event conversion (× 0.9259, ceil to 0.01s)
- Mile at altitude (altitude first, then convert)
- Unknown events (8K, DMR) passed through unchanged
- Splits normalized when altitude present
"""
import pytest
from datetime import date

from sdr.py.models.race import RawRace
from sdr.py.passes.pass2_normalize import normalize_race, MILE_TO_1500M


def make_raw(
    event: str = "5000m",
    time_s: float = 900.0,
    splits: tuple = (),
    venue_id: str | None = None,
) -> RawRace:
    return RawRace(
        result_id="result-1",
        athlete_id="athlete-1",
        event=event,
        finish_time_sec=time_s,
        splits_sec=splits,
        race_date=date(2026, 2, 28),
        meet_id="meet-1",
        venue_id=venue_id,
    )


# ── Sea-level pass-through ────────────────────────────────────────────────────

class TestSeaLevel:
    def test_normalized_time_equals_raw_when_no_adjustments(self):
        race = make_raw("5000m", 900.0)
        result = normalize_race(race, venue_adjustments={})
        assert result.normalized_time_sec == 900.0

    def test_altitude_adjusted_false_when_no_venue(self):
        race = make_raw("5000m", 900.0)
        result = normalize_race(race, venue_adjustments={})
        assert result.altitude_adjusted is False
        assert result.altitude_adjustment_pct is None

    def test_raw_time_preserved(self):
        race = make_raw("800m", 110.5)
        result = normalize_race(race, venue_adjustments={})
        assert result.raw_time_sec == 110.5

    def test_canonical_event_mapped_from_raw(self):
        race = make_raw("5K", 1000.0)
        result = normalize_race(race, venue_adjustments={})
        assert result.canonical_event == "5000m"

    def test_raw_event_preserved(self):
        race = make_raw("5K", 1000.0)
        result = normalize_race(race, venue_adjustments={})
        assert result.raw_event == "5K"


# ── Altitude adjustment ───────────────────────────────────────────────────────

class TestAltitudeAdjustment:
    def test_normalized_time_is_less_than_raw(self):
        race = make_raw("5000m", 900.0, venue_id="adams-state")
        result = normalize_race(race, venue_adjustments={"5000m": 0.042})
        assert result.normalized_time_sec < 900.0

    def test_altitude_formula_applied_correctly(self):
        # adjusted = raw × (1 - pct)
        race = make_raw("5000m", 900.0, venue_id="adams-state")
        result = normalize_race(race, venue_adjustments={"5000m": 0.042})
        assert result.normalized_time_sec == pytest.approx(900.0 * (1 - 0.042))

    def test_altitude_adjusted_flag_set(self):
        race = make_raw("800m", 110.0, venue_id="albuquerque")
        result = normalize_race(race, venue_adjustments={"800m": 0.00558})
        assert result.altitude_adjusted is True

    def test_altitude_adjustment_pct_stored(self):
        race = make_raw("800m", 110.0, venue_id="albuquerque")
        result = normalize_race(race, venue_adjustments={"800m": 0.00558})
        assert result.altitude_adjustment_pct == pytest.approx(0.00558)

    def test_venue_id_passed_through(self):
        race = make_raw("5000m", 900.0, venue_id="adams-state")
        result = normalize_race(race, venue_adjustments={"5000m": 0.042})
        assert result.venue_id == "adams-state"

    def test_zero_adjustment_no_altitude_flag(self):
        # Event not in venue_adjustments dict → no adjustment
        race = make_raw("5000m", 900.0, venue_id="sea-level")
        result = normalize_race(race, venue_adjustments={})
        assert result.altitude_adjusted is False
        assert result.normalized_time_sec == 900.0

    def test_abq_800m_verified_data_point(self):
        # NCAA published: 107.00s at ABQ (4958 ft) → 106.40s (−0.558%)
        race = make_raw("800m", 107.0, venue_id="albuquerque")
        result = normalize_race(race, venue_adjustments={"800m": 0.00558})
        # Expected: 107.0 × (1 − 0.00558) ≈ 106.40
        assert result.normalized_time_sec == pytest.approx(106.403, abs=0.01)


# ── Mile → 1500m conversion ───────────────────────────────────────────────────

class TestMileConversion:
    def test_canonical_event_is_1500m(self):
        race = make_raw("Mile", 229.71)
        result = normalize_race(race, venue_adjustments={})
        assert result.canonical_event == "1500m"

    def test_event_converted_flag_set(self):
        race = make_raw("Mile", 229.71)
        result = normalize_race(race, venue_adjustments={})
        assert result.event_converted is True

    def test_conversion_factor_is_ncaa_standard(self):
        race = make_raw("Mile", 229.71)
        result = normalize_race(race, venue_adjustments={})
        assert result.event_conversion_factor == pytest.approx(MILE_TO_1500M)

    def test_ncaa_spec_example(self):
        # Spec: 229.71s Mile → 212.69s (ceil of 212.6834...)
        race = make_raw("Mile", 229.71)
        result = normalize_race(race, venue_adjustments={})
        assert result.normalized_time_sec == pytest.approx(212.69, abs=0.005)

    def test_raw_time_preserved_after_conversion(self):
        race = make_raw("Mile", 229.71)
        result = normalize_race(race, venue_adjustments={})
        assert result.raw_time_sec == 229.71
        assert result.raw_event == "Mile"

    def test_ceiling_applied_to_hundredths(self):
        # 229.71 × 0.9259 = 212.6834... → 212.69 (not 212.68)
        race = make_raw("Mile", 229.71)
        result = normalize_race(race, venue_adjustments={})
        # Must be >= raw × factor (ceiling, not truncation)
        raw_converted = 229.71 * MILE_TO_1500M
        assert result.normalized_time_sec >= raw_converted

    def test_event_converted_false_for_non_mile(self):
        race = make_raw("5000m", 900.0)
        result = normalize_race(race, venue_adjustments={})
        assert result.event_converted is False
        assert result.event_conversion_factor is None


# ── Mile at altitude ──────────────────────────────────────────────────────────

class TestMileAtAltitude:
    def test_altitude_applied_before_conversion(self):
        # Order: (1) altitude adjust using "mile" key, (2) convert to 1500m
        adj_pct = 0.042
        mile_time = 240.0
        from math import ceil
        expected = ceil((mile_time * (1 - adj_pct)) * MILE_TO_1500M * 100) / 100
        race = make_raw("Mile", mile_time, venue_id="adams-state")
        result = normalize_race(race, venue_adjustments={"mile": adj_pct})
        assert result.normalized_time_sec == pytest.approx(expected, abs=0.005)

    def test_both_flags_set_at_altitude_mile(self):
        race = make_raw("Mile", 240.0, venue_id="adams-state")
        result = normalize_race(race, venue_adjustments={"mile": 0.042})
        assert result.altitude_adjusted is True
        assert result.event_converted is True


# ── Unknown events ────────────────────────────────────────────────────────────

class TestUnknownEvent:
    def test_8k_passes_through_unchanged(self):
        race = make_raw("8K", 1500.0)
        result = normalize_race(race, venue_adjustments={})
        assert result.normalized_time_sec == 1500.0
        assert result.canonical_event == "8K"
        assert result.altitude_adjusted is False
        assert result.event_converted is False

    def test_dmr_passes_through_unchanged(self):
        race = make_raw("DMR", 600.0)
        result = normalize_race(race, venue_adjustments={})
        assert result.normalized_time_sec == 600.0


# ── Splits normalization ──────────────────────────────────────────────────────

class TestSplitsNormalization:
    def test_splits_adjusted_at_altitude(self):
        race = make_raw("800m", 110.0, splits=(58.0, 110.0), venue_id="albuquerque")
        result = normalize_race(race, venue_adjustments={"800m": 0.00558})
        assert result.splits_normalized is not None
        assert result.splits_normalized[0] == pytest.approx(58.0 * (1 - 0.00558))
        assert result.splits_normalized[1] == pytest.approx(110.0 * (1 - 0.00558))

    def test_splits_none_when_no_altitude(self):
        race = make_raw("800m", 110.0, splits=(58.0, 110.0))
        result = normalize_race(race, venue_adjustments={})
        assert result.splits_normalized is None

    def test_empty_splits_stays_empty(self):
        race = make_raw("5000m", 900.0, splits=(), venue_id="adams-state")
        result = normalize_race(race, venue_adjustments={"5000m": 0.042})
        assert result.splits_normalized is None


# ── Batch ─────────────────────────────────────────────────────────────────────

class TestNormalizeBatch:
    def test_batch_maps_over_races(self):
        from sdr.py.passes.pass2_normalize import normalize_batch
        races = [make_raw("800m", 110.0), make_raw("5000m", 900.0)]
        results = normalize_batch(races, venue_adjustments={})
        assert len(results) == 2
        assert results[0].canonical_event == "800m"
        assert results[1].canonical_event == "5000m"
