"""Validation and atomic persistence for Forge onboarding completion."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any


FORGE_COMPLETE_PREFIX = "FORGE_COMPLETE||"
REQUIRED_COMPLETION_FIELDS = (
    "mission",
    "outcome",
    "obstacle",
    "pattern_label",
    "identity_gap",
    "deadline",
    "commitment_text",
    "commitment_deadline",
)

FIELD_MAX_LENGTHS = {
    "mission": 300,
    "outcome": 2_000,
    "obstacle": 2_000,
    "pattern_label": 200,
    "identity_gap": 2_000,
    "commitment_text": 1_000,
}

FORGE_ONBOARDING_COMPLETION_PROTOCOL = """
ONBOARDING COMPLETION PROTOCOL

The interface has already shown these two opening messages before the user's first reply:
"Before we begin, I need to understand what you're building. I’m going to be direct:
I’ll look at what you say you want, what your actions show, and the first commitment
you can prove."
"What are you trying to make real right now?"
Treat the first user message as their answer to that question. Do not repeat the opening.

Your onboarding job is to complete five stages through a natural conversation:

Stage 1 — The Contract:
- Make the working agreement clear if the user seems confused.
- Forge is not motivation, a task dump, or a polite chatbot.
- Forge turns stated goals into visible behavior, deadlines, proof, and follow-up.

Stage 2 — Honest Intake:
- Identify the specific thing the user is trying to build or make real.
- Ask exactly what the user has actually done toward it in the last 30 days before
  accepting a commitment.
- Do not accept vague ambition as progress.

Stage 3 — Pattern Detection:
- Classify the user's current avoidance pattern from their answers.
- Use a short, plain label such as "researching instead of shipping",
  "waiting for confidence", "overbuilding before feedback", "commits without proof",
  or another accurate label.

Stage 4 — Identity Gap:
- Reflect the gap between who the user says they want to become and what their
  current behavior is producing.
- Say it directly and calmly. Do not insult, shame, flatter, or soften it into
  generic encouragement.

Stage 5 — First Commitment:
- End with one specific, time-bound action in the next 24 to 48 hours.
- The commitment must be provable later.

Identify all eight required values before completion:
- mission: the specific thing the user is building or making real
- outcome: the concrete evidence that the mission is finished
- obstacle: the real blocker that has prevented progress
- pattern_label: the short behavioral pattern label detected during intake
- identity_gap: one direct sentence naming the gap between the user's stated goal and current behavior
- deadline: a specific calendar date for the mission
- commitment_text: one concrete action the user will complete in the next 24 to 48 hours
- commitment_deadline: the exact date, time, and UTC offset for that action

Adapt to what the user says instead of following a fixed questionnaire. Aim to identify the
required values within four to six exchanges, but never complete onboarding based only on a
turn count. Understand why the mission matters now so the urgency is clear, even though that
reason is not a separate completion field. Ask one direct question at a time. Keep clarifying
vague answers until every value is specific. Do not give advice during intake. Do not begin
with filler such as "Great," "Awesome," or "That's interesting."

When all values are known, summarize the mission and first commitment in plain language and
include the pattern label and identity gap. Ask whether the summary is accurate. If the user
corrects it, update the values and confirm again.

Only after the user explicitly confirms the summary, respond with exactly one line in this
format and nothing else:

FORGE_COMPLETE||{"mission":"...","outcome":"...","obstacle":"...","pattern_label":"...","identity_gap":"...","deadline":"YYYY-MM-DD","commitment_text":"...","commitment_deadline":"YYYY-MM-DDTHH:MM:SS-05:00"}

Rules for the completion line:
- Do not include prose, markdown, or code fences before or after it.
- Every field is required and must contain the confirmed value.
- pattern_label must be a concise behavior pattern, not a diagnosis.
- identity_gap must be one direct sentence, not a paragraph.
- deadline must be a real ISO calendar date in YYYY-MM-DD format.
- commitment_deadline must be an ISO-8601 datetime with an explicit UTC offset or Z.
- If the user gave a date but no time, ask for a time before requesting confirmation.
- Never emit the completion line before explicit confirmation.

