"""Unit tests for security utilities (no DB required)."""

import pytest
from datetime import timedelta

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify():
    plain = "correct-horse-battery-staple"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("wrong-password", hashed)


def test_token_roundtrip():
    token = create_access_token("user-123", expires_delta=timedelta(minutes=15))
    payload = decode_token(token)
    assert payload.get("sub") == "user-123"


def test_expired_token_returns_empty():
    token = create_access_token("user-456", expires_delta=timedelta(seconds=-1))
    payload = decode_token(token)
    assert payload == {}


def test_tampered_token_returns_empty():
    token = create_access_token("user-789")
    tampered = token[:-4] + "xxxx"
    assert decode_token(tampered) == {}
