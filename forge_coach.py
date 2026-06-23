"""Database and request helpers for the Forge Coach API."""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any


COACH_HISTORY_LIMIT = 20
COACH_MESSAGE_MAX_CHARS = 12_000
COACH_MESSAGE_ROLES = {"user", "assistant"}
FORGE_COMMITMENT_PREFIX = "FORGE_COMMITMENT||"
COMMITMENT_CAPTURE_MAX_TEXT_CHARS = 1_000
CHECKIN_OUTCOMES = {"kept", "missed", "partial"}

FORGE_COMMITMENT_CAPTURE_PROTOCOL = f"""
COMMITMENT CAPTURE PROTOCOL

When the user explicitly commits to a concrete next action with a real deadline,
append exactly one machine-readable line after your normal coach response:

{FORGE_COMMITMENT_PREFIX}{{"commitment_text":"...","commitment_deadline":"YYYY-MM-DDTHH:MM:SS-05:00"}}

Rules:
- Only emit this line after the commitment is specific and the user has accepted it.
- The action must be concrete enough that another person can verify whether it happened.
- The deadline must include date, time, and explicit UTC offset or Z.
- Never emit this line for hedged language such as "I'll try", "maybe", "soon", or "this week" without an exact day and time.
- Do not mention the machine-readable line to the user. The app will hide it.
""".strip()


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


def _normalize_text(value: Any) -> str:
    return " ".join(str(value or "").split())


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


def split_commitment_capture(reply: str) -> tuple[str, dict[str, str] | None]:
    """Remove and parse a hidden Forge commitment capture line from a reply."""

    cleaned_lines: list[str] = []
    captured: dict[str, str] | None = None

    for line in str(reply or "").splitlines():
        stripped = line.strip()
        if not stripped.startswith(FORGE_COMMITMENT_PREFIX):
            cleaned_lines.append(line)
            continue

        if captured is not None:
            continue

        raw_payload = stripped[len(FORGE_COMMITMENT_PREFIX) :].strip()
        try:
            payload = json.loads(raw_payload)
        except json.JSONDecodeError:
            continue
        if not isinstance(payload, dict):
            continue

        commitment_text = _normalize_text(payload.get("commitment_text"))
        commitment_deadline = _normalize_text(payload.get("commitment_deadline"))
        if not commitment_text or not commitment_deadline:
            continue
        if len(commitment_text) > COMMITMENT_CAPTURE_MAX_TEXT_CHARS:
            continue

        try:
            parsed_deadline = datetime.fromisoformat(
                commitment_deadline.replace("Z", "+00:00")
            )
            if parsed_deadline.tzinfo is None or parsed_deadline.utcoffset() is None:
                raise ValueError
        except ValueError:
            continue

        captured = {
            "commitment_text": commitment_text,
            "commitment_deadline": commitment_deadline,
        }

    cleaned_reply = "\n".join(cleaned_lines).strip()
    return cleaned_reply, captured


