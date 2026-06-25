import unittest
from datetime import date, datetime, timezone

from forge_onboarding import (
    FORGE_ONBOARDING_COMPLETION_PROTOCOL,
    OnboardingValidationError,
    complete_onboarding,
    get_onboarding_status,
    validate_completion_payload,
)


VALID_PAYLOAD = {
    "name": "Donald",
    "desired_identity": "A consistent builder who ships in public",
    "current_struggle": "I start strong and then disappear when the work feels unclear",
    "avoided_task": "Asking real users to test the product",
    "what_matters": "Getting Forge in front of real users",
    "fall_off_trigger": "I overthink the next step and wait for the plan to feel perfect",
    "mission": "Launch Forge",
    "outcome": "Five people complete a daily check-in",
    "obstacle": "I keep polishing instead of testing",
    "pattern_label": "polishing instead of testing",
    "identity_gap": "You say you want real users, but your current behavior keeps the product away from them.",
    "deadline": "2026-08-01",
    "commitment_text": "Invite the first tester",
    "commitment_deadline": "2026-06-22T18:00:00-05:00",
    "commitment_why_it_matters": "It gets Forge in front of a real person instead of staying private.",
    "proof_required": "A sent invite message or screenshot.",
    "proof_level": "high",
}


class FakeCursor:
    def __init__(self, responses, fail_at=None):
        self.responses = list(responses)
        self.fail_at = fail_at
        self.executions = []
        self.current = None
        self.closed = False
        self.rowcount = 1

    def execute(self, query, params=()):
        self.executions.append((" ".join(query.split()), params))
        if self.fail_at == len(self.executions):
            raise RuntimeError("database write failed")
        self.current = self.responses.pop(0) if self.responses else None

    def fetchone(self):
        return self.current

    def close(self):
        self.closed = True


class FakeRawConnection:
    def __init__(self):
        self.autocommit = True
        self.commits = 0
        self.rollbacks = 0

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


class FakeDatabase:
    def __init__(self, responses, fail_at=None):
        self.raw_connection = FakeRawConnection()
        self.cursor_instance = FakeCursor(responses, fail_at=fail_at)
        self.dictionary_requested = False

    def cursor(self, dictionary=False):
        self.dictionary_requested = dictionary
        return self.cursor_instance


