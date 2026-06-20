import unittest
from datetime import datetime, timezone

from forge_memory import (
    build_system_prompt,
    flag_avoided_task,
    get_user_context,
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
                    "created_at": now,
                    "updated_at": now,
                },
            ]
        )

        context = get_user_context(7, db=db)

        self.assertTrue(db.dictionary_requested)
        self.assertEqual(context["mission"]["title"], "Launch Forge")
        self.assertEqual(context["active_commitment"]["id"], 21)
        self.assertEqual(context["times_missed_row"], 1)
        self.assertEqual(context["outputs_this_week"], 1)
        self.assertEqual(context["pattern_label"], "commits but delays execution")
        self.assertTrue(db.cursor_instance.closed)

    def test_get_user_context_rejects_unknown_user(self):
        db = FakeDatabase([None])
        with self.assertRaises(LookupError):
            get_user_context(999, db=db)
        self.assertTrue(db.cursor_instance.closed)

    def test_build_system_prompt_injects_specific_context(self):
        prompt = build_system_prompt(
            {
                "user": {"name": "Donald", "onboarding_complete": True},
                "mission": {
                    "title": "Launch Forge",
                    "description": "Ship an execution coach",
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
                "recent_outputs": [
                    {
                        "description": "Created the schema",
                        "logged_at": "2026-06-20T12:00:00+00:00",
                    }
                ],
            }
        )

        self.assertIn("You are Forge", prompt)
        self.assertIn("Mission: Launch Forge", prompt)
        self.assertIn("Active commitment: Finish the memory service", prompt)
        self.assertIn("Pattern label: commits but does not execute", prompt)
        self.assertIn("Created the schema", prompt)
        self.assertIn("do not invent missing details", prompt)

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

    def test_invalid_inputs_are_rejected(self):
        with self.assertRaises(ValueError):
            get_user_context(0, db=FakeDatabase([]))
        with self.assertRaises(ValueError):
            update_pattern(7, "   ", db=FakeDatabase([]))


if __name__ == "__main__":
    unittest.main()
