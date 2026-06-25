import unittest
from datetime import date

from forge_testing_agents import generate_daily_agent_report, get_testing_personas


class ForgeTestingAgentTests(unittest.TestCase):
    def test_personas_include_required_long_term_profiles(self):
        slugs = {persona["slug"] for persona in get_testing_personas()}

        self.assertEqual(
            slugs,
            {"drifter", "dreamer", "builder", "burned_out_operator"},
        )

    def test_daily_report_generates_one_row_per_persona_per_day(self):
        report = generate_daily_agent_report(start_date=date(2026, 6, 24), days=2)

        self.assertEqual(len(report), 8)
        self.assertEqual(report[0]["date"], "2026-06-24")
        self.assertIn("expected_coach_behavior", report[0])
        self.assertIn("failure_signals", report[0])

    def test_daily_report_rejects_non_positive_days(self):
        with self.assertRaises(ValueError):
            generate_daily_agent_report(days=0)


if __name__ == "__main__":
    unittest.main()
