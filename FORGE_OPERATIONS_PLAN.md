# Forge operations plan

This file covers the improvement-plan items that are operational rather than one screen of UI. Roadmap generation and research-agent planning are intentionally excluded for now.

## Persistent testing agents

Use `forge_testing_agents.py` to simulate the four long-term user types Forge should handle:

- Drifter: vague, inconsistent, avoids naming the real goal.
- Dreamer: ambitious, loves planning, resists shipping.
- Builder: already executing, needs sharper strategy and proof.
- Burned-Out Operator: overloaded, needs smaller commitments without losing accountability.

Basic usage:

```bash
python3 - <<'PY'
from forge_testing_agents import generate_daily_agent_report

for row in generate_daily_agent_report(days=7):
    print(row)
PY
```

For now this creates deterministic daily scenarios and expected coaching checks. The next step is wiring these personas into a scheduled test harness that calls `/api/phone/coach` or `/api/coach` with disposable test users and stores the responses for review.

## Human beta testing

Before charging, run roughly 25 real users through the product.

Track only behavior-changing metrics:

- Day 2 return rate.
- Day 7 return rate.
- Number of commitments created.
- Number of commitments resolved with proof.
- Number of outputs logged.
- Whether users can explain their current mission without looking at the app.
- Whether users say Forge reflected a real pattern they recognize.

Do not optimize for compliments. Optimize for whether the user came back and did the thing they committed to.

## Phone coach integration

The backend now exposes a provider-ready endpoint:

```http
POST /api/phone/coach
X-Forge-Phone-Secret: <PHONE_WEBHOOK_SECRET>
Content-Type: application/json

{
  "user_id": 7,
  "message": "I did not finish it. I kept planning."
}
```

Response:

```json
{
  "ok": true,
  "reply": "Short Forge response",
  "commitment": null,
  "messages": []
}
```

Required environment variable:

- `PHONE_WEBHOOK_SECRET`

What still needs a provider:

- Twilio, iMessage bridge, WhatsApp, or another SMS/chat provider.
- Mapping phone numbers to Forge user IDs.
- Inbound webhook forwarding to `/api/phone/coach`.
- Outbound reply sending through the provider.

The endpoint is intentionally short-form. It uses the same Forge memory, pattern detection, commitment capture, and proof/accountability rules as the web Coach.

## Communication style

Forge should adapt the style to the user’s behavior:

- Beginner: explain only enough to remove confusion.
- Intermediate: focus on accountability, deadlines, and proof.
- Advanced: focus on constraints, leverage, and bottlenecks.
- Burned out: shrink scope without removing accountability.
- Consistent: optimize systems and feedback loops.

Messages should stay short enough to feel like a real coach in a text thread: one to three sentences unless the user explicitly asks for detail.
