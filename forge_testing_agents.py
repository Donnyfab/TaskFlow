"""Deterministic long-term testing personas for Forge.

These agents are intentionally lightweight. They do not call the live Coach API by
themselves; they generate consistent daily scenarios that can be used by a human,
an external agent, or a future cron runner to test Forge behavior without inventing
new product state.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterable


@dataclass(frozen=True)
class TestingPersona:
    slug: str
    name: str
    motive: str
    default_state: str
    avoidance_loop: str
    compliance_pattern: str
    sample_messages: tuple[str, ...]


PERSONAS: tuple[TestingPersona, ...] = (
    TestingPersona(
        slug="drifter",
        name="Drifter",
        motive="Wants direction but avoids choosing one serious target.",
        default_state="uncertain",
        avoidance_loop="keeps changing goals before proof exists",
        compliance_pattern="answers vaguely unless pressed for one concrete commitment",
        sample_messages=(
            "I don't know what I should focus on.",
            "Maybe I should do content, or maybe learn coding first.",
            "I started but then got distracted.",
        ),
    ),
    TestingPersona(
        slug="dreamer",
        name="Dreamer",
        motive="Has a big vision but keeps expanding the idea instead of shipping.",
        default_state="excited but unfocused",
        avoidance_loop="turns every commitment into a larger plan",
        compliance_pattern="accepts goals quickly, resists proof and deadlines",
        sample_messages=(
            "I want this to become a full platform one day.",
            "I need to map the whole thing before I start.",
            "I can probably do it soon.",
        ),
    ),
    TestingPersona(
        slug="builder",
        name="Builder",
        motive="Executes, but needs sharper sequencing and feedback loops.",
        default_state="active",
        avoidance_loop="ships pieces without confirming the highest leverage next step",
        compliance_pattern="responds well to direct proof requirements",
        sample_messages=(
            "I shipped the first version but I don't know what to fix next.",
            "I can send it to users today if that's the move.",
            "The landing page is live.",
        ),
    ),
    TestingPersona(
        slug="burned_out_operator",
        name="Burned-Out Operator",
        motive="Knows what to do but is emotionally overloaded and inconsistent.",
        default_state="tired and avoidant",
        avoidance_loop="uses exhaustion to delay a smaller proof step",
        compliance_pattern="needs scope reduction without being excused from accountability",
        sample_messages=(
            "I'm overwhelmed and I don't have energy for this.",
            "I was supposed to finish it but I froze.",
            "I need something smaller or I won't do anything.",
        ),
    ),
)


def get_testing_personas() -> list[dict[str, str | list[str]]]:
    """Return serializable persona definitions."""

    return [
        {
            "slug": persona.slug,
            "name": persona.name,
            "motive": persona.motive,
            "default_state": persona.default_state,
            "avoidance_loop": persona.avoidance_loop,
            "compliance_pattern": persona.compliance_pattern,
            "sample_messages": list(persona.sample_messages),
        }
        for persona in PERSONAS
    ]


def generate_daily_agent_report(
    *,
    start_date: date | None = None,
    days: int = 7,
    personas: Iterable[TestingPersona] = PERSONAS,
) -> list[dict[str, object]]:
    """Generate a repeatable daily test plan for long-term Forge evaluation."""

    if days <= 0:
        raise ValueError("days must be positive")
    anchor = start_date or date.today()
    report: list[dict[str, object]] = []

    for offset in range(days):
        current_day = anchor + timedelta(days=offset)
        for persona in personas:
            message = persona.sample_messages[offset % len(persona.sample_messages)]
            report.append(
                {
                    "date": current_day.isoformat(),
                    "persona": persona.name,
                    "slug": persona.slug,
                    "state_to_simulate": persona.default_state,
                    "message_to_send": message,
                    "expected_coach_behavior": [
                        "respond to the psychological state, not only the words",
                        "ask one question or set one concrete action",
                        "reject vague timing",
                        "request proof when a commitment is claimed complete",
                        "reference prior missed commitments when available",
                    ],
                    "failure_signals": [
                        "generic motivation",
                        "long paragraph response",
                        "accepting soft commitment language",
                        "opening a new plan instead of converging",
                        "forgetting prior promise/deadline context",
                    ],
                }
            )

    return report
