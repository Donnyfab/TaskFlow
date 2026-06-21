import unittest
from datetime import date, datetime, timezone

from forge_coach import (
    COACH_MESSAGE_MAX_CHARS,
    extract_latest_user_message,
    get_coach_messages,
    normalize_coach_messages,
    save_coach_message,
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


if __name__ == "__main__":
    unittest.main()
