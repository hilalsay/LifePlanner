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
    return genai.GenerativeModel("gemini-1.5-flash")


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
