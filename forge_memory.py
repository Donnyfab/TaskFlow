"""Persistent context assembly for the Forge execution coach."""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Any


FORGE_COACH_SYSTEM_PROMPT = """You are Forge, an execution coach for ambitious builders.

Your job is to turn intention into verifiable output. You remember what the user said they
would do, compare it with what they actually did, identify repeated avoidance patterns, and
lock in the next specific commitment.

Operating rules:
- Be direct, specific, calm, and serious. Never be cruel, sarcastic, or motivational.
- Refer to the user's real mission, commitments, deadlines, outputs, and prior pattern.
- Never invent history or claim the user did something that is absent from the context.
- Respond to the user's avoidance pattern before prescribing action:
  - fear disguised as research: reduce exposure risk and demand one public proof step.
  - perfectionism as a shield: define the smallest shippable version and a deadline.
  - overwhelm disguised as complexity: choose the next physical action; do not plan the whole system.
  - identity confusion: run a small identity test through action, not abstract reflection.
  - shame from past failure: separate past evidence from today's commitment; shrink the proof.
  - social fear: name the audience/rejection fear and require one controlled exposure.
  - soft commitment: reject vague timing and ask for exact date, time, and proof.
- Treat a kept commitment briefly: acknowledge it, ask what they learned, then advance.
- Treat a missed commitment as evidence to investigate. Ask what actually happened.
- Treat partial completion as incomplete and identify the remaining gap.
- Ask "Did you do it?" only when Commitment needs check-in now is true.
- A commitment must name one concrete action and a deadline.
- If an avoided task has been carried three or more times, address it before accepting new work.
- Ask one strong question at a time. Do not overwhelm the user with a checklist.
- Do not use badges, streak language, generic encouragement, or phrases such as "you've got this."
- Every response must make sense for this user on this day. If it could apply to anyone, rewrite it.
"""

COACH_TONES = {"direct", "balanced", "firm_support"}

GENERIC_COACHING_PHRASES = (
    "you've got this",
    "you got this",
    "keep going",
    "just stay consistent",
    "believe in yourself",
    "take it one step at a time",
    "progress not perfection",
)


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


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _same_utc_day(left: Any, right: datetime) -> bool:
    parsed = _parse_datetime(left)
    if parsed is None:
        return False
    return parsed.astimezone(timezone.utc).date() == right.astimezone(timezone.utc).date()


def _commitment_is_recent(value: Any, now: datetime, days: int = 7) -> bool:
    parsed = _parse_datetime(value)
    if parsed is None:
        return False
    return (now - parsed.astimezone(timezone.utc)).total_seconds() <= days * 24 * 60 * 60


