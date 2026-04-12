"""Tests for field mapping utilities (PACE ↔ SDR conventions)."""
import pytest

from sdr.py.utils.field_mapping import (
    pace_gender_to_sdr,
    sdr_gender_to_pace,
    pace_distance_to_canonical,
    needs_event_conversion,
)


# ── Gender mapping ───────────────────────────────────────────────


@pytest.mark.unit
def test_men_to_male():
    assert pace_gender_to_sdr("Men") == "male"


@pytest.mark.unit
def test_women_to_female():
    assert pace_gender_to_sdr("Women") == "female"


@pytest.mark.unit
def test_male_to_men():
    assert sdr_gender_to_pace("male") == "Men"


@pytest.mark.unit
def test_female_to_women():
    assert sdr_gender_to_pace("female") == "Women"


@pytest.mark.unit
def test_invalid_pace_gender_raises():
    with pytest.raises(ValueError, match="Unknown PACE gender"):
        pace_gender_to_sdr("Mixed")


@pytest.mark.unit
def test_invalid_sdr_sex_raises():
    with pytest.raises(ValueError, match="Unknown SDR sex"):
        sdr_gender_to_pace("nonbinary")


# ── Distance mapping ────────────────────────────────────────────


@pytest.mark.unit
def test_standard_distance_passthrough():
    assert pace_distance_to_canonical("5000m") == "5000m"
    assert pace_distance_to_canonical("800m") == "800m"
    assert pace_distance_to_canonical("10000m") == "10000m"


@pytest.mark.unit
def test_mile_maps_to_1500m():
    # Mile is converted to 1500m canonical for WA scoring (× 0.9259 factor)
    assert pace_distance_to_canonical("Mile") == "1500m"
    assert pace_distance_to_canonical("1 Mile") == "1500m"


@pytest.mark.unit
def test_steeplechase_variants():
    assert pace_distance_to_canonical("3000m Steeplechase") == "3000m_steeple"
    assert pace_distance_to_canonical("3000m SC") == "3000m_steeple"


@pytest.mark.unit
def test_shorthand_distances():
    assert pace_distance_to_canonical("5K") == "5000m"
    assert pace_distance_to_canonical("10K") == "10000m"


@pytest.mark.unit
def test_10000m_comma_variant():
    # Live data uses "10,000m" with comma
    assert pace_distance_to_canonical("10,000m") == "10000m"

@pytest.mark.unit
def test_unknown_distance_returns_none():
    assert pace_distance_to_canonical("marathon") is None
    assert pace_distance_to_canonical("100m") is None


@pytest.mark.unit
def test_mile_needs_conversion():
    assert needs_event_conversion("Mile") is True
    assert needs_event_conversion("1 Mile") is True


@pytest.mark.unit
def test_standard_events_no_conversion():
    assert needs_event_conversion("5000m") is False
    assert needs_event_conversion("800m") is False
    assert needs_event_conversion("1500m") is False