class ForgeOnboardingTests(unittest.TestCase):
    def test_onboarding_protocol_includes_psychological_awareness_rules(self):
        self.assertIn("Psychological awareness", FORGE_ONBOARDING_COMPLETION_PROTOCOL)
        self.assertIn("exactly one natural sentence", FORGE_ONBOARDING_COMPLETION_PROTOCOL)
        self.assertIn("analysis paralysis", FORGE_ONBOARDING_COMPLETION_PROTOCOL)
        self.assertIn("People do not open an execution coach", FORGE_ONBOARDING_COMPLETION_PROTOCOL)

    def test_validation_normalizes_and_accepts_timezone_aware_deadline(self):
        payload = dict(VALID_PAYLOAD)
        payload["mission"] = "  Launch   Forge  "

        normalized = validate_completion_payload(payload)

        self.assertEqual(normalized["mission"], "Launch Forge")
        self.assertEqual(
            normalized["commitment_deadline"],
            "2026-06-22T18:00:00-05:00",
        )

    def test_validation_reports_missing_and_malformed_fields(self):
        payload = dict(VALID_PAYLOAD)
        payload["mission"] = ""
        payload["deadline"] = "August 1"
        payload["commitment_deadline"] = "2026-06-22T18:00:00"

        with self.assertRaises(OnboardingValidationError) as raised:
            validate_completion_payload(payload)

        self.assertIn("Missing or empty: mission", raised.exception.errors)
        self.assertTrue(any("YYYY-MM-DD" in error for error in raised.exception.errors))
        self.assertTrue(any("UTC offset" in error for error in raised.exception.errors))

    def test_validation_rejects_invalid_proof_level(self):
        payload = dict(VALID_PAYLOAD)
        payload["proof_level"] = "public"

        with self.assertRaises(OnboardingValidationError) as raised:
            validate_completion_payload(payload)

        self.assertIn("proof_level must be one of: low, medium, high", raised.exception.errors)

    def test_status_comes_from_database(self):
        db = FakeDatabase([{"onboarding_complete": True}])

        result = get_onboarding_status(7, db)

        self.assertEqual(result, {"onboarding_complete": True})
        self.assertEqual(db.cursor_instance.executions[0][1], (7,))
        self.assertTrue(db.cursor_instance.closed)

    def test_completion_writes_all_records_and_commits_once(self):
        db = FakeDatabase(
            [
                {"onboarding_complete": False},
                {"id": 11},
                {"id": 21},
                None,
                None,
            ]
        )

        result = complete_onboarding(7, VALID_PAYLOAD, db)

        self.assertFalse(result["already_complete"])
        self.assertEqual(result["mission_id"], 11)
        self.assertEqual(result["commitment_id"], 21)
        self.assertEqual(db.raw_connection.commits, 1)
        self.assertEqual(db.raw_connection.rollbacks, 0)
        self.assertTrue(db.raw_connection.autocommit)
        queries = [query for query, _params in db.cursor_instance.executions]
        self.assertIn("FOR UPDATE", queries[0])
        self.assertIn("INSERT INTO missions", queries[1])
        self.assertIn("INSERT INTO commitments", queries[2])
        self.assertIn("INSERT INTO coach_memory", queries[3])
        self.assertIn("UPDATE users", queries[4])
        memory_params = db.cursor_instance.executions[3][1]
        self.assertEqual(memory_params[1], "polishing instead of testing")
        self.assertEqual(memory_params[2], "Asking real users to test the product")
        self.assertIn("Identity gap:", memory_params[3])
        self.assertIn("Proof required:", memory_params[3])
        update_params = db.cursor_instance.executions[4][1]
        self.assertEqual(update_params[0], "Donald")

    def test_completion_rolls_back_everything_when_a_write_fails(self):
        db = FakeDatabase(
            [
                {"onboarding_complete": False},
                {"id": 11},
            ],
            fail_at=3,
        )

        with self.assertRaisesRegex(RuntimeError, "database write failed"):
            complete_onboarding(7, VALID_PAYLOAD, db)

        self.assertEqual(db.raw_connection.commits, 0)
        self.assertEqual(db.raw_connection.rollbacks, 1)
        self.assertTrue(db.raw_connection.autocommit)
        self.assertTrue(db.cursor_instance.closed)

    def test_completion_retry_is_idempotent(self):
        db = FakeDatabase(
            [
                {"onboarding_complete": True},
                {
                    "id": 11,
                    "title": "Launch Forge",
                    "outcome": "Five active testers",
                    "obstacle": "Over-polishing",
                    "deadline": date(2026, 8, 1),
                },
                {
                    "id": 21,
                    "text": "Invite a tester",
                    "deadline": datetime(2026, 6, 22, 23, 0, tzinfo=timezone.utc),
                    "why_it_matters": "It gets Forge in front of a real person.",
                    "proof_required": "A sent invite message.",
                    "proof_level": "high",
                    "progress": "not_started",
                },
                {
                    "pattern_label": "polishing instead of testing",
                    "summary": "Identity gap: You say you want users but keep polishing.",
                },
            ]
        )

        result = complete_onboarding(7, VALID_PAYLOAD, db)

        self.assertTrue(result["already_complete"])
        self.assertEqual(result["mission_id"], 11)
        self.assertEqual(result["commitment_id"], 21)
        self.assertEqual(result["pattern_label"], "polishing instead of testing")
        self.assertEqual(len(db.cursor_instance.executions), 4)
        self.assertEqual(db.raw_connection.commits, 1)


if __name__ == "__main__":
    unittest.main()
