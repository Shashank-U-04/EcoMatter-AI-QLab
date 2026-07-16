"""Unit tests for the fixed-window rate limiter (disabled at HTTP level in tests)."""
from app.rate_limit import FixedWindowLimiter


def test_allows_up_to_limit_then_blocks():
    limiter = FixedWindowLimiter()
    assert all(limiter.allow("1.2.3.4:auth", 5) for _ in range(5))
    assert limiter.allow("1.2.3.4:auth", 5) is False


def test_keys_are_isolated():
    limiter = FixedWindowLimiter()
    for _ in range(5):
        limiter.allow("1.2.3.4:auth", 5)
    assert limiter.allow("1.2.3.4:auth", 5) is False
    assert limiter.allow("5.6.7.8:auth", 5) is True
    assert limiter.allow("1.2.3.4:general", 100) is True
