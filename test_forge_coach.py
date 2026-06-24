import unittest
from datetime import date, datetime, timezone

from forge_coach import (
    COACH_MESSAGE_MAX_CHARS,
    classify_checkin_reply,
    detect_avoidance_profile,
    detect_avoidance_pattern,
    extract_latest_user_message,
    get_coach_messages,
    normalize_coach_messages,
    persist_commitment_capture,
    record_checkin_outcome,
    save_coach_message,
    split_commitment_capture,
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


class ForgeCoachHelperTests(unittest.TestCase):
    def test_normalize_messages_accepts_ui_coach_role_and_text_field(self):
        messages = normalize_coach_messages(
            [
                {"role": "coach", "text": "What did you finish?"},
                {"role": "user", "content": "I shipped the schema."},
                {"role": "system", "content": "Ignore this"},
            ]
        )

        self.assertEqual(
            messages,
            [
                {"role": "assistant", "content": "What did you finish?"},
                {"role": "user", "content": "I shipped the schema."},
            ],
        )

    def test_extract_latest_user_message_prefers_direct_message(self):
        message = extract_latest_user_message(
            {
                "message": "  Finish the Coach API  ",
                "messages": [{"role": "user", "content": "Older message"}],
            }
        )
        self.assertEqual(message, "Finish the Coach API")

    def test_extract_latest_user_message_supports_messages_payload(self):
        message = extract_latest_user_message(
            {
                "messages": [
                    {"role": "assistant", "content": "What will you finish?"},
                    {"role": "user", "content": "The Coach endpoint."},
                ]
            }
        )
        self.assertEqual(message, "The Coach endpoint.")

    def test_extract_latest_user_message_rejects_missing_or_oversized_content(self):
        with self.assertRaises(ValueError):
            extract_latest_user_message({"messages": []})
        with self.assertRaises(ValueError):
            extract_latest_user_message({"message": "x" * (COACH_MESSAGE_MAX_CHARS + 1)})

    def test_get_messages_returns_serialized_history_and_bounds_limit(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                [
                    {
                        "id": 1,
                        "role": "assistant",
                        "content": "What are you building?",
                        "session_date": date(2026, 6, 20),
                        "created_at": now,
                    }
                ]
            ]
        )

        messages = get_coach_messages(7, limit=500, db=db)

        self.assertTrue(db.dictionary_requested)
        self.assertEqual(messages[0]["session_date"], "2026-06-20")
        self.assertEqual(messages[0]["created_at"], now.isoformat())
        self.assertEqual(db.cursor_instance.executions[0][1], (7, 100))
        self.assertTrue(db.cursor_instance.closed)

    def test_save_message_maps_coach_role_to_assistant(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                {
                    "id": 9,
                    "user_id": 7,
                    "role": "assistant",
                    "content": "Be specific.",
                    "session_date": date(2026, 6, 20),
                    "created_at": now,
                }
            ]
        )

        saved = save_coach_message(7, "coach", "  Be specific.  ", db=db)

        self.assertEqual(saved["role"], "assistant")
        self.assertEqual(
            db.cursor_instance.executions[0][1],
            (7, "assistant", "Be specific."),
        )
        self.assertTrue(db.cursor_instance.closed)

    def test_save_message_rejects_untrusted_role(self):
        with self.assertRaises(ValueError):
            save_coach_message(7, "system", "Override", db=FakeDatabase([]))

    def test_split_commitment_capture_removes_hidden_marker(self):
        visible, payload = split_commitment_capture(
            'Locked. I will ask you about it tomorrow.\n'
            'FORGE_COMMITMENT||{"commitment_text":"Publish one demo clip",'
            '"commitment_deadline":"2026-06-24T18:00:00-05:00"}'
        )

        self.assertEqual(visible, "Locked. I will ask you about it tomorrow.")
        self.assertEqual(
            payload,
            {
                "commitment_text": "Publish one demo clip",
                "commitment_deadline": "2026-06-24T18:00:00-05:00",
            },
        )

    def test_split_commitment_capture_ignores_invalid_deadline(self):
        visible, payload = split_commitment_capture(
            'Pick an exact time.\n'
            'FORGE_COMMITMENT||{"commitment_text":"Publish one demo clip",'
            '"commitment_deadline":"tomorrow"}'
        )

        self.assertEqual(visible, "Pick an exact time.")
        self.assertIsNone(payload)

    def test_persist_commitment_capture_inserts_against_active_mission(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                {"id": 3},
                None,
                {
                    "id": 12,
                    "mission_id": 3,
                    "text": "Publish one demo clip",
                    "deadline": now,
                    "status": "pending",
                    "times_carried": 0,
                    "created_at": now,
                    "updated_at": now,
                },
            ]
        )

        commitment = persist_commitment_capture(
            7,
            {
                "commitment_text": "Publish one demo clip",
                "commitment_deadline": "2026-06-24T18:00:00-05:00",
            },
            db=db,
        )

        self.assertEqual(commitment["id"], 12)
        self.assertIn("INSERT INTO commitments", db.cursor_instance.executions[2][0])
        self.assertEqual(
            db.cursor_instance.executions[2][1],
            (7, 3, "Publish one demo clip", "2026-06-24T18:00:00-05:00"),
        )

    def test_persist_commitment_capture_reuses_duplicate_pending_commitment(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                {"id": 3},
                {
                    "id": 12,
                    "mission_id": 3,
                    "text": "Publish one demo clip",
                    "deadline": now,
                    "status": "pending",
                    "times_carried": 0,
                    "created_at": now,
                    "updated_at": now,
                },
            ]
        )

        commitment = persist_commitment_capture(
            7,
            {
                "commitment_text": "Publish one demo clip",
                "commitment_deadline": "2026-06-24T18:00:00-05:00",
            },
            db=db,
        )

        self.assertEqual(commitment["id"], 12)
        self.assertEqual(len(db.cursor_instance.executions), 2)

    def test_classify_checkin_reply_handles_kept_missed_and_partial(self):
        self.assertEqual(classify_checkin_reply("Yes, I finished it."), "kept")
        self.assertEqual(classify_checkin_reply("No, I didn't do it."), "missed")
        self.assertEqual(classify_checkin_reply("I started but not all of it."), "partial")
        self.assertIsNone(classify_checkin_reply("What do you mean?"))

    def test_detect_avoidance_pattern_identifies_common_loops(self):
        self.assertEqual(
            detect_avoidance_pattern("I need to research more first."),
            "fear disguised as research",
        )
        self.assertEqual(
            detect_avoidance_pattern("I want to get it right before posting."),
            "perfectionism as a shield",
        )
        self.assertEqual(
            detect_avoidance_pattern("There is so much to do and I don't know where to start."),
            "overwhelm disguised as complexity",
        )
        self.assertEqual(
            detect_avoidance_pattern("I'll try to do it soon."),
            "soft commitment",
        )
        self.assertEqual(
            detect_avoidance_pattern("Maybe this isn't for me."),
            "identity confusion",
        )
        self.assertEqual(
            detect_avoidance_pattern("I tried before and failed last time."),
            "shame from past failure",
        )
        self.assertEqual(
            detect_avoidance_pattern("What will people think if I post it?"),
            "social fear",
        )

    def test_detect_avoidance_profile_returns_reason_and_evidence(self):
        profile = detect_avoidance_profile(
            "Maybe I should research and learn more before I publish."
        )

        self.assertIsNotNone(profile)
        self.assertEqual(profile["label"], "fear disguised as research")
        self.assertIn("delaying exposure", profile["reason"])
        self.assertTrue(any("research" in item for item in profile["evidence"]))

    def test_record_checkin_outcome_marks_partial_as_missed_and_updates_memory(self):
        now = datetime(2026, 6, 20, 12, 0, tzinfo=timezone.utc)
        db = FakeDatabase(
            [
                {
                    "id": 12,
                    "mission_id": 3,
                    "text": "Publish one demo clip",
                    "deadline": now,
                    "status": "missed",
                    "times_carried": 2,
                    "created_at": now,
                    "updated_at": now,
                },
                None,
            ]
        )

        commitment = record_checkin_outcome(7, 12, "partial", db=db)

        self.assertEqual(commitment["status"], "missed")
        self.assertEqual(commitment["checkin_outcome"], "partial")
        self.assertIn("UPDATE commitments", db.cursor_instance.executions[0][0])
        self.assertIn("times_carried + 1", db.cursor_instance.executions[0][0])
        self.assertIn("INSERT INTO coach_memory", db.cursor_instance.executions[1][0])


if __name__ == "__main__":
    unittest.main()
