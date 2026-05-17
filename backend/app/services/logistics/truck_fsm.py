"""Конечный автомат статусов самосвала.

Допустимые переходы:

    idle ──► loading ──► en_route ──► waiting ──► unloading ──► idle
       │                       │                                  │
       └──► maintenance ◄──────┘                                  │
       ◄──────────────────────────────────────────────────────────┘
"""

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "idle": {"loading", "maintenance"},
    "loading": {"en_route"},
    "en_route": {"waiting", "unloading", "maintenance"},
    "waiting": {"unloading", "en_route"},
    "unloading": {"idle"},
    "maintenance": {"idle"},
}


class IllegalTransitionError(RuntimeError):
    pass


def transition(current: str, target: str) -> str:
    if target not in ALLOWED_TRANSITIONS.get(current, set()):
        raise IllegalTransitionError(f"{current} → {target} запрещён")
    return target