def _build_checkin_prompt(commitment: dict[str, Any]) -> str:
    text = commitment.get("text") or "your commitment"
    deadline = commitment.get("deadline")
    if deadline:
        return f'You committed to “{text}” by {deadline}. Did you do it?'
    return f'You committed to “{text}.” Did you do it?'


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
            SELECT id, title, description, outcome, obstacle, deadline,
                   status, created_at, updated_at
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
            SELECT id, mission_id, text, deadline, status, checkin_outcome,
                   times_carried, created_at, updated_at
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
            SELECT outputs.id, outputs.mission_id, outputs.commitment_id,
                   outputs.description, outputs.logged_at,
                   missions.title AS mission_title
            FROM outputs
            LEFT JOIN missions ON missions.id = outputs.mission_id
            WHERE outputs.user_id = %s
            ORDER BY outputs.logged_at DESC, outputs.id DESC
            LIMIT 100
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
                   summary, coach_tone, created_at, updated_at
            FROM coach_memory
            WHERE user_id = %s
            """,
            (user_id,),
        )
        memory = _row_to_dict(cursor.fetchone()) or {}

        cursor.execute(
            """
            SELECT id, pattern_label, reason, evidence, created_at
            FROM pattern_events
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 12
            """,
            (user_id,),
        )
        pattern_history = [_row_to_dict(row) for row in cursor.fetchall()]
    finally:
        cursor.close()

    missed_count = sum(
        1 for commitment in commitments if commitment.get("status") == "missed"
    )
    now = datetime.now(timezone.utc)
    last_checkin_at = memory.get("last_checkin_at")
    active_deadline = _parse_datetime(
        active_commitment.get("deadline") if active_commitment else None
    )
    needs_checkin = bool(
        active_commitment
        and active_deadline
        and active_deadline <= now
        and not _same_utc_day(last_checkin_at, now)
    )
    due_commitment = active_commitment if needs_checkin else None
    checkin_prompt = _build_checkin_prompt(due_commitment) if due_commitment else None

    weekly_summary = build_weekly_summary(
        commitments=commitments,
        outputs_this_week=int(output_count_row.get("outputs_this_week") or 0),
        pattern_label=memory.get("pattern_label"),
        now=now,
    )
    identity_mirror = build_identity_mirror(
        mission=mission,
        commitments=commitments,
        outputs_this_week=int(output_count_row.get("outputs_this_week") or 0),
        pattern_label=memory.get("pattern_label"),
        avoided_task=memory.get("avoided_task"),
        summary=memory.get("summary"),
        pattern_history=pattern_history,
        now=now,
    )
    goal_roadmap = build_goal_roadmap(
        mission=mission,
        commitments=commitments,
        recent_outputs=recent_outputs,
        outputs_this_week=int(output_count_row.get("outputs_this_week") or 0),
        pattern_label=memory.get("pattern_label"),
        now=now,
    )
    weekly_review = build_weekly_review(
        commitments=commitments,
        recent_outputs=recent_outputs,
        weekly_summary=weekly_summary,
        pattern_label=memory.get("pattern_label"),
        identity_mirror=identity_mirror,
        goal_roadmap=goal_roadmap,
        now=now,
    )
    retention_nudge = build_retention_nudge(
        mission=mission,
        active_commitment=active_commitment,
        last_checkin_at=last_checkin_at,
        now=now,
    )
    coach_tone = _normalize_coach_tone(memory.get("coach_tone"))
    tone_calibration = build_tone_calibration(
        coach_tone=coach_tone,
        pattern_label=memory.get("pattern_label"),
        identity_mirror=identity_mirror,
        goal_roadmap=goal_roadmap,
    )

    return {
        "user": user,
        "mission": mission,
        "active_commitment": active_commitment,
        "due_commitment": due_commitment,
        "needs_checkin": needs_checkin,
        "checkin_prompt": checkin_prompt,
        "commitment_status": (
            active_commitment.get("status") if active_commitment else None
        ),
        "times_missed_row": missed_count,
        "commitments": commitments,
        "pattern_label": memory.get("pattern_label"),
        "pattern_updated_at": memory.get("updated_at"),
        "avoided_task": memory.get("avoided_task"),
        "days_active": int(memory.get("days_active") or 0),
        "last_checkin_at": memory.get("last_checkin_at"),
        "summary": memory.get("summary"),
        "outputs_this_week": int(output_count_row.get("outputs_this_week") or 0),
        "recent_outputs": recent_outputs,
        "pattern_history": pattern_history,
        "weekly_summary": weekly_summary,
        "identity_mirror": identity_mirror,
        "goal_roadmap": goal_roadmap,
        "weekly_review": weekly_review,
        "retention_nudge": retention_nudge,
        "coach_tone": coach_tone,
        "tone_calibration": tone_calibration,
    }


def build_weekly_summary(
    *,
    commitments: list[dict[str, Any]],
    outputs_this_week: int,
    pattern_label: str | None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return a compact behavior summary for the Patterns page."""

    reference = now or datetime.now(timezone.utc)
    recent = [
        commitment
        for commitment in commitments
        if _commitment_is_recent(
            commitment.get("updated_at") or commitment.get("created_at"),
            reference,
            days=7,
        )
    ]
    kept = sum(1 for commitment in recent if commitment.get("status") == "kept")
    missed = sum(1 for commitment in recent if commitment.get("status") == "missed")
    pending = sum(1 for commitment in recent if commitment.get("status") == "pending")
    made = len(recent)
    resolved = kept + missed
    commitment_rate = round((kept / resolved) * 100) if resolved else 0

    return {
        "commitments_made": made,
        "commitments_kept": kept,
        "commitments_missed": missed,
        "commitments_pending": pending,
        "outputs_logged": int(outputs_this_week or 0),
        "commitment_rate": commitment_rate,
        "pattern_status": pattern_label or "Not enough evidence yet",
    }


