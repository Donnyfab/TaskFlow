import unittest
from datetime import datetime, timezone

from forge_memory import (
    build_goal_roadmap,
    build_identity_mirror,
    build_retention_nudge,
    build_system_prompt,
    build_tone_calibration,
    build_weekly_review,
    flag_avoided_task,
    get_user_context,
    recalculate_pattern,
    update_pattern,
)


class FakeCursor:
    def __init__(self, responses):
        self.responses = list(responses)
        self.executions = []
        self.current = None
        self.closed = False

    def execute(self, query, params=()):
        self.executions.append((" ".join(query.split()), params))
        self.current = self.responses.pop(0) if self.responses else None

    def fetchone(self):
        if isinstance(self.current, list):
            return self.current[0] if self.current else None
        return self.current

    def fetchall(self):
        if self.current is None:
            return []
        return self.current if isinstance(self.current, list) else [self.current]

    def close(self):
        self.closed = True


class FakeDatabase:
    def __init__(self, responses):
        self.cursor_instance = FakeCursor(responses)
        self.dictionary_requested = False

    def cursor(self, dictionary=False):
        self.dictionary_requested = dictionary
        return self.cursor_instance


class ForgeMemoryTests(unittest.TestCase):
    def test_get_user_context_assembles_all_memory_sources(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                {
                    "id": 7,
                    "name": "Donald",
                    "username": "donny",
                    "email": "donald@example.com",
                    "onboarding_complete": True,
                    "created_at": now,
                },
                {
                    "id": 11,
                    "title": "Launch Forge",
                    "description": "Ship the execution coach",
                    "outcome": "Five people use the daily check-in",
                    "obstacle": "Polishing instead of testing",
                    "deadline": datetime(2026, 8, 1, tzinfo=timezone.utc).date(),
                    "status": "active",
                    "created_at": now,
                    "updated_at": now,
                },
                [
                    {
                        "id": 21,
                        "mission_id": 11,
                        "text": "Finish the memory service",
                        "deadline": now,
                        "status": "pending",
                        "times_carried": 3,
                        "created_at": now,
                        "updated_at": now,
                    },
                    {
                        "id": 20,
                        "mission_id": 11,
                        "text": "Draft the prompt",
                        "deadline": now,
                        "status": "missed",
                        "times_carried": 1,
                        "created_at": now,
                        "updated_at": now,
                    },
                ],
                [
                    {
                        "id": 30,
                        "mission_id": 11,
                        "description": "Created the database schema",
                        "logged_at": now,
                    }
                ],
                {"outputs_this_week": 1},
                {
                    "pattern_label": "commits but delays execution",
                    "avoided_task": "Finish the memory service",
                    "days_active": 5,
                    "last_checkin_at": now,
                    "summary": "The user follows through when the next action is concrete.",
                    "coach_tone": "balanced",
                    "created_at": now,
                    "updated_at": now,
                },
            ]
        )

        context = get_user_context(7, db=db)

        self.assertTrue(db.dictionary_requested)
        self.assertEqual(context["mission"]["title"], "Launch Forge")
        self.assertEqual(
            context["mission"]["outcome"],
            "Five people use the daily check-in",
        )
        self.assertEqual(context["active_commitment"]["id"], 21)
        self.assertEqual(context["due_commitment"]["id"], 21)
        self.assertTrue(context["needs_checkin"])
        self.assertIn("Did you do it?", context["checkin_prompt"])
        self.assertEqual(context["times_missed_row"], 1)
        self.assertEqual(context["outputs_this_week"], 1)
        self.assertEqual(context["weekly_summary"]["outputs_logged"], 1)
        self.assertEqual(
            context["weekly_summary"]["pattern_status"],
            "commits but delays execution",
        )
        self.assertIn("Launch Forge", context["identity_mirror"]["desired_profile"])
        self.assertIn(
            "Which one are you choosing this week?",
            context["identity_mirror"]["weekly_question"],
        )
        self.assertIn("Launch Forge", context["goal_roadmap"]["mission"])
        self.assertIn("Finish the memory service", context["goal_roadmap"]["next_milestone"])
        self.assertIn("what happened", context["weekly_review"]["review_question"].lower())
        self.assertIn("What's the one thing", context["retention_nudge"]["morning_prompt"])
        self.assertEqual(context["coach_tone"], "balanced")
        self.assertEqual(context["tone_calibration"]["label"], "Balanced")
        self.assertEqual(context["pattern_label"], "commits but delays execution")
        self.assertTrue(db.cursor_instance.closed)

    def test_get_user_context_rejects_unknown_user(self):
        db = FakeDatabase([None])
        with self.assertRaises(LookupError):
            get_user_context(999, db=db)
        self.assertTrue(db.cursor_instance.closed)

    def test_get_user_context_does_not_check_in_before_deadline(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                {
                    "id": 7,
                    "name": "Donald",
                    "username": "donny",
                    "email": "donald@example.com",
                    "onboarding_complete": True,
                    "created_at": now,
                },
                {
                    "id": 11,
                    "title": "Launch Forge",
                    "description": "Ship the execution coach",
                    "outcome": None,
                    "obstacle": None,
                    "deadline": None,
                    "status": "active",
                    "created_at": now,
                    "updated_at": now,
                },
                [
                    {
                        "id": 21,
                        "mission_id": 11,
                        "text": "Publish one demo clip",
                        "deadline": datetime(2099, 6, 20, 18, 0, tzinfo=timezone.utc),
                        "status": "pending",
                        "times_carried": 0,
                        "created_at": now,
                        "updated_at": now,
                    },
                ],
                [],
                {"outputs_this_week": 0},
                {
                    "pattern_label": None,
                    "avoided_task": None,
                    "days_active": 1,
                    "last_checkin_at": None,
                    "summary": None,
                    "coach_tone": None,
                    "created_at": now,
                    "updated_at": now,
                },
            ]
        )

        context = get_user_context(7, db=db)

        self.assertEqual(context["active_commitment"]["id"], 21)
        self.assertIsNone(context["due_commitment"])
        self.assertFalse(context["needs_checkin"])
        self.assertIsNone(context["checkin_prompt"])

    def test_build_system_prompt_injects_specific_context(self):
        prompt = build_system_prompt(
            {
                "user": {"name": "Donald", "onboarding_complete": True},
                "mission": {
                    "title": "Launch Forge",
                    "description": "Ship an execution coach",
                    "outcome": "Five people complete a daily check-in",
                    "obstacle": "Polishing instead of testing",
                    "deadline": "2026-08-01",
                    "status": "active",
                },
                "active_commitment": {
                    "text": "Finish the memory service",
                    "deadline": "2026-06-20T18:00:00+00:00",
                    "status": "pending",
                    "times_carried": 3,
                },
                "times_missed_row": 2,
                "pattern_label": "commits but does not execute",
                "avoided_task": "Finish the memory service",
                "days_active": 5,
                "outputs_this_week": 1,
                "summary": "Needs specific deadlines.",
                "pattern_history": [
                    {
                        "pattern_label": "perfectionism as a shield",
                        "reason": "The user kept saying it was not ready.",
                        "evidence": ["Matched phrase: “not ready”"],
                        "created_at": "2026-06-20T12:30:00+00:00",
                    }
                ],
                "recent_outputs": [
                    {
                        "description": "Created the schema",
                        "logged_at": "2026-06-20T12:00:00+00:00",
                    }
                ],
                "identity_mirror": {
                    "desired_profile": "A person who builds Launch Forge through five completed check-ins.",
                    "current_profile": "A person still protecting polishing instead of testing.",
                    "identity_gap": "You say you are becoming a builder, but the current evidence says you delay exposure.",
                    "weekly_question": "Which one are you choosing this week?",
                    "gap_level": "wide",
                    "evidence": ["No public user test shipped this week."],
                },
                "goal_roadmap": {
                    "current_position": "42 days remain. The next 30 days need visible proof.",
                    "next_milestone": "Resolve the current commitment.",
                    "primary_risk": "perfectionism as a shield",
                },
                "weekly_review": {
                    "what_happened": "You missed one commitment and did not log proof this week.",
                    "pattern": "perfectionism as a shield",
                    "next_action": "Resolve the current commitment.",
                    "review_question": "What did you commit to, what happened, what pattern does that prove, and what is next?",
                },
                "retention_nudge": {
                    "morning_prompt": "What's the one thing that matters today?",
                    "inactivity_prompt": "You said you were building Launch Forge. Where are you?",
                },
                "tone_calibration": {
                    "tone": "firm_support",
                    "label": "Firm Support",
                    "instruction": "Name the emotional weight, then challenge the avoidance without shaming.",
                    "specificity_rule": "Reference Launch Forge, perfectionism as a shield, and the next commitment.",
                    "emotional_validation_rule": "Name fear or doubt before giving direction.",
                    "forbidden_phrases": ["you've got this", "keep going"],
                    "required_references": ["Launch Forge", "perfectionism as a shield"],
                },
            }
        )

        self.assertIn("You are Forge", prompt)
        self.assertIn("Mission: Launch Forge", prompt)
        self.assertIn("Mission outcome: Five people complete a daily check-in", prompt)
        self.assertIn("Mission deadline: 2026-08-01", prompt)
        self.assertIn("Active commitment: Finish the memory service", prompt)
        self.assertIn("Commitment needs check-in now: False", prompt)
        self.assertIn("Check-in prompt: None", prompt)
        self.assertIn("Pattern label: commits but does not execute", prompt)
        self.assertIn("Recent pattern evidence", prompt)
        self.assertIn("IDENTITY MIRROR", prompt)
        self.assertIn("A person who builds Launch Forge", prompt)
        self.assertIn("A person still protecting polishing", prompt)
        self.assertIn("Which one are you choosing this week?", prompt)
        self.assertIn("GOAL ROADMAP", prompt)
        self.assertIn("42 days remain", prompt)
        self.assertIn("WEEKLY REVIEW", prompt)
        self.assertIn("What did you commit to", prompt)
        self.assertIn("RETENTION PROMPTS", prompt)
        self.assertIn("TONE CALIBRATION AND SPECIFICITY AUDIT", prompt)
        self.assertIn("Selected tone: Firm Support", prompt)
        self.assertIn("Forbidden generic phrases: you've got this, keep going", prompt)
        self.assertIn("Could this response apply to a random user", prompt)
        self.assertIn("perfectionism as a shield", prompt)
        self.assertIn("not ready", prompt)
        self.assertIn("Created the schema", prompt)
        self.assertIn("do not invent missing details", prompt)

    def test_build_tone_calibration_blocks_generic_language(self):
        calibration = build_tone_calibration(
            coach_tone="firm-support",
            pattern_label="researching instead of shipping",
            identity_mirror={
                "identity_gap": "You say you want clients, but the current evidence says you stay private."
            },
            goal_roadmap={
                "mission": "Get three paid clients",
                "next_milestone": "Publish one offer today.",
            },
        )

        self.assertEqual(calibration["tone"], "firm_support")
        self.assertEqual(calibration["label"], "Firm Support")
        self.assertIn("without shaming", calibration["instruction"])
        self.assertIn("Get three paid clients", calibration["specificity_rule"])
        self.assertIn("researching instead of shipping", calibration["specificity_rule"])
        self.assertIn("you've got this", calibration["forbidden_phrases"])
        self.assertIn("Publish one offer today.", calibration["required_references"])

    def test_build_identity_mirror_shows_goal_behavior_gap(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        mirror = build_identity_mirror(
            mission={
                "title": "Launch Forge",
                "outcome": "Five people complete daily check-ins",
                "obstacle": "Polishing instead of testing",
                "deadline": datetime(2026, 8, 1, tzinfo=timezone.utc).date(),
            },
            commitments=[
                {
                    "text": "Publish the onboarding demo",
                    "status": "missed",
                    "times_carried": 3,
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "text": "Write the coach prompt",
                    "status": "kept",
                    "times_carried": 0,
                    "created_at": now,
                    "updated_at": now,
                },
            ],
            outputs_this_week=0,
            pattern_label="perfectionism as a shield",
            avoided_task="Publish the onboarding demo",
            summary="The user delays exposure by polishing.",
            pattern_history=[
                {
                    "pattern_label": "perfectionism as a shield",
                    "reason": "The user kept saying the demo was not ready.",
                    "created_at": now,
                }
            ],
            now=now,
        )

        self.assertIn("Launch Forge", mirror["desired_profile"])
        self.assertIn("current behavior", mirror["current_profile"])
        self.assertIn("perfectionism as a shield", mirror["identity_gap"])
        self.assertEqual(mirror["gap_level"], "wide")
        self.assertIn("No real outputs logged this week.", mirror["evidence"])
        self.assertIn("Publish the onboarding demo", " ".join(mirror["evidence"]))
        self.assertEqual(
            mirror["weekly_question"],
            "Which one are you choosing this week?",
        )

    def test_build_goal_roadmap_reverse_engineers_mission_path(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        roadmap = build_goal_roadmap(
            mission={
                "title": "Launch Forge",
                "outcome": "Five people complete daily check-ins",
                "obstacle": "Polishing instead of testing",
                "deadline": "2026-08-01",
            },
            commitments=[
                {
                    "text": "Publish the onboarding demo",
                    "status": "pending",
                    "times_carried": 0,
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "text": "Write the coach prompt",
                    "status": "kept",
                    "times_carried": 0,
                    "created_at": now,
                    "updated_at": now,
                },
            ],
            recent_outputs=[
                {
                    "description": "Created the database schema",
                    "logged_at": now,
                }
            ],
            outputs_this_week=1,
            pattern_label="perfectionism as a shield",
            now=now,
        )

        self.assertEqual(roadmap["mission"], "Launch Forge")
        self.assertIn("42 days remain", roadmap["current_position"])
        self.assertEqual(roadmap["commitments_kept"], 1)
        self.assertEqual(roadmap["outputs_this_week"], 1)
        self.assertEqual(roadmap["last_output"], "Created the database schema")
        self.assertEqual(len(roadmap["stages"]), 5)
        self.assertEqual(roadmap["stages"][-1]["label"], "Today")

    def test_build_weekly_review_creates_retention_loop(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        review = build_weekly_review(
            commitments=[
                {
                    "text": "Publish the onboarding demo",
                    "status": "missed",
                    "created_at": now,
                    "updated_at": now,
                }
            ],
            recent_outputs=[],
            weekly_summary={
                "commitments_kept": 0,
                "commitments_missed": 1,
                "commitments_pending": 0,
                "outputs_logged": 0,
            },
            pattern_label="perfectionism as a shield",
            identity_mirror={"identity_gap": "The stated identity and behavior do not match."},
            goal_roadmap={"next_milestone": "Resolve the current commitment."},
            now=now,
        )

        self.assertIn("Publish the onboarding demo", review["committed_to"])
        self.assertIn("missed 1 commitment", review["what_happened"])
        self.assertEqual(review["pattern"], "perfectionism as a shield")
        self.assertEqual(review["next_action"], "Resolve the current commitment.")
        self.assertIn("what happened", review["review_question"].lower())

    def test_build_retention_nudge_triggers_after_48_hours(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        nudge = build_retention_nudge(
            mission={"title": "Launch Forge"},
            active_commitment={"text": "Publish the onboarding demo"},
            last_checkin_at="2026-06-18T10:00:00+00:00",
            now=now,
        )

        self.assertTrue(nudge["should_nudge"])
        self.assertEqual(nudge["hours_since_checkin"], 50)
        self.assertIn("It has been 50 hours", nudge["inactivity_prompt"])
        self.assertIn("Publish the onboarding demo", nudge["morning_prompt"])

    def test_update_pattern_upserts_normalized_label(self):
        db = FakeDatabase(
            [
                {
                    "user_id": 7,
                    "pattern_label": "starts but does not finish",
                    "avoided_task": None,
                    "days_active": 0,
                    "last_checkin_at": None,
                    "summary": None,
                    "created_at": None,
                    "updated_at": None,
                }
            ]
        )

        result = update_pattern(7, "  starts   but does not finish  ", db=db)

        self.assertEqual(result["pattern_label"], "starts but does not finish")
        query, params = db.cursor_instance.executions[0]
        self.assertIn("ON CONFLICT (user_id)", query)
        self.assertEqual(params, (7, "starts but does not finish"))

    def test_update_pattern_records_reason_and_evidence_event(self):
        db = FakeDatabase(
            [
                {
                    "user_id": 7,
                    "pattern_label": "fear disguised as research",
                    "avoided_task": None,
                    "days_active": 0,
                    "last_checkin_at": None,
                    "summary": "Avoidance profile: fear disguised as research.",
                    "created_at": None,
                    "updated_at": None,
                },
                {
                    "id": 31,
                    "pattern_label": "fear disguised as research",
                    "reason": "The user is delaying exposure by asking for more learning.",
                    "evidence": ["Matched phrase: “research”"],
                    "created_at": None,
                },
            ]
        )

        result = update_pattern(
            7,
            "fear disguised as research",
            reason="The user is delaying exposure by asking for more learning.",
            evidence=["Matched phrase: “research”"],
            db=db,
        )

        self.assertEqual(result["pattern_label"], "fear disguised as research")
        self.assertEqual(result["event"]["id"], 31)
        self.assertEqual(len(db.cursor_instance.executions), 2)
        self.assertIn("summary = EXCLUDED.summary", db.cursor_instance.executions[0][0])
        self.assertIn("INSERT INTO pattern_events", db.cursor_instance.executions[1][0])

    def test_flag_avoided_task_persists_highest_carried_commitment(self):
        db = FakeDatabase(
            [
                {
                    "id": 21,
                    "mission_id": 11,
                    "text": "Send the launch email",
                    "deadline": None,
                    "status": "pending",
                    "times_carried": 4,
                },
                None,
            ]
        )

        result = flag_avoided_task(7, db=db)

        self.assertEqual(result["text"], "Send the launch email")
        query, params = db.cursor_instance.executions[1]
        self.assertIn("avoided_task = EXCLUDED.avoided_task", query)
        self.assertEqual(params, (7, "Send the launch email"))

    def test_flag_avoided_task_clears_stale_flag_when_none_qualifies(self):
        db = FakeDatabase([None, None])

        result = flag_avoided_task(7, db=db)

        self.assertIsNone(result)
        self.assertEqual(db.cursor_instance.executions[1][1], (7, None))

    def test_recalculate_pattern_records_changed_pattern_event(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                [
                    {
                        "id": 21,
                        "text": "Send the launch email",
                        "deadline": now,
                        "status": "missed",
                        "times_carried": 3,
                        "created_at": now,
                        "updated_at": now,
                    },
                    {
                        "id": 22,
                        "text": "Post the product demo",
                        "deadline": now,
                        "status": "missed",
                        "times_carried": 1,
                        "created_at": now,
                        "updated_at": now,
                    },
                ],
                {"outputs_this_week": 0},
                {"pattern_label": "pattern still forming"},
                {
                    "user_id": 7,
                    "pattern_label": "avoids the same commitment repeatedly",
                    "avoided_task": None,
                    "days_active": 0,
                    "last_checkin_at": None,
                    "summary": "Weekly pattern: avoids the same commitment repeatedly.",
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "id": 3,
                    "pattern_label": "avoids the same commitment repeatedly",
                    "reason": "A commitment crossed the carried-three-times threshold.",
                    "evidence": ["Send the launch email was carried."],
                    "created_at": now,
                },
            ]
        )

        result = recalculate_pattern(7, db=db)

        self.assertEqual(
            result["pattern_label"],
            "avoids the same commitment repeatedly",
        )
        self.assertEqual(result["previous_label"], "pattern still forming")
        self.assertIn("carried", result["reason"])
        self.assertEqual(result["event"]["id"], 3)
        self.assertIn("INSERT INTO pattern_events", db.cursor_instance.executions[4][0])

    def test_recalculate_pattern_skips_event_when_label_is_unchanged(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                [
                    {
                        "id": 21,
                        "text": "Publish the clip",
                        "deadline": now,
                        "status": "kept",
                        "times_carried": 0,
                        "created_at": now,
                        "updated_at": now,
                    },
                ],
                {"outputs_this_week": 1},
                {"pattern_label": "executes when the next action is concrete"},
                {
                    "user_id": 7,
                    "pattern_label": "executes when the next action is concrete",
                    "avoided_task": None,
                    "days_active": 0,
                    "last_checkin_at": None,
                    "summary": "Weekly pattern: executes when the next action is concrete.",
                    "created_at": now,
                    "updated_at": now,
                },
            ]
        )

        result = recalculate_pattern(7, db=db)

        self.assertIsNone(result["event"])
        self.assertEqual(len(db.cursor_instance.executions), 4)

    def test_invalid_inputs_are_rejected(self):
        with self.assertRaises(ValueError):
            get_user_context(0, db=FakeDatabase([]))
        with self.assertRaises(ValueError):
            update_pattern(7, "   ", db=FakeDatabase([]))
        with self.assertRaises(ValueError):
            recalculate_pattern(0, db=FakeDatabase([]))


if __name__ == "__main__":
    unittest.main()
