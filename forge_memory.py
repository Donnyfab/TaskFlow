"""Persistent context assembly for the Forge execution coach."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any


FORGE_COACH_SYSTEM_PROMPT = """You are Forge, an execution coach for ambitious builders.

Your job is to turn intention into verifiable output. You remember what the user said they
would do, compare it with what they actually did, identify repeated avoidance patterns, and
lock in the next specific commitment.

Operating rules:
- Be direct, specific, calm, and serious. Never be cruel, sarcastic, or motivational.
- Refer to the user's real mission, commitments, deadlines, outputs, and prior pattern.
- Never invent history or claim the user did something that is absent from the context.
- Treat a kept commitment briefly: acknowledge it, ask what they learned, then advance.
- Treat a missed commitment as evidence to investigate. Ask what actually happened.
- Treat partial completion as incomplete and identify the remaining gap.
- A commitment must name one concrete action and a deadline.
- If an avoided task has been carried three or more times, address it before accepting new work.
- Ask one strong question at a time. Do not overwhelm the user with a checklist.
- Do not use badges, streak language, generic encouragement, or phrases such as "you've got this."
- Every response must make sense for this user on this day. If it could apply to anyone, rewrite it.
"""


def _validate_user_id(user_id: int) -> int:
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("user_id must be a positive integer")
    return user_id


def _resolve_db(db=None):
    if db is not None:
        return db

    # Imported lazily so this module remains independently testable and does not
    # create a circular import while app.py is starting.
    from app import get_db

    return get_db()


def _iso_value(value: Any):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _row_to_dict(row) -> dict[str, Any] | None:
    if row is None:
        return None
    return {key: _iso_value(value) for key, value in dict(row).items()}


def get_user_context(user_id: int, db=None) -> dict[str, Any]:
    """Assemble the complete memory object injected before every Coach call."""

    user_id = _validate_user_id(user_id)
    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, name, username, email, onboarding_complete, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        user = _row_to_dict(cursor.fetchone())
        if user is None:
            raise LookupError(f"User {user_id} does not exist")

        cursor.execute(
            """
            SELECT id, title, description, status, created_at, updated_at
            FROM missions
            WHERE user_id = %s
              AND status = 'active'
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
            """,
            (user_id,),
        )
        mission = _row_to_dict(cursor.fetchone())

        cursor.execute(
            """
            SELECT id, mission_id, text, deadline, status, times_carried,
                   created_at, updated_at
            FROM commitments
            WHERE user_id = %s
            ORDER BY
                CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
                deadline ASC NULLS LAST,
                updated_at DESC,
                id DESC
            LIMIT 12
            """,
            (user_id,),
        )
        commitments = [_row_to_dict(row) for row in cursor.fetchall()]
        active_commitment = next(
            (commitment for commitment in commitments if commitment["status"] == "pending"),
            None,
        )

        cursor.execute(
            """
            SELECT id, mission_id, description, logged_at
            FROM outputs
            WHERE user_id = %s
            ORDER BY logged_at DESC, id DESC
            LIMIT 10
            """,
            (user_id,),
        )
        recent_outputs = [_row_to_dict(row) for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT COUNT(*) AS outputs_this_week
            FROM outputs
            WHERE user_id = %s
              AND logged_at >= date_trunc('week', CURRENT_TIMESTAMP)
            """,
            (user_id,),
        )
        output_count_row = _row_to_dict(cursor.fetchone()) or {}

        cursor.execute(
            """
            SELECT pattern_label, avoided_task, days_active, last_checkin_at,
                   summary, created_at, updated_at
            FROM coach_memory
            WHERE user_id = %s
            """,
            (user_id,),
        )
        memory = _row_to_dict(cursor.fetchone()) or {}
    finally:
        cursor.close()

    missed_count = sum(
        1 for commitment in commitments if commitment.get("status") == "missed"
    )
    return {
        "user": user,
        "mission": mission,
        "active_commitment": active_commitment,
        "commitment_status": (
            active_commitment.get("status") if active_commitment else None
        ),
        "times_missed_row": missed_count,
        "commitments": commitments,
        "pattern_label": memory.get("pattern_label"),
        "avoided_task": memory.get("avoided_task"),
        "days_active": int(memory.get("days_active") or 0),
        "last_checkin_at": memory.get("last_checkin_at"),
        "summary": memory.get("summary"),
        "outputs_this_week": int(output_count_row.get("outputs_this_week") or 0),
        "recent_outputs": recent_outputs,
    }


