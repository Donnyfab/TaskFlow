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


class StubCursor:
    def __init__(self, rows):
        self.rows = list(rows)
        self.queries = []

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchone(self):
        return self.rows.pop(0) if self.rows else None

    def close(self):
        pass


class StubDatabase:
    def __init__(self, rows):
        self.cursor_instance = StubCursor(rows)

    def cursor(self, dictionary=False):
        return self.cursor_instance


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

    def test_onboarding_endpoints_require_authentication(self):
        status_response = self.client.get("/api/onboarding/status")
        complete_response = self.client.post("/api/onboarding/complete", json={})

        self.assertEqual(status_response.status_code, 401)
        self.assertEqual(complete_response.status_code, 401)

    def test_forge_page_mutations_require_authentication(self):
        mission = self.client.patch("/api/forge/mission", json={"status": "completed"})
        commitment = self.client.patch(
            "/api/forge/commitments/4",
            json={"status": "kept"},
        )
        output = self.client.post(
            "/api/forge/outputs",
            json={"description": "Published the launch page"},
        )

        self.assertEqual(mission.status_code, 401)
        self.assertEqual(commitment.status_code, 401)
        self.assertEqual(output.status_code, 401)

    def test_active_mission_can_be_updated(self):
        self.login(7)
        database = StubDatabase([
            {
                "id": 3,
                "title": "Launch Forge",
                "description": "Ship the first release",
                "outcome": "Five active users",
                "status": "active",
            }
        ])
        with (
            patch.object(app_module, "get_db", return_value=database),
            patch.object(app_module, "invalidate_user_cached_data") as invalidate,
        ):
            response = self.client.patch(
                "/api/forge/mission",
                json={
                    "description": "Ship the first release",
                    "outcome": "Five active users",
                    "deadline": "2026-08-01",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["mission"]["id"], 3)
        invalidate.assert_called_once_with(7)
        query, params = database.cursor_instance.queries[0]
        self.assertIn("UPDATE missions", query)
        self.assertEqual(params[-1], 7)

    def test_commitment_status_updates_coach_checkin(self):
        self.login(7)
        database = StubDatabase([
            {
                "id": 4,
                "mission_id": 3,
                "text": "Publish the landing page",
                "status": "kept",
                "times_carried": 0,
            }
        ])
        with (
            patch.object(app_module, "get_db", return_value=database),
            patch.object(app_module, "invalidate_user_cached_data") as invalidate,
        ):
            response = self.client.patch(
                "/api/forge/commitments/4",
                json={"status": "kept"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["commitment"]["status"], "kept")
        self.assertEqual(len(database.cursor_instance.queries), 2)
        self.assertIn("INSERT INTO coach_memory", database.cursor_instance.queries[1][0])
        invalidate.assert_called_once_with(7)

    def test_output_is_logged_against_active_mission(self):
        self.login(7)
        database = StubDatabase([
            {
                "id": 8,
                "mission_id": 3,
                "description": "Published the launch page",
                "logged_at": "2026-06-21T12:00:00",
            }
        ])
        with (
            patch.object(app_module, "get_db", return_value=database),
            patch.object(app_module, "invalidate_user_cached_data") as invalidate,
        ):
            response = self.client.post(
                "/api/forge/outputs",
                json={"description": "Published the launch page"},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["output"]["mission_id"], 3)
        query, params = database.cursor_instance.queries[0]
        self.assertIn("INSERT INTO outputs", query)
        self.assertEqual(params, (7, "Published the launch page", 7))
        invalidate.assert_called_once_with(7)

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
        self.assertIn("Forge system prompt", call_anthropic.call_args.kwargs["system"])
        self.assertIn(
            "COMMITMENT CAPTURE PROTOCOL",
            call_anthropic.call_args.kwargs["system"],
        )
        self.assertEqual(
            call_anthropic.call_args.kwargs["messages"],
            [{"role": "user", "content": "Ship Forge"}],
        )

    @patch.object(
        app_module,
        "extract_anthropic_text",
        return_value=(
            "Locked. I will ask you about it tomorrow.\n"
            'FORGE_COMMITMENT||{"commitment_text":"Publish one demo clip",'
            '"commitment_deadline":"2026-06-24T18:00:00-05:00"}'
        ),
    )
    @patch.object(
        app_module,
        "call_anthropic_messages_api",
        return_value=AnthropicResponse("unused"),
    )
    @patch.object(app_module, "create_anthropic_client", return_value=object())
    @patch.object(
        app_module,
        "persist_commitment_capture",
        return_value={
            "id": 12,
            "text": "Publish one demo clip",
            "deadline": "2026-06-24T23:00:00+00:00",
            "status": "pending",
        },
    )
    @patch.object(
        app_module,
        "save_coach_message",
        side_effect=[
            {"id": 1, "role": "user", "content": "I will publish it."},
            {
                "id": 2,
                "role": "assistant",
                "content": "Locked. I will ask you about it tomorrow.",
            },
        ],
    )
    @patch.object(app_module, "get_coach_messages", return_value=[])
    @patch.object(app_module, "build_system_prompt", return_value="Forge system prompt")
    @patch.object(app_module, "get_user_context", return_value={"user": {"id": 7}})
    @patch.object(app_module, "get_db", return_value=object())
    def test_post_strips_and_persists_commitment_capture(
        self,
        get_db,
        _get_user_context,
        _build_system_prompt,
        _get_messages,
        save_message,
        persist_capture,
        _create_client,
        _call_anthropic,
        _extract_text,
    ):
        self.login(7)
        with (
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"}),
            patch.object(app_module, "invalidate_user_cached_data") as invalidate,
        ):
            response = self.client.post(
                "/api/coach",
                json={"message": "I will publish it."},
            )

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["reply"], "Locked. I will ask you about it tomorrow.")
        self.assertNotIn("FORGE_COMMITMENT", body["reply"])
        self.assertEqual(body["commitment"]["id"], 12)
        persist_capture.assert_called_once_with(
            7,
            {
                "commitment_text": "Publish one demo clip",
                "commitment_deadline": "2026-06-24T18:00:00-05:00",
            },
            db=get_db.return_value,
        )
        self.assertEqual(
            save_message.call_args_list[1].args[:3],
            (7, "assistant", "Locked. I will ask you about it tomorrow."),
        )
        invalidate.assert_called_once_with(7)

    @patch.object(app_module, "extract_anthropic_text", return_value="What happened when the time came?")
    @patch.object(
        app_module,
        "call_anthropic_messages_api",
        return_value=AnthropicResponse("What happened when the time came?"),
    )
    @patch.object(app_module, "create_anthropic_client", return_value=object())
    @patch.object(
        app_module,
        "save_coach_message",
        side_effect=[
            {"id": 1, "role": "user", "content": "No, I didn't do it."},
            {"id": 2, "role": "assistant", "content": "What happened when the time came?"},
        ],
    )
    @patch.object(app_module, "get_coach_messages", return_value=[])
    @patch.object(app_module, "build_system_prompt", return_value="Forge system prompt")
    @patch.object(
        app_module,
        "get_user_context",
        side_effect=[
            {
                "user": {"id": 7},
                "due_commitment": {"id": 12, "text": "Publish one demo clip"},
            },
            {
                "user": {"id": 7},
                "due_commitment": None,
                "pattern_label": "fear disguised as research",
            },
        ],
    )
    @patch.object(app_module, "get_db", return_value=object())
    def test_post_records_due_checkin_and_pattern_before_response(
        self,
        get_db,
        _get_user_context,
        _build_system_prompt,
        _get_messages,
        _save_message,
        _create_client,
        call_anthropic,
        _extract_text,
    ):
        self.login(7)
        with (
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"}),
            patch.object(app_module, "update_pattern") as update_pattern,
            patch.object(
                app_module,
                "record_checkin_outcome",
                return_value={
                    "id": 12,
                    "text": "Publish one demo clip",
                    "status": "missed",
                    "checkin_outcome": "missed",
                },
            ) as record_outcome,
            patch.object(app_module, "flag_avoided_task") as flag_avoided,
            patch.object(app_module, "invalidate_user_cached_data") as invalidate,
        ):
            response = self.client.post(
                "/api/coach",
                json={"message": "No, I didn't do it. I kept researching."},
            )

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["checkin"]["status"], "missed")
        self.assertEqual(body["pattern"], "fear disguised as research")
        update_pattern.assert_called_once_with(
            7,
            "fear disguised as research",
            db=get_db.return_value,
        )
        record_outcome.assert_called_once_with(
            7,
            12,
            "missed",
            db=get_db.return_value,
        )
        flag_avoided.assert_called_once_with(7, db=get_db.return_value)
        invalidate.assert_called_with(7)
        self.assertIn("CURRENT CHECK-IN OUTCOME", call_anthropic.call_args.kwargs["system"])

    def test_post_rejects_empty_message_before_calling_anthropic(self):
        self.login(7)
        response = self.client.post("/api/coach", json={"message": "   "})
        self.assertEqual(response.status_code, 400)
        self.assertIn("required", response.get_json()["error"])

    def test_onboarding_status_uses_authenticated_session_user(self):
        self.login(7)
        database = object()
        with (
            patch.object(app_module, "get_db", return_value=database),
            patch.object(
                app_module,
                "get_onboarding_status",
                return_value={"onboarding_complete": False},
            ) as get_status,
        ):
            response = self.client.get("/api/onboarding/status")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()["onboarding_complete"])
        get_status.assert_called_once_with(7, database)

    def test_onboarding_complete_ignores_client_user_id(self):
        self.login(7)
        database = object()
        payload = {
            "user_id": 999,
            "mission": "Launch Forge",
            "outcome": "Five active testers",
            "obstacle": "Over-polishing",
            "deadline": "2026-08-01",
            "commitment_text": "Invite one tester",
            "commitment_deadline": "2026-06-22T18:00:00-05:00",
        }
        with (
            patch.object(app_module, "get_db", return_value=database),
            patch.object(
                app_module,
                "complete_onboarding",
                return_value={"success": True, "mission_id": 11},
            ) as complete,
            patch.object(app_module, "invalidate_user_cached_data") as invalidate,
        ):
            response = self.client.post("/api/onboarding/complete", json=payload)

        self.assertEqual(response.status_code, 200)
        complete.assert_called_once_with(7, payload, database)
        invalidate.assert_called_once_with(7)

    def test_onboarding_validation_errors_return_422(self):
        self.login(7)
        with (
            patch.object(app_module, "get_db", return_value=object()),
            patch.object(
                app_module,
                "complete_onboarding",
                side_effect=app_module.OnboardingValidationError(
                    ["Missing or empty: mission"]
                ),
            ),
        ):
            response = self.client.post("/api/onboarding/complete", json={})

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.get_json()["details"],
            ["Missing or empty: mission"],
        )

    def test_onboarding_mode_adds_completion_protocol_and_timezone(self):
        self.login(7)
        saved_messages = [
            {"id": 1, "role": "user", "content": "I want to launch Forge"},
            {"id": 2, "role": "assistant", "content": "What does done look like?"},
        ]
        with (
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"}),
            patch.object(app_module, "get_db", return_value=object()),
            patch.object(
                app_module,
                "get_user_context",
                return_value={
                    "user": {"id": 7, "onboarding_complete": False}
                },
            ),
            patch.object(app_module, "build_system_prompt", return_value="Base prompt"),
            patch.object(app_module, "get_coach_messages", return_value=[]),
            patch.object(
                app_module,
                "save_coach_message",
                side_effect=saved_messages,
            ),
            patch.object(app_module, "create_anthropic_client", return_value=object()),
            patch.object(
                app_module,
                "call_anthropic_messages_api",
                return_value=AnthropicResponse("What does done look like?"),
            ) as call_anthropic,
        ):
            response = self.client.post(
                "/api/coach",
                json={
                    "message": "I want to launch Forge",
                    "mode": "onboarding",
                    "timezone": "America/Chicago",
                },
            )

        self.assertEqual(response.status_code, 200)
        system_prompt = call_anthropic.call_args.kwargs["system"]
        self.assertIn("ONBOARDING COMPLETION PROTOCOL", system_prompt)
        self.assertIn("User timezone: America/Chicago", system_prompt)
        self.assertIn("FORGE_COMPLETE||", system_prompt)
        self.assertIn("last 30 days", system_prompt)
        self.assertIn("gap between their stated", system_prompt)

    def test_registration_routes_new_user_to_onboarding(self):
        with (
            patch.object(app_module, "fetch_user_by_username", return_value=None),
            patch.object(app_module, "fetch_user_by_email", return_value=None),
            patch.object(app_module, "create_user_local", return_value=42),
            patch.object(
                app_module,
                "generate_email_verification_token",
                return_value="verification-token",
            ),
            patch.object(app_module, "set_email_verification_token"),
            patch.object(app_module, "_send_registration_emails_bg"),
        ):
            response = self.client.post(
                "/register",
                data={
                    "first_name": "Donald",
                    "last_name": "Fabuluje",
                    "email": "donald@example.com",
                    "username": "donny",
                    "password": "secure-test-password",
                },
                follow_redirects=False,
            )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.headers["Location"],
            f"{app_module.APP_PUBLIC_URL}/onboarding",
        )
        with self.client.session_transaction() as session:
            self.assertEqual(session["user_id"], 42)


if __name__ == "__main__":
    unittest.main()
