import pytest

from app.services.logistics.truck_fsm import IllegalTransitionError, transition


def test_normal_cycle():
    s = "idle"
    for nxt in ("loading", "en_route", "unloading", "idle"):
        s = transition(s, nxt)
    assert s == "idle"


def test_illegal_transition():
    with pytest.raises(IllegalTransitionError):
        transition("idle", "unloading")