def build_system_prompt(context: dict[str, Any]) -> str:
    """Inject a Forge memory object into the Coach's master instructions."""

    if not isinstance(context, dict):
        raise TypeError("context must be a dictionary")

    user = context.get("user") or {}
    mission = context.get("mission") or {}
    commitment = context.get("active_commitment") or {}
    outputs = context.get("recent_outputs") or []

    output_lines = [
        f"  - {_iso_value(item.get('logged_at'))}: {item.get('description')}"
        for item in outputs[:5]
        if item.get("description")
    ]
    if not output_lines:
        output_lines = ["  - None logged yet"]

    memory_block = "\n".join(
        [
            "CURRENT USER MEMORY (authoritative; do not invent missing details)",
            f"User: {user.get('name') or user.get('username') or 'Unknown'}",
            f"Onboarding complete: {bool(user.get('onboarding_complete'))}",
            f"Mission: {mission.get('title') or 'None established'}",
            f"Mission description: {mission.get('description') or 'None'}",
            f"Mission status: {mission.get('status') or 'None'}",
            f"Active commitment: {commitment.get('text') or 'None locked'}",
            f"Commitment deadline: {_iso_value(commitment.get('deadline')) or 'None'}",
            f"Commitment status: {commitment.get('status') or 'None'}",
            f"Times carried: {int(commitment.get('times_carried') or 0)}",
            f"Missed commitments in recent context: {int(context.get('times_missed_row') or 0)}",
            f"Pattern label: {context.get('pattern_label') or 'Not identified yet'}",
            f"Avoided task: {context.get('avoided_task') or 'None flagged'}",
            f"Days active: {int(context.get('days_active') or 0)}",
            f"Outputs this week: {int(context.get('outputs_this_week') or 0)}",
            f"Coach summary: {context.get('summary') or 'None yet'}",
            "Recent outputs:",
            *output_lines,
        ]
    )
    return f"{FORGE_COACH_SYSTEM_PROMPT.strip()}\n\n{memory_block}"


def update_pattern(user_id: int, new_label: str, db=None) -> dict[str, Any]:
    """Create or update the user's current behavioral pattern label."""

    user_id = _validate_user_id(user_id)
    normalized_label = " ".join(str(new_label or "").split())
    if not normalized_label:
        raise ValueError("new_label cannot be empty")

    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        cursor.execute(
            """
            INSERT INTO coach_memory (user_id, pattern_label, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                pattern_label = EXCLUDED.pattern_label,
                updated_at = NOW()
            RETURNING user_id, pattern_label, avoided_task, days_active,
                      last_checkin_at, summary, created_at, updated_at
            """,
            (user_id, normalized_label),
        )
        return _row_to_dict(cursor.fetchone()) or {}
    finally:
        cursor.close()


def flag_avoided_task(user_id: int, db=None) -> dict[str, Any] | None:
    """Persist the highest-carried commitment as the user's avoided task."""

    user_id = _validate_user_id(user_id)
    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, mission_id, text, deadline, status, times_carried
            FROM commitments
            WHERE user_id = %s
              AND times_carried >= 3
              AND status IN ('pending', 'missed')
            ORDER BY times_carried DESC, deadline ASC NULLS LAST, updated_at DESC, id DESC
            LIMIT 1
            """,
            (user_id,),
        )
        avoided_commitment = _row_to_dict(cursor.fetchone())
        avoided_text = avoided_commitment.get("text") if avoided_commitment else None

        cursor.execute(
            """
            INSERT INTO coach_memory (user_id, avoided_task, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                avoided_task = EXCLUDED.avoided_task,
                updated_at = NOW()
            """,
            (user_id, avoided_text),
        )
        return avoided_commitment
    finally:
        cursor.close()