If an earlier assistant message already contains a completion line but onboarding is still
incomplete, do not invent new values. Briefly confirm the saved summary with the user again,
then emit a fresh completion line only after they confirm. This makes interrupted saves safe.
""".strip()


class OnboardingValidationError(ValueError):
    """Raised when a completion payload cannot be safely persisted."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def _validate_user_id(user_id: int) -> int:
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("user_id must be a positive integer")
    return user_id


def _normalize_text(value: Any) -> str:
    return " ".join(str(value or "").split())


def _row_to_dict(row) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


def _serialize(value: Any):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def validate_completion_payload(data: Any) -> dict[str, str]:
    """Validate and normalize the model-produced completion payload."""

    if not isinstance(data, dict):
        raise OnboardingValidationError(["Request body must be a JSON object"])

    normalized: dict[str, str] = {}
    errors: list[str] = []
    for field in REQUIRED_COMPLETION_FIELDS:
        value = _normalize_text(data.get(field))
        if not value:
            errors.append(f"Missing or empty: {field}")
        else:
            normalized[field] = value

    for field, max_length in FIELD_MAX_LENGTHS.items():
        value = normalized.get(field, "")
        if len(value) > max_length:
            errors.append(f"{field} cannot exceed {max_length:,} characters")

    deadline_value = normalized.get("deadline")
    if deadline_value:
        try:
            parsed_deadline = date.fromisoformat(deadline_value)
            if parsed_deadline.isoformat() != deadline_value:
                raise ValueError
        except ValueError:
            errors.append("deadline must be a valid date in YYYY-MM-DD format")

    commitment_deadline_value = normalized.get("commitment_deadline")
    if commitment_deadline_value:
        try:
            parsed_commitment_deadline = datetime.fromisoformat(
                commitment_deadline_value.replace("Z", "+00:00")
            )
            if (
                parsed_commitment_deadline.tzinfo is None
                or parsed_commitment_deadline.utcoffset() is None
            ):
                raise ValueError
        except ValueError:
            errors.append(
                "commitment_deadline must be a valid ISO-8601 datetime with a UTC offset"
            )

    if errors:
        raise OnboardingValidationError(errors)
    return normalized


def get_onboarding_status(user_id: int, db) -> dict[str, bool]:
    """Return the server-authoritative onboarding state for one user."""

    user_id = _validate_user_id(user_id)
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT onboarding_complete FROM users WHERE id = %s",
            (user_id,),
        )
        user = _row_to_dict(cursor.fetchone())
    finally:
        cursor.close()

    if user is None:
        raise LookupError(f"User {user_id} does not exist")
    return {"onboarding_complete": bool(user.get("onboarding_complete"))}


def _existing_completion(cursor, user_id: int) -> dict[str, Any]:
    cursor.execute(
        """
        SELECT id, title, outcome, obstacle, deadline
        FROM missions
        WHERE user_id = %s AND status = 'active'
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
        """,
        (user_id,),
    )
    mission = _row_to_dict(cursor.fetchone()) or {}

    cursor.execute(
        """
        SELECT id, text, deadline
        FROM commitments
        WHERE user_id = %s
          AND (%s IS NULL OR mission_id = %s)
        ORDER BY
            CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
            updated_at DESC,
            id DESC
        LIMIT 1
        """,
        (user_id, mission.get("id"), mission.get("id")),
    )
    commitment = _row_to_dict(cursor.fetchone()) or {}

    cursor.execute(
        """
        SELECT pattern_label, summary
        FROM coach_memory
        WHERE user_id = %s
        LIMIT 1
        """,
        (user_id,),
    )
    memory = _row_to_dict(cursor.fetchone()) or {}
    return {
        "success": True,
        "already_complete": True,
        "mission_id": mission.get("id"),
        "commitment_id": commitment.get("id"),
        "mission": mission.get("title"),
        "outcome": mission.get("outcome"),
        "obstacle": mission.get("obstacle"),
        "pattern_label": memory.get("pattern_label"),
        "identity_gap": memory.get("summary"),
        "deadline": _serialize(mission.get("deadline")),
        "commitment": commitment.get("text"),
        "commitment_deadline": _serialize(commitment.get("deadline")),
    }


