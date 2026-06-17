from typing import Optional
from app.config import settings


def get_anthropic_client():
    if not settings.anthropic_api_key:
        return None
    import anthropic
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def get_gemini_model():
    if not settings.gemini_api_key:
        return None
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel("gemini-2.5-flash-lite")


async def generate_motivational_message() -> str:
    client = get_anthropic_client()
    if not client:
        from app.services.motivational import get_local_message
        return get_local_message()

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=150,
        messages=[{
            "role": "user",
            "content": (
                "Generate one short (1-2 sentences), funny yet genuinely motivational message "
                "for someone using their personal life planner. Be witty, warm, and specific. "
                "No hashtags. No emojis. Just the message text."
            ),
        }],
    )
    return response.content[0].text.strip()


async def generate_weekly_review(week_data: dict) -> str:
    client = get_anthropic_client()
    if not client:
        return "AI review unavailable — add your ANTHROPIC_API_KEY to .env to enable this feature."

    prompt = f"""You are a thoughtful personal coach reviewing someone's week.

Week data:
- Completed tasks: {week_data.get('completed_tasks', 0)} / {week_data.get('total_tasks', 0)}
- Active habits: {week_data.get('active_habits', [])}
- Avg mood: {week_data.get('avg_mood', 'N/A')} / 10
- Avg energy: {week_data.get('avg_energy', 'N/A')} / 10
- Weekly priorities: {week_data.get('priorities', [])}
- Notes: {week_data.get('notes', '')}

Write a warm, honest, 3-paragraph weekly review. Cover: what went well, what to improve, and one specific focus for next week. Be direct and supportive, not generic."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


async def parse_natural_language_task(text: str) -> dict:
    model = get_gemini_model()
    if not model:
        return {"title": text, "priority": "medium", "tags": ""}

    prompt = f"""Parse this natural language task input and return JSON only.

Input: "{text}"

Return JSON with these fields:
- title: string (clean task title)
- priority: "low" | "medium" | "high"
- estimated_minutes: number or null
- tags: comma-separated string or ""
- task_date: "YYYY-MM-DD" or null (if a date is mentioned)

Only return valid JSON, nothing else."""

    response = model.generate_content(prompt)
    import json
    try:
        text_response = response.text.strip()
        if text_response.startswith("```"):
            text_response = text_response.split("```")[1]
            if text_response.startswith("json"):
                text_response = text_response[4:]
        return json.loads(text_response.strip())
    except Exception:
        return {"title": text, "priority": "medium", "estimated_minutes": None, "tags": "", "task_date": None}


ALLOWED_KINDS = {"monthly", "weekly", "habit", "task"}


def _build_chat_system_instruction(ctx: dict) -> str:
    return f"""You are the planning assistant inside "Life Planner", a personal goal app.
The user describes goals in natural language. Help them shape goals into concrete,
trackable items that fit the app's hierarchy:
- "monthly": a Monthly Focus — a theme/objective for the whole month
- "weekly":  a Weekly Priority — one concrete win for this week
- "habit":   a repeatable daily/weekly Habit
- "task":    a single Daily Task for today

The user's current plan (build on these; do NOT duplicate them):
- Monthly focuses: {ctx.get('monthly') or 'none'}
- Weekly priorities: {ctx.get('weekly') or 'none'}
- Active habits: {ctx.get('habits') or 'none'}
- Today's tasks: {ctx.get('tasks') or 'none'}

You are a normal conversational partner first. Hold a real conversation:
- If the user greets you, asks a question, or makes small talk (e.g. "hi", "why",
  "what can you do?"), reply warmly and return an EMPTY suggestions array.
- Only propose plan items when the user expresses a concrete goal or intent to plan
  (e.g. "help me get fit", "I want to read more"). When unsure, ask a brief
  follow-up question instead of guessing — still with an empty suggestions array.
- When you do suggest, give 1-4 short, actionable items.

"suggestions" is ALWAYS a JSON array of OBJECTS (never plain strings). Use [] when
you have nothing concrete to add.

Respond with JSON ONLY, matching exactly this shape:
{{"message": "<conversational reply>", "suggestions": [{{"kind": "monthly|weekly|habit|task", "title": "<short title>", "description": "<one short sentence>"}}]}}

Examples:
- User "hi" -> {{"message": "Hi! What would you like to work on today?", "suggestions": []}}
- User "help me get fit" -> {{"message": "Love it — let's make it stick:", "suggestions": [{{"kind": "habit", "title": "Walk 30 min daily", "description": "A simple daily activity habit."}}]}}"""


async def chat_with_assistant(messages: list[dict], ctx: dict) -> dict:
    """Goal-planning chat. Returns {"message": str, "suggestions": [{kind,title,description}]}."""
    if not settings.gemini_api_key:
        return {
            "message": "The assistant isn't connected yet. Add GEMINI_API_KEY to backend/.env "
                       "and restart the backend to enable it.",
            "suggestions": [],
        }

    import json
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        "gemini-2.5-flash-lite",
        system_instruction=_build_chat_system_instruction(ctx),
        generation_config={"response_mime_type": "application/json"},
    )

    # Map chat history to Gemini's content format ("assistant" -> "model").
    contents = []
    for m in messages:
        text = (m.get("content") or "").strip()
        if not text:
            continue
        role = "model" if m.get("role") == "assistant" else "user"
        contents.append({"role": role, "parts": [text]})
    # Gemini requires the conversation to start with a user turn.
    while contents and contents[0]["role"] == "model":
        contents.pop(0)
    if not contents:
        return {"message": "Tell me what you'd like to work on.", "suggestions": []}

    try:
        response = await model.generate_content_async(contents)
    except Exception as e:
        name = type(e).__name__
        if "ResourceExhausted" in name or "429" in str(e):
            return {
                "message": "I've hit Gemini's rate limit for now — that's a quota cap on the "
                           "API key, not your plan. Give it a minute and try again.",
                "suggestions": [],
            }
        return {
            "message": "Sorry, I hit an error talking to the AI. Please try again.",
            "suggestions": [],
        }

    # Safely extract the model's text (can raise if the response was blocked/empty).
    try:
        raw_text = response.text
    except Exception:
        return {"message": "The AI returned an empty response. Please try again.", "suggestions": []}

    try:
        data = json.loads(raw_text)
    except Exception:
        # Not valid JSON — fall back to showing the plain text as the message.
        return {"message": raw_text.strip() or "Please try again.", "suggestions": []}

    message = str(data.get("message", "")).strip() or "Here are a few ideas."
    suggestions = []
    raw_suggestions = data.get("suggestions")
    if isinstance(raw_suggestions, list):
        for s in raw_suggestions[:4]:
            if not isinstance(s, dict):  # model sometimes returns bare strings — skip them
                continue
            kind = str(s.get("kind", "")).lower().strip()
            title = str(s.get("title", "")).strip()
            if kind in ALLOWED_KINDS and title:
                desc = str(s.get("description", "")).strip()
                suggestions.append({"kind": kind, "title": title, "description": desc or None})

    return {"message": message, "suggestions": suggestions}
