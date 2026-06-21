import os
import unittest
from unittest.mock import patch


# Prevent app.py from opening a real database pool while this module imports.
os.environ["DATABASE_URL"] = ""
os.environ.setdefault("FLASK_SECRET_KEY", "forge-coach-test-secret")

import app as app_module


class TextBlock:
    def __init__(self, text):
        self.text = text


class AnthropicResponse:
    def __init__(self, text):
        self.content = [TextBlock(text)]


class ForgeCoachApiTests(unittest.TestCase):
    def setUp(self):
        app_module.app.config.update(TESTING=True, SECRET_KEY="forge-coach-test-secret")
        self.client = app_module.app.test_client()

    def login(self, user_id=7):
        with self.client.session_transaction() as session:
            session["user_id"] = user_id

    def test_context_requires_authentication(self):
        response = self.client.get("/api/coach/context")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["error"], "unauthorized")

    @patch.object(
        app_module,
        "fetch_user_by_id",
        return_value={
            "name": "Donald",
            "username": "donny",
            "email": "donald@example.com",
            "profile_image": None,
            "onboarding_complete": False,
        },
    )
    def test_me_exposes_onboarding_state(self, _fetch_user):
        self.login(7)
        response = self.client.get("/api/me")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()["onboarding_complete"])

    @patch.object(app_module, "get_coach_messages", return_value=[])
    @patch.object(app_module, "get_user_context", return_value={"user": {"id": 7}})
    @patch.object(app_module, "get_db", return_value=object())
    def test_context_uses_authenticated_session_user(
        self,
        _get_db,
        get_user_context,
        _get_messages,
    ):
        self.login(7)
        response = self.client.get("/api/coach/context")

        self.assertEqual(response.status_code, 200)
        get_user_context.assert_called_once_with(7, db=_get_db.return_value)

    @patch.object(app_module, "extract_anthropic_text", return_value="Name the deadline.")
    @patch.object(app_module, "call_anthropic_messages_api", return_value=AnthropicResponse("Name the deadline."))
    @patch.object(app_module, "create_anthropic_client", return_value=object())
    @patch.object(
        app_module,
        "save_coach_message",
        side_effect=[
            {"id": 1, "role": "user", "content": "Ship Forge"},
            {"id": 2, "role": "assistant", "content": "Name the deadline."},
        ],
    )
    @patch.object(app_module, "get_coach_messages", return_value=[])
    @patch.object(app_module, "build_system_prompt", return_value="Forge system prompt")
    @patch.object(app_module, "get_user_context", return_value={"user": {"id": 7}})
    @patch.object(app_module, "get_db", return_value=object())
    def test_post_ignores_client_user_id_and_persists_exchange(
        self,
        get_db,
        get_user_context,
        build_system_prompt,
        _get_messages,
        save_message,
        _create_client,
        call_anthropic,
        _extract_text,
    ):
        self.login(7)
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"}):
            response = self.client.post(
                "/api/coach",
                json={"user_id": 999, "message": "Ship Forge"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["reply"], "Name the deadline.")
        get_user_context.assert_called_once_with(7, db=get_db.return_value)
        build_system_prompt.assert_called_once_with({"user": {"id": 7}})
        self.assertEqual(save_message.call_args_list[0].args[:3], (7, "user", "Ship Forge"))
        self.assertEqual(
            save_message.call_args_list[1].args[:3],
            (7, "assistant", "Name the deadline."),
        )
        self.assertEqual(call_anthropic.call_args.kwargs["system"], "Forge system prompt")
        self.assertEqual(
            call_anthropic.call_args.kwargs["messages"],
            [{"role": "user", "content": "Ship Forge"}],
        )

    def test_post_rejects_empty_message_before_calling_anthropic(self):
        self.login(7)
        response = self.client.post("/api/coach", json={"message": "   "})
        self.assertEqual(response.status_code, 400)
        self.assertIn("required", response.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