def complete_onboarding(user_id: int, data: Any, db) -> dict[str, Any]:
    """Persist the confirmed onboarding result as one idempotent transaction."""

    user_id = _validate_user_id(user_id)
    payload = validate_completion_payload(data)
    raw_connection = getattr(db, "raw_connection", db)
    previous_autocommit = getattr(raw_connection, "autocommit", None)
    cursor = None

    try:
        if previous_autocommit is not None:
            raw_connection.autocommit = False

        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT onboarding_complete
            FROM users
            WHERE id = %s
            FOR UPDATE
            """,
            (user_id,),
        )
        user = _row_to_dict(cursor.fetchone())
        if user is None:
            raise LookupError(f"User {user_id} does not exist")

        # The user-row lock makes retries safe even when two completion requests
        # arrive together or the client lost the first successful response.
        if bool(user.get("onboarding_complete")):
            result = _existing_completion(cursor, user_id)
            raw_connection.commit()
            return result

        cursor.execute(
            """
            INSERT INTO missions (
                user_id, title, description, outcome, obstacle, deadline, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            RETURNING id
            """,
            (
                user_id,
                payload["mission"],
                payload["outcome"],
                payload["outcome"],
                payload["obstacle"],
                payload["deadline"],
            ),
        )
        mission = _row_to_dict(cursor.fetchone())
        if not mission or not mission.get("id"):
            raise RuntimeError("Mission insert did not return an ID")

        cursor.execute(
            """
            INSERT INTO commitments (
                user_id, mission_id, text, deadline, status, times_carried
            )
            VALUES (%s, %s, %s, %s, 'pending', 0)
            RETURNING id
            """,
            (
                user_id,
                mission["id"],
                payload["commitment_text"],
                payload["commitment_deadline"],
            ),
        )
        commitment = _row_to_dict(cursor.fetchone())
        if not commitment or not commitment.get("id"):
            raise RuntimeError("Commitment insert did not return an ID")

        summary = (
            f"Mission: {payload['mission']}. Outcome: {payload['outcome']}. "
            f"Current obstacle: {payload['obstacle']}. "
            f"Pattern: {payload['pattern_label']}. "
            f"Identity gap: {payload['identity_gap']}"
        )
        cursor.execute(
            """
            INSERT INTO coach_memory (
                user_id, pattern_label, days_active, last_checkin_at, summary, updated_at
            )
            VALUES (%s, %s, 1, NOW(), %s, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                pattern_label = EXCLUDED.pattern_label,
                days_active = GREATEST(coach_memory.days_active, 1),
                last_checkin_at = NOW(),
                summary = EXCLUDED.summary,
                updated_at = NOW()
            """,
            (user_id, payload["pattern_label"], summary),
        )

        cursor.execute(
            """
            UPDATE users
            SET onboarding_complete = true
            WHERE id = %s
            """,
            (user_id,),
        )
        if getattr(cursor, "rowcount", 1) != 1:
            raise RuntimeError("User onboarding state was not updated")

        raw_connection.commit()
        return {
            "success": True,
            "already_complete": False,
            "mission_id": mission["id"],
            "commitment_id": commitment["id"],
            "mission": payload["mission"],
            "outcome": payload["outcome"],
            "obstacle": payload["obstacle"],
            "pattern_label": payload["pattern_label"],
            "identity_gap": payload["identity_gap"],
            "deadline": payload["deadline"],
            "commitment": payload["commitment_text"],
            "commitment_deadline": payload["commitment_deadline"],
        }
    except Exception:
        raw_connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        if previous_autocommit is not None:
            raw_connection.autocommit = previous_autocommit
