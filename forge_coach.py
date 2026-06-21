"""Database and request helpers for the Forge Coach API."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any


COACH_HISTORY_LIMIT = 20
COACH_MESSAGE_MAX_CHARS = 12_000
COACH_MESSAGE_ROLES = {"user", "assistant"}


def _validate_user_id(user_id: int) -> int:
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("user_id must be a positive integer")
    return user_id


def _resolve_db(db=None):
    if db is not None:
        return db

    # Keep this module independently testable and avoid importing app.py at
    # module load time.
    from app import get_db

    return get_db()


def _iso_value(value: Any):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _row_to_dict(row) -> dict[str, Any] | None:
    if row is None:
        return None
    return {key: _iso_value(value) for key, value in dict(row).items()}


def _normalize_content(content: Any) -> str:
    if isinstance(content, list):
        parts = []
        for item in content:
            if not isinstance(item, dict) or item.get("type") != "text":
                continue
            text = " ".join(str(item.get("text") or "").split())
            if text:
                parts.append(text)
        return "\n".join(parts).strip()

    return str(content or "").strip()


def normalize_coach_messages(
    messages: Any,
    *,
    limit: int = COACH_HISTORY_LIMIT,
) -> list[dict[str, str]]:
    """Return a bounded Anthropic-compatible user/assistant message list."""

    if not isinstance(messages, list):
        return []

    bounded_limit = max(1, min(int(limit), 100))
    normalized = []
    for message in messages[-bounded_limit:]:
        if not isinstance(message, dict):
            continue

        role = str(message.get("role") or "").strip().lower()
        if role == "coach":
            role = "assistant"
        if role not in COACH_MESSAGE_ROLES:
            continue

        content = _normalize_content(message.get("content", message.get("text", "")))
        if not content:
            continue
        if len(content) > COACH_MESSAGE_MAX_CHARS:
            content = content[:COACH_MESSAGE_MAX_CHARS].rstrip()

        normalized.append({"role": role, "content": content})

    return normalized


def extract_latest_user_message(payload: Any) -> str:
    """Extract the single user message the server is allowed to persist."""

    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object")

    direct_message = _normalize_content(payload.get("message"))
    if direct_message:
        message = direct_message
    else:
        messages = normalize_coach_messages(payload.get("messages"))
        message = next(
            (item["content"] for item in reversed(messages) if item["role"] == "user"),
            "",
        )

    if not message:
        raise ValueError("A user message is required")
    if len(message) > COACH_MESSAGE_MAX_CHARS:
        raise ValueError(
            f"Message cannot exceed {COACH_MESSAGE_MAX_CHARS:,} characters"
        )
    return message


def get_coach_messages(
    user_id: int,
    *,
    limit: int = COACH_HISTORY_LIMIT,
    db=None,
) -> list[dict[str, Any]]:
    """Load the user's most recent Forge messages in chronological order."""

    user_id = _validate_user_id(user_id)
    bounded_limit = max(1, min(int(limit), 100))
    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, role, content, session_date, created_at
            FROM (
                SELECT id, role, content, session_date, created_at
                FROM coach_messages
                WHERE user_id = %s
                  AND role IN ('user', 'assistant')
                ORDER BY created_at DESC, id DESC
                LIMIT %s
            ) AS recent_messages
            ORDER BY created_at ASC, id ASC
            """,
            (user_id, bounded_limit),
        )
        return [_row_to_dict(row) for row in cursor.fetchall()]
    finally:
        cursor.close()


def save_coach_message(
    user_id: int,
    role: str,
    content: str,
    *,
    db=None,
) -> dict[str, Any]:
    """Persist one trusted Forge conversation message."""

    user_id = _validate_user_id(user_id)
    normalized_role = str(role or "").strip().lower()
    if normalized_role == "coach":
        normalized_role = "assistant"
    if normalized_role not in COACH_MESSAGE_ROLES:
        raise ValueError("role must be 'user' or 'assistant'")

    normalized_content = str(content or "").strip()
    if not normalized_content:
        raise ValueError("content cannot be empty")
    if len(normalized_content) > COACH_MESSAGE_MAX_CHARS:
        raise ValueError(
            f"content cannot exceed {COACH_MESSAGE_MAX_CHARS:,} characters"
        )

    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        cursor.execute(
            """
            INSERT INTO coach_messages (user_id, role, content, session_date)
            VALUES (%s, %s, %s, CURRENT_DATE)
            RETURNING id, user_id, role, content, session_date, created_at
            """,
            (user_id, normalized_role, normalized_content),
        )
        return _row_to_dict(cursor.fetchone()) or {}
    finally:
        cursor.close()
