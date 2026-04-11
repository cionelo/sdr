"""Tests for time conversion utilities."""
from sdr.py.utils.time_convert import time_str_to_seconds, seconds_to_time_str, ceil_hundredths


def test_time_str_to_seconds_minutes():
    assert time_str_to_seconds("14:30.25") == 870.25


def test_time_str_to_seconds_sub_minute():
    assert time_str_to_seconds("1:52.44") == 112.44


def test_seconds_to_time_str():
    assert seconds_to_time_str(870.25) == "14:30.25"


def test_ceil_hundredths():
    assert ceil_hundredths(212.6834) == 212.69