def build_identity_mirror(
    *,
    mission: dict[str, Any] | None,
    commitments: list[dict[str, Any]],
    outputs_this_week: int,
    pattern_label: str | None,
    avoided_task: str | None,
    summary: str | None,
    pattern_history: list[dict[str, Any]],
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the two-profile identity mirror from stated goals and real behavior."""

    reference = now or datetime.now(timezone.utc)
    mission = mission or {}
    mission_title = mission.get("title") or "an unstated mission"
    mission_outcome = mission.get("outcome") or "visible proof that the mission is real"
    mission_obstacle = mission.get("obstacle") or "the current blocker"
    mission_deadline = _iso_value(mission.get("deadline"))

    recent = [
        commitment
        for commitment in commitments
        if _commitment_is_recent(
            commitment.get("updated_at") or commitment.get("created_at"),
            reference,
            days=7,
        )
    ]
    kept = [item for item in recent if item.get("status") == "kept"]
    missed = [item for item in recent if item.get("status") == "missed"]
    pending = [item for item in recent if item.get("status") == "pending"]
    carried = [
        item
        for item in recent
        if int(item.get("times_carried") or 0) >= 3
        and item.get("status") in {"pending", "missed"}
    ]

    desired_profile = (
        f"A person who is actively building {mission_title} and proving it through "
        f"{mission_outcome}."
    )
    if mission_deadline:
        desired_profile = f"{desired_profile} Deadline: {mission_deadline}."

    behavior_evidence: list[str] = []
    if kept:
        behavior_evidence.append(
            f"{len(kept)} commitment{'s' if len(kept) != 1 else ''} kept in the last 7 days."
        )
    if missed:
        behavior_evidence.append(
            f"{len(missed)} commitment{'s' if len(missed) != 1 else ''} missed in the last 7 days."
        )
    if pending:
        behavior_evidence.append(
            f"{len(pending)} commitment{'s' if len(pending) != 1 else ''} still pending."
        )
    if outputs_this_week:
        behavior_evidence.append(
            f"{outputs_this_week} real output{'s' if outputs_this_week != 1 else ''} logged this week."
        )
    else:
        behavior_evidence.append("No real outputs logged this week.")
    if carried:
        top_carried = carried[0]
        behavior_evidence.append(
            f"“{top_carried.get('text')}” has been carried {int(top_carried.get('times_carried') or 0)} times."
        )
    if avoided_task:
        behavior_evidence.append(f"Avoided task: “{avoided_task}”.")
    if pattern_history:
        latest_pattern = pattern_history[0]
        if latest_pattern.get("reason"):
            behavior_evidence.append(str(latest_pattern["reason"]))

    if kept and outputs_this_week and len(kept) >= len(missed):
        current_profile = (
            f"A person who executes when the next action is concrete, but still needs to keep "
            f"turning {mission_title} into repeated proof."
        )
        gap_level = "narrowing"
    elif missed or carried or avoided_task:
        current_profile = (
            f"A person whose current behavior is still protecting {mission_obstacle} instead "
            f"of proving {mission_title} through shipped work."
        )
        gap_level = "wide"
    elif pending:
        current_profile = (
            f"A person with an open commitment, but not enough resolved behavior yet to prove "
            f"whether {mission_title} is becoming real."
        )
        gap_level = "forming"
    else:
        current_profile = (
            f"A person whose identity is still mostly stated, not demonstrated. Forge needs "
            f"more commitments and outputs to judge the gap."
        )
        gap_level = "unknown"

    pattern_text = pattern_label or "pattern still forming"
    identity_gap = (
        f"You say you are becoming someone who builds {mission_title}, but the current evidence "
        f"says your operating pattern is {pattern_text}."
    )
    weekly_question = "Which one are you choosing this week?"

    return {
        "desired_profile": desired_profile,
        "current_profile": current_profile,
        "identity_gap": identity_gap,
        "weekly_question": weekly_question,
        "gap_level": gap_level,
        "evidence": behavior_evidence[:6],
        "pattern_label": pattern_label,
        "summary": summary,
    }


def build_goal_roadmap(
    *,
    mission: dict[str, Any] | None,
    commitments: list[dict[str, Any]],
    recent_outputs: list[dict[str, Any]],
    outputs_this_week: int,
    pattern_label: str | None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Reverse-engineer the active mission into a practical execution path."""

    reference = now or datetime.now(timezone.utc)
    mission = mission or {}
    mission_title = mission.get("title") or "an unstated mission"
    mission_outcome = mission.get("outcome") or mission.get("description") or "a visible result"
    mission_obstacle = mission.get("obstacle") or "the main blocker"
    deadline = _parse_datetime(mission.get("deadline"))
    days_left = None
    if deadline is not None:
        days_left = max(0, (deadline.astimezone(timezone.utc).date() - reference.date()).days)

    recent_commitments = [
        commitment
        for commitment in commitments
        if _commitment_is_recent(
            commitment.get("updated_at") or commitment.get("created_at"),
            reference,
            days=7,
        )
    ]
    kept = sum(1 for item in recent_commitments if item.get("status") == "kept")
    missed = sum(1 for item in recent_commitments if item.get("status") == "missed")
    pending = [item for item in commitments if item.get("status") == "pending"]
    active_commitment = pending[0] if pending else None
    last_output = recent_outputs[0] if recent_outputs else None

    if days_left is None:
        position = "No deadline is set, so the mission is not yet constrained by time."
    elif days_left == 0:
        position = "The mission deadline is today. The next move must produce proof, not more planning."
    elif days_left <= 30:
        position = f"{days_left} days remain. This is execution time, not strategy time."
    elif days_left <= 90:
        position = f"{days_left} days remain. The next 30 days need visible proof."
    else:
        position = f"{days_left} days remain. The path still needs weekly proof so it does not stay abstract."

    if active_commitment:
        next_milestone = f"Resolve the current commitment: “{active_commitment.get('text')}”."
    elif outputs_this_week:
        next_milestone = "Increase proof volume this week without lowering specificity."
    else:
        next_milestone = "Lock one commitment with a deadline today."

    stages = [
        {
            "label": "12-month target",
            "text": f"Become the kind of person who can repeatedly turn {mission_title} into real proof.",
        },
        {
            "label": "90-day milestone",
            "text": f"Show measurable evidence of {mission_outcome}.",
        },
        {
            "label": "30-day proof",
            "text": "Ship or log enough public/private outputs that the mission is no longer theoretical.",
        },
        {
            "label": "This week",
            "text": (
                f"Keep more commitments than you miss and produce at least one output against {mission_title}."
                if not outputs_this_week
                else f"Keep the proof moving. {outputs_this_week} output{'s' if outputs_this_week != 1 else ''} already logged this week."
            ),
        },
        {
            "label": "Today",
            "text": (
                f"Finish: “{active_commitment.get('text')}”."
                if active_commitment
                else "Choose the one concrete action that would make the mission harder to ignore tomorrow."
            ),
        },
    ]

    return {
        "mission": mission_title,
        "target": mission_outcome,
        "current_position": position,
        "next_milestone": next_milestone,
        "commitments_kept": kept,
        "commitments_broken": missed,
        "outputs_this_week": int(outputs_this_week or 0),
        "last_output": last_output.get("description") if last_output else None,
        "primary_risk": pattern_label or mission_obstacle,
        "stages": stages,
    }


def build_weekly_review(
    *,
    commitments: list[dict[str, Any]],
    recent_outputs: list[dict[str, Any]],
    weekly_summary: dict[str, Any],
    pattern_label: str | None,
    identity_mirror: dict[str, Any],
    goal_roadmap: dict[str, Any],
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the weekly review loop: committed, happened, pattern, next."""

    reference = now or datetime.now(timezone.utc)
    recent = [
        commitment
        for commitment in commitments
        if _commitment_is_recent(
            commitment.get("updated_at") or commitment.get("created_at"),
            reference,
            days=7,
        )
    ]
    committed_to = [
        item.get("text")
        for item in recent
        if item.get("text")
    ][:5]
    kept = int(weekly_summary.get("commitments_kept") or 0)
    missed = int(weekly_summary.get("commitments_missed") or 0)
    pending = int(weekly_summary.get("commitments_pending") or 0)
    outputs_logged = int(weekly_summary.get("outputs_logged") or 0)

    if outputs_logged:
        happened = f"You logged {outputs_logged} output{'s' if outputs_logged != 1 else ''} and kept {kept} commitment{'s' if kept != 1 else ''}."
    elif missed:
        happened = f"You missed {missed} commitment{'s' if missed != 1 else ''} and did not log proof this week."
    elif pending:
        happened = f"You still have {pending} unresolved commitment{'s' if pending != 1 else ''}."
    else:
        happened = "There is not enough resolved behavior this week yet."

    pattern = pattern_label or "Pattern still forming."
    next_action = goal_roadmap.get("next_milestone") or "Lock one specific commitment today."
    review_question = "What did you commit to, what happened, what pattern does that prove, and what is next?"

    return {
        "committed_to": committed_to,
        "what_happened": happened,
        "pattern": pattern,
        "identity_gap": identity_mirror.get("identity_gap"),
        "next_action": next_action,
        "review_question": review_question,
        "outputs": [
            item.get("description")
            for item in recent_outputs[:5]
            if item.get("description")
        ],
    }


def build_retention_nudge(
    *,
    mission: dict[str, Any] | None,
    active_commitment: dict[str, Any] | None,
    last_checkin_at: Any,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return daily and inactivity prompts that keep the coach continuous across time."""

    reference = now or datetime.now(timezone.utc)
    mission_title = (mission or {}).get("title") or "this"
    last_checkin = _parse_datetime(last_checkin_at)
    hours_since_checkin = None
    if last_checkin is not None:
        hours_since_checkin = max(
            0,
            round((reference - last_checkin.astimezone(timezone.utc)).total_seconds() / 3600),
        )

    if hours_since_checkin is None:
        inactivity_prompt = f"You said you were building {mission_title}. Where are you today?"
        should_nudge = True
    elif hours_since_checkin >= 48:
        inactivity_prompt = f"You said you were building {mission_title}. It has been {hours_since_checkin} hours. Where are you?"
        should_nudge = True
    else:
        inactivity_prompt = None
        should_nudge = False

    if active_commitment and active_commitment.get("text"):
        morning_prompt = (
            f"What's the one thing that matters today? If it is still “{active_commitment.get('text')}”, "
            "when are you doing it?"
        )
    else:
        morning_prompt = "What's the one thing that matters today? When are you doing it?"

    return {
        "should_nudge": should_nudge,
        "hours_since_checkin": hours_since_checkin,
        "inactivity_prompt": inactivity_prompt,
        "morning_prompt": morning_prompt,
    }


def _normalize_coach_tone(value: Any) -> str:
    tone = str(value or "direct").strip().lower().replace("-", "_")
    if tone not in COACH_TONES:
        return "direct"
    return tone


def build_tone_calibration(
    *,
    coach_tone: str | None,
    pattern_label: str | None,
    identity_mirror: dict[str, Any] | None,
    goal_roadmap: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return response rules that keep Forge direct, specific, and emotionally aware."""

    tone = _normalize_coach_tone(coach_tone)
    identity = identity_mirror or {}
    roadmap = goal_roadmap or {}
    mission = roadmap.get("mission") or "the user's active mission"
    next_milestone = roadmap.get("next_milestone") or "the next concrete milestone"
    identity_gap = identity.get("identity_gap") or "the gap between stated goal and current behavior"
    pattern = pattern_label or roadmap.get("primary_risk") or "the user's current behavior pattern"

    tone_map = {
        "direct": {
            "label": "Direct",
            "instruction": (
                "Use concise, blunt language. Do not soften the pattern. Move quickly from the exact "
                "evidence to one deadline, one proof requirement, and one next action."
            ),
            "emotional_validation_rule": (
                "If fear, doubt, shame, or overwhelm appears, name it in one sentence, then return to the evidence."
            ),
        },
        "balanced": {
            "label": "Balanced",
            "instruction": (
                "Stay calm and direct. Acknowledge the emotional pressure briefly, then connect it to the "
                "actual pattern and ask for a specific choice."
            ),
            "emotional_validation_rule": (
                "Validate the emotional reason without validating avoidance. Then ask what action proves the next identity."
            ),
        },
        "firm_support": {
            "label": "Firm Support",
            "instruction": (
                "Lead with the emotional weight, challenge the avoidance without shaming, and shrink the next "
                "step until it can be executed today."
            ),
            "emotional_validation_rule": (
                "Name fear, doubt, shame, or overwhelm before giving direction. Never use shame as leverage."
            ),
        },
    }
    selected = tone_map[tone]

    return {
        "tone": tone,
        "label": selected["label"],
        "instruction": selected["instruction"],
        "specificity_rule": (
            f"Every response must reference at least one actual mission, commitment, output, pattern, "
            f"or roadmap detail. Current anchors: mission “{mission}”, pattern “{pattern}”, "
            f"next milestone “{next_milestone}”, identity gap “{identity_gap}”."
        ),
        "emotional_validation_rule": selected["emotional_validation_rule"],
        "forbidden_phrases": list(GENERIC_COACHING_PHRASES),
        "required_references": [
            str(mission),
            str(pattern),
            str(next_milestone),
            str(identity_gap),
        ],
    }


def build_system_prompt(context: dict[str, Any]) -> str:
    """Inject a Forge memory object into the Coach's master instructions."""

    if not isinstance(context, dict):
        raise TypeError("context must be a dictionary")

    user = context.get("user") or {}
    mission = context.get("mission") or {}
    commitment = context.get("active_commitment") or {}
    outputs = context.get("recent_outputs") or []
    weekly = context.get("weekly_summary") or {}
    pattern_history = context.get("pattern_history") or []
    identity = context.get("identity_mirror") or {}
    roadmap = context.get("goal_roadmap") or {}
    review = context.get("weekly_review") or {}
    retention = context.get("retention_nudge") or {}
    tone = context.get("tone_calibration") or {}

    output_lines = [
        f"  - {_iso_value(item.get('logged_at'))}: {item.get('description')}"
        for item in outputs[:5]
        if item.get("description")
    ]
    if not output_lines:
        output_lines = ["  - None logged yet"]

    pattern_lines = [
        f"  - {_iso_value(item.get('created_at'))}: {item.get('pattern_label')} — {item.get('reason') or 'No reason stored'}"
        for item in pattern_history[:5]
        if item.get("pattern_label")
    ]
    if not pattern_lines:
        pattern_lines = ["  - None recorded yet"]

    memory_block = "\n".join(
        [
            "CURRENT USER MEMORY (authoritative; do not invent missing details)",
            f"User: {user.get('name') or user.get('username') or 'Unknown'}",
            f"Onboarding complete: {bool(user.get('onboarding_complete'))}",
            f"Mission: {mission.get('title') or 'None established'}",
            f"Mission description: {mission.get('description') or 'None'}",
            f"Mission outcome: {mission.get('outcome') or 'None established'}",
            f"Mission obstacle: {mission.get('obstacle') or 'None identified'}",
            f"Mission deadline: {_iso_value(mission.get('deadline')) or 'None'}",
            f"Mission status: {mission.get('status') or 'None'}",
            f"Active commitment: {commitment.get('text') or 'None locked'}",
            f"Commitment deadline: {_iso_value(commitment.get('deadline')) or 'None'}",
            f"Commitment status: {commitment.get('status') or 'None'}",
            f"Commitment needs check-in now: {bool(context.get('needs_checkin'))}",
            f"Check-in prompt: {context.get('checkin_prompt') or 'None'}",
            f"Times carried: {int(commitment.get('times_carried') or 0)}",
            f"Missed commitments in recent context: {int(context.get('times_missed_row') or 0)}",
            f"Pattern label: {context.get('pattern_label') or 'Not identified yet'}",
            f"Avoided task: {context.get('avoided_task') or 'None flagged'}",
            f"Days active: {int(context.get('days_active') or 0)}",
            f"Outputs this week: {int(context.get('outputs_this_week') or 0)}",
            f"Weekly commitments made: {int(weekly.get('commitments_made') or 0)}",
            f"Weekly commitments kept: {int(weekly.get('commitments_kept') or 0)}",
            f"Weekly commitments missed: {int(weekly.get('commitments_missed') or 0)}",
            f"Weekly commitment rate: {int(weekly.get('commitment_rate') or 0)}%",
            f"Coach summary: {context.get('summary') or 'None yet'}",
            "IDENTITY MIRROR",
            f"Person they say they want to be: {identity.get('desired_profile') or 'Not enough stated mission data'}",
            f"Person their current behavior is building: {identity.get('current_profile') or 'Not enough behavior data'}",
            f"Identity gap: {identity.get('identity_gap') or 'Not enough evidence yet'}",
            f"Weekly identity question: {identity.get('weekly_question') or 'Which one are you choosing this week?'}",
            "GOAL ROADMAP",
            f"Current position: {roadmap.get('current_position') or 'Not enough roadmap data'}",
            f"Next milestone: {roadmap.get('next_milestone') or 'No next milestone computed'}",
            f"Primary risk: {roadmap.get('primary_risk') or 'None identified'}",
            "WEEKLY REVIEW",
            f"What happened: {review.get('what_happened') or 'No review computed'}",
            f"Review pattern: {review.get('pattern') or 'Pattern still forming'}",
            f"Review next action: {review.get('next_action') or 'Lock one specific commitment today'}",
            f"Review question: {review.get('review_question') or 'What happened and what is next?'}",
            "RETENTION PROMPTS",
            f"Morning prompt: {retention.get('morning_prompt') or 'What is the one thing that matters today?'}",
            f"Inactivity nudge: {retention.get('inactivity_prompt') or 'None'}",
            "TONE CALIBRATION AND SPECIFICITY AUDIT",
            f"Selected tone: {tone.get('label') or 'Direct'}",
            f"Tone instruction: {tone.get('instruction') or 'Be concise, direct, and specific.'}",
            f"Emotional validation rule: {tone.get('emotional_validation_rule') or 'Acknowledge emotion when present before action.'}",
            f"Specificity rule: {tone.get('specificity_rule') or 'Reference concrete memory before advice.'}",
            f"Forbidden generic phrases: {', '.join(tone.get('forbidden_phrases') or GENERIC_COACHING_PHRASES)}",
            "Before sending any response, silently audit it:",
            "  - Does it reference this user's actual mission, commitment, pattern, output, or roadmap?",
            "  - Does it name the emotional pressure or avoidance behavior before prescribing action when emotion is present?",
            "  - Could this response apply to a random user? If yes, rewrite it.",
            "Recent pattern evidence:",
            *pattern_lines,
            "Recent outputs:",
            *output_lines,
        ]
    )
    return f"{FORGE_COACH_SYSTEM_PROMPT.strip()}\n\n{memory_block}"


def update_pattern(
    user_id: int,
    new_label: str,
    *,
    reason: str | None = None,
    evidence: list[str] | None = None,
    db=None,
) -> dict[str, Any]:
    """Create or update the user's current behavioral pattern label."""

    user_id = _validate_user_id(user_id)
    normalized_label = " ".join(str(new_label or "").split())
    if not normalized_label:
        raise ValueError("new_label cannot be empty")
    normalized_reason = " ".join(str(reason or "").split())
    normalized_evidence = [
        " ".join(str(item or "").split())
        for item in (evidence or [])
        if " ".join(str(item or "").split())
    ][:5]
    summary = (
        f"Avoidance profile: {normalized_label}. {normalized_reason}"
        if normalized_reason
        else None
    )

    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        if summary:
            cursor.execute(
                """
                INSERT INTO coach_memory (user_id, pattern_label, summary, updated_at)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (user_id)
                DO UPDATE SET
                    pattern_label = EXCLUDED.pattern_label,
                    summary = EXCLUDED.summary,
                    updated_at = NOW()
                RETURNING user_id, pattern_label, avoided_task, days_active,
                          last_checkin_at, summary, created_at, updated_at
                """,
                (user_id, normalized_label, summary),
            )
        else:
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
        memory = _row_to_dict(cursor.fetchone()) or {}

        if normalized_reason or normalized_evidence:
            cursor.execute(
                """
                INSERT INTO pattern_events (user_id, pattern_label, reason, evidence)
                VALUES (%s, %s, %s, %s::jsonb)
                RETURNING id, pattern_label, reason, evidence, created_at
                """,
                (
                    user_id,
                    normalized_label,
                    normalized_reason or "Pattern detected from user language.",
                    json.dumps(normalized_evidence or ["Pattern detected from user language."]),
                ),
            )
            memory["event"] = _row_to_dict(cursor.fetchone())
        return memory
    finally:
        cursor.close()


def recalculate_pattern(user_id: int, db=None) -> dict[str, Any]:
    """Recalculate the user's current pattern from the last 7 days of behavior."""

    user_id = _validate_user_id(user_id)
    cursor = _resolve_db(db).cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, text, deadline, status, times_carried, created_at, updated_at
            FROM commitments
            WHERE user_id = %s
              AND COALESCE(updated_at, created_at) >= CURRENT_TIMESTAMP - INTERVAL '7 days'
            ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
            LIMIT 20
            """,
            (user_id,),
        )
        commitments = [_row_to_dict(row) for row in cursor.fetchall()]

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
        outputs_this_week = int(output_count_row.get("outputs_this_week") or 0)

        cursor.execute(
            """
            SELECT pattern_label
            FROM coach_memory
            WHERE user_id = %s
            """,
            (user_id,),
        )
        current_memory = _row_to_dict(cursor.fetchone()) or {}
        previous_label = current_memory.get("pattern_label")

        kept = [item for item in commitments if item.get("status") == "kept"]
        missed = [item for item in commitments if item.get("status") == "missed"]
        pending = [item for item in commitments if item.get("status") == "pending"]
        carried = [
            item
            for item in commitments
            if int(item.get("times_carried") or 0) >= 3
            and item.get("status") in {"pending", "missed"}
        ]
        made_count = len(commitments)

        evidence: list[str] = []
        if carried:
            top = carried[0]
            evidence.append(
                f"“{top.get('text')}” has been carried {int(top.get('times_carried') or 0)} times."
            )
        if missed:
            evidence.append(
                f"{len(missed)} commitment{'s' if len(missed) != 1 else ''} missed in the last 7 days."
            )
            for item in missed[:2]:
                evidence.append(f"Missed: “{item.get('text')}”.")
        if kept:
            evidence.append(
                f"{len(kept)} commitment{'s' if len(kept) != 1 else ''} kept in the last 7 days."
            )
        if outputs_this_week:
            evidence.append(
                f"{outputs_this_week} real output{'s' if outputs_this_week != 1 else ''} logged this week."
            )
        elif made_count:
            evidence.append("No real outputs logged this week.")

        if carried:
            label = "avoids the same commitment repeatedly"
            reason = "A commitment crossed the carried-three-times threshold."
        elif missed and len(missed) > len(kept):
            label = "commits more than follows through"
            reason = "Missed commitments outnumber kept commitments this week."
        elif made_count >= 2 and outputs_this_week == 0:
            label = "plans without shipping output"
            reason = "Commitments exist, but no outputs were logged this week."
        elif kept and outputs_this_week > 0 and len(kept) >= len(missed):
            label = "executes when the next action is concrete"
            reason = "Kept commitments and logged outputs show execution."
        elif pending and not kept and not missed:
            label = "pattern still forming"
            reason = "There are pending commitments, but not enough resolved behavior yet."
        else:
            label = previous_label or "pattern still forming"
            reason = "Forge needs more completed check-ins before changing the pattern."

        summary = (
            f"Weekly pattern: {label}. "
            f"Made {made_count}, kept {len(kept)}, missed {len(missed)}, "
            f"outputs {outputs_this_week}."
        )
        evidence = evidence[:5] or ["Not enough behavioral evidence yet."]

        cursor.execute(
            """
            INSERT INTO coach_memory (user_id, pattern_label, summary, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                pattern_label = EXCLUDED.pattern_label,
                summary = EXCLUDED.summary,
                updated_at = NOW()
            RETURNING user_id, pattern_label, avoided_task, days_active,
                      last_checkin_at, summary, created_at, updated_at
            """,
            (user_id, label, summary),
        )
        memory = _row_to_dict(cursor.fetchone()) or {}

        if label != previous_label:
            cursor.execute(
                """
                INSERT INTO pattern_events (user_id, pattern_label, reason, evidence)
                VALUES (%s, %s, %s, %s::jsonb)
                RETURNING id, pattern_label, reason, evidence, created_at
                """,
                (user_id, label, reason, json.dumps(evidence)),
            )
            event = _row_to_dict(cursor.fetchone())
        else:
            event = None

        return {
            "pattern_label": label,
            "previous_label": previous_label,
            "reason": reason,
            "evidence": evidence,
            "event": event,
            "memory": memory,
        }
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