def persist_commitment_capture(
    user_id: int,
    payload: dict[str, str] | None,
    *,
    db=None,
) -> dict[str, Any] | None:
    """Persist a confirmed Coach commitment against the active mission."""

    if payload is None:
        return None

    user_id = _validate_user_id(user_id)
    commitment_text = _normalize_text(payload.get("commitment_text"))
    commitment_deadline = _normalize_text(payload.get("commitment_deadline"))
    if not commitment_text or not commitment_deadline:
        return None

    try:
        parsed_deadline = datetime.fromisoformat(
            commitment_deadline.replace("Z", "+00:00")
        )
        if parsed_deadline.tzinfo is None or parsed_deadline.utcoffset() is None:
            raise ValueError
    except ValueError:
        return None

    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id
            FROM missions
            WHERE user_id = %s AND status = 'active'
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
            """,
            (user_id,),
        )
        mission = _row_to_dict(cursor.fetchone())
        if not mission or not mission.get("id"):
            return None

        cursor.execute(
            """
            SELECT id, mission_id, text, deadline, status, times_carried,
                   created_at, updated_at
            FROM commitments
            WHERE user_id = %s
              AND mission_id = %s
              AND text = %s
              AND deadline = %s
              AND status = 'pending'
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
            """,
            (user_id, mission["id"], commitment_text, commitment_deadline),
        )
        existing = _row_to_dict(cursor.fetchone())
        if existing:
            return existing

        cursor.execute(
            """
            INSERT INTO commitments (
                user_id, mission_id, text, deadline, status, times_carried
            )
            VALUES (%s, %s, %s, %s, 'pending', 0)
            RETURNING id, mission_id, text, deadline, status, times_carried,
                      created_at, updated_at
            """,
            (user_id, mission["id"], commitment_text, commitment_deadline),
        )
        return _row_to_dict(cursor.fetchone())
    finally:
        cursor.close()


def classify_checkin_reply(message: str) -> str | None:
    """Classify a direct answer to a due commitment check-in."""

    text = f" {_normalize_text(message).lower()} "
    if not text.strip():
        return None

    partial_markers = (
        "partially",
        "partial",
        "some of it",
        "half",
        "almost",
        "not all",
        "unfinished",
        "still working",
        "started",
    )
    missed_markers = (
        "no",
        "nope",
        "didn't",
        "did not",
        "not yet",
        "i missed",
        "missed it",
        "failed",
        "i forgot",
        "couldn't",
        "could not",
    )
    kept_markers = (
        "yes",
        "yeah",
        "yep",
        "done",
        "finished",
        "completed",
        "i did",
        "shipped",
        "sent it",
        "published",
    )

    if any(marker in text for marker in partial_markers):
        return "partial"
    if any(marker in text for marker in missed_markers):
        return "missed"
    if any(marker in text for marker in kept_markers):
        return "kept"
    return None


def detect_avoidance_pattern(message: str) -> str | None:
    """Detect the first lightweight avoidance pattern in user language."""

    text = f" {_normalize_text(message).lower()} "
    checks = (
        (
            "fear disguised as research",
            (
                "research",
                "learn more",
                "look into",
                "looking into",
                "watch more",
                "read more",
                "study more",
            ),
        ),
        (
            "perfectionism as a shield",
            (
                "not ready",
                "perfect",
                "do it right",
                "get it right",
                "good enough",
                "polish",
            ),
        ),
        (
            "overwhelm disguised as complexity",
            (
                "overwhelmed",
                "too much",
                "so much",
                "don't know where to start",
                "dont know where to start",
                "no idea where to start",
            ),
        ),
        (
            "identity confusion",
            (
                "not for me",
                "cut out",
                "keep starting",
                "maybe this isn't",
                "maybe this isnt",
            ),
        ),
        (
            "shame from past failure",
            (
                "tried before",
                "failed before",
                "always do this",
                "i always",
                "never finish",
            ),
        ),
        (
            "social fear",
            (
                "people think",
                "judge",
                "judged",
                "embarrassed",
                "look stupid",
                "make fun",
            ),
        ),
        (
            "soft commitment",
            (
                "i'll try",
                "ill try",
                "maybe",
                "soon",
                "eventually",
                "sometime",
            ),
        ),
    )

    for label, markers in checks:
        if any(marker in text for marker in markers):
            return label
    return None


def record_checkin_outcome(
    user_id: int,
    commitment_id: int,
    outcome: str,
    *,
    db=None,
) -> dict[str, Any] | None:
    """Persist a due commitment check-in answer and update coach memory."""

    user_id = _validate_user_id(user_id)
    try:
        normalized_commitment_id = int(commitment_id)
    except (TypeError, ValueError):
        return None
    normalized_outcome = str(outcome or "").strip().lower()
    if normalized_outcome not in CHECKIN_OUTCOMES:
        return None

    status = "kept" if normalized_outcome == "kept" else "missed"
    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        cursor.execute(
            """
            UPDATE commitments
            SET status = %s,
                times_carried = CASE
                    WHEN %s = 'missed' THEN times_carried + 1
                    ELSE times_carried
                END,
                updated_at = NOW()
            WHERE id = %s AND user_id = %s AND status = 'pending'
            RETURNING id, mission_id, text, deadline, status, times_carried,
                      created_at, updated_at
            """,
            (status, status, normalized_commitment_id, user_id),
        )
        commitment = _row_to_dict(cursor.fetchone())
        if commitment is None:
            return None

        if status == "missed":
            summary = (
                f"Latest check-in: missed commitment “{commitment.get('text')}”. "
                "Investigate what happened before accepting a bigger next step."
            )
        else:
            summary = (
                f"Latest check-in: kept commitment “{commitment.get('text')}”. "
                "Advance to the next concrete commitment."
            )

        cursor.execute(
            """
            INSERT INTO coach_memory (user_id, last_checkin_at, summary, updated_at)
            VALUES (%s, NOW(), %s, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                last_checkin_at = NOW(),
                summary = EXCLUDED.summary,
                updated_at = NOW()
            """,
            (user_id, summary),
        )
        commitment["checkin_outcome"] = normalized_outcome
        return commitment
    finally:
        cursor.close()


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
