import re
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


_LANG_NAME = {"en": "English", "tr": "Turkish"}


def _build_chat_system_instruction(ctx: dict, language: str = "en") -> str:
    from datetime import date
    lang_name = _LANG_NAME.get(language, "English")
    today = date.today()
    today_str = today.isoformat()
    weekday = today.strftime("%A")
    return f"""You are the planning assistant inside "Life Planner", a personal goal app.

Always write the "message" field in {lang_name}, regardless of the language the user writes in. Suggestion "kind" values stay in English (monthly/weekly/habit/task), but titles and descriptions should be in {lang_name}.
The user describes goals in natural language. Help them shape goals into concrete,
trackable items that fit the app's hierarchy:
- "monthly": a Monthly Focus — a theme/objective for the whole month
- "weekly":  a Weekly Priority — one concrete win for this week
- "habit":   a repeatable daily/weekly Habit
- "task":    a single Daily Task (today by default, or a specific day)

Today is {weekday}, {today_str}. For "task" suggestions you MAY include a "date"
field in YYYY-MM-DD format when the user asks for or implies a specific day
(e.g. "tomorrow", "this Friday", "next Monday"). Resolve such phrases to an actual
date relative to today. Omit "date" (or use today) for tasks meant for today.
Only "task" items use "date"; never add it to monthly/weekly/habit.

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
- When you do suggest, give 1-4 short, actionable items by default. If the user asks for a
  specific number of items (e.g. "10 tasks", "break my day into 20 steps"), give exactly that
  many, up to 25. Never refuse or shorten because the number is large.
  When the user asks you to create, split or plan a number of items, produce them right away
  in "suggestions" instead of asking follow-up questions first.
- Every item, no matter how many, must be its own object in the "suggestions" array. Never put
  a list of items inside "message" and never describe the items in prose instead.

"suggestions" is ALWAYS a JSON array of OBJECTS (never plain strings). Use [] when
you have nothing concrete to add.

OUTPUT FORMAT (strict): your entire reply is ONE JSON object and nothing else. No markdown,
no ``` code fences, no text before or after the JSON. Keep "message" to one or two short
sentences; put all items in "suggestions". Escape any double quotes inside strings.
Respond with JSON ONLY, matching exactly this shape:
{{"message": "<conversational reply>", "suggestions": [{{"kind": "monthly|weekly|habit|task", "title": "<short title>", "description": "<one short sentence>", "date": "YYYY-MM-DD (optional, task only)"}}]}}

Examples:
- User "hi" -> {{"message": "Hi! What would you like to work on today?", "suggestions": []}}
- User "help me get fit" -> {{"message": "Love it — let's make it stick:", "suggestions": [{{"kind": "habit", "title": "Walk 30 min daily", "description": "A simple daily activity habit."}}]}}
- User "remind me to call the dentist tomorrow" -> {{"message": "Added for tomorrow:", "suggestions": [{{"kind": "task", "title": "Call the dentist", "description": "Scheduled for tomorrow.", "date": "<tomorrow's date>"}}]}}"""


MAX_SUGGESTIONS = 25


def _salvage_truncated(text: str) -> Optional[dict]:
    """Recover complete suggestion objects from a reply cut off mid-JSON (token limit)."""
    import json
    m = re.search(r'"message"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
    sug_at = text.find('"suggestions"')
    if not m or sug_at < 0:
        return None
    body = text[text.find("[", sug_at) + 1:]
    items, depth, start, in_str, esc = [], 0, None, False, False
    for i, ch in enumerate(body):
        if in_str:
            esc = (ch == "\\") and not esc
            if ch == '"' and not esc:
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}" and depth:
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    items.append(json.loads(body[start:i + 1]))
                except Exception:
                    pass
    try:
        message = json.loads('"' + m.group(1) + '"')
    except Exception:
        message = m.group(1)
    return {"message": message, "suggestions": items}


def _extract_json_object(raw_text: str) -> Optional[dict]:
    """Find the reply object even when the model adds prose or a ```json fence around it."""
    import json
    text = (raw_text or "").strip()
    candidates = [text]
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if fenced:
        candidates.append(fenced.group(1).strip())
    start, end = text.find("{"), text.rfind("}")
    if 0 <= start < end:
        candidates.append(text[start:end + 1])
    for c in candidates:
        try:
            data = json.loads(c)
        except Exception:
            continue
        if isinstance(data, dict):
            return data
    return _salvage_truncated(text)


def _parse_chat_json(raw_text: str) -> dict:
    """Parse the model's JSON reply into {message, suggestions[]}, defensively."""
    import json
    import re
    data = _extract_json_object(raw_text)
    if data is None:
        return {"message": (raw_text or "").strip() or "Please try again.", "suggestions": []}

    message = str(data.get("message", "")).strip() or "Here are a few ideas."
    suggestions = []
    raw_suggestions = data.get("suggestions")
    if isinstance(raw_suggestions, list):
        for s in raw_suggestions[:MAX_SUGGESTIONS]:
            if not isinstance(s, dict):  # model sometimes returns bare strings — skip them
                continue
            kind = str(s.get("kind", "")).lower().strip()
            title = str(s.get("title", "")).strip()
            if kind in ALLOWED_KINDS and title:
                desc = str(s.get("description", "")).strip()
                item = {"kind": kind, "title": title, "description": desc or None}
                # Only tasks may carry a scheduled date (validated YYYY-MM-DD).
                if kind == "task":
                    raw_date = str(s.get("date", "")).strip()
                    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_date):
                        item["date"] = raw_date
                suggestions.append(item)
    return {"message": message, "suggestions": suggestions}


def _normalize_history(messages: list[dict]) -> list[dict]:
    """Trim to non-empty {role, content} turns starting with a user turn."""
    history = []
    for m in messages:
        text = (m.get("content") or "").strip()
        if not text:
            continue
        role = "assistant" if m.get("role") == "assistant" else "user"
        history.append({"role": role, "content": text})
    while history and history[0]["role"] == "assistant":
        history.pop(0)
    return history


async def _gemini_chat(system: str, history: list[dict]) -> dict:
    if not settings.gemini_api_key:
        return {
            "message": "The assistant isn't connected yet. Add GEMINI_API_KEY to backend/.env "
                       "and restart the backend to enable it.",
            "suggestions": [],
        }
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        "gemini-2.5-flash-lite",
        system_instruction=system,
        generation_config={"response_mime_type": "application/json"},
    )
    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [m["content"]]}
        for m in history
    ]
    try:
        response = await model.generate_content_async(contents)
    except Exception as e:
        if "ResourceExhausted" in type(e).__name__ or "429" in str(e):
            return {
                "message": "I've hit Gemini's rate limit for now — that's a quota cap on the "
                           "API key, not your plan. Give it a minute and try again.",
                "suggestions": [],
            }
        return {"message": "Sorry, I hit an error talking to the AI. Please try again.", "suggestions": []}

    try:
        raw_text = response.text
    except Exception:
        return {"message": "The AI returned an empty response. Please try again.", "suggestions": []}
    return _parse_chat_json(raw_text)


async def _ollama_chat(system: str, history: list[dict]) -> dict:
    import httpx

    base = settings.ollama_base_url.rstrip("/")
    payload = {
        "model": settings.ollama_model,
        "messages": [{"role": "system", "content": system}, *history],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.6, "num_predict": 3000},
    }
    headers = {"Host": settings.ollama_host_header} if settings.ollama_host_header else {}
    try:
        async with httpx.AsyncClient(timeout=240) as client:
            resp = await client.post(f"{base}/api/chat", json=payload, headers=headers)
            resp.raise_for_status()
            content = resp.json().get("message", {}).get("content", "")
    except Exception:
        return {"message": "Sorry, I couldn't reach the local model. Please try again.", "suggestions": []}
    return _parse_chat_json(content)


def external_ai_configured() -> bool:
    return bool(settings.external_ai_base_url and settings.external_ai_api_key and settings.external_ai_model)


async def _external_chat(system: str, history: list[dict]) -> dict:
    """OpenAI-compatible chat/completions (NVIDIA NIM, EVREN, ...)."""
    import httpx

    base = settings.external_ai_base_url.rstrip("/")
    payload = {
        "model": settings.external_ai_model,
        "messages": [{"role": "system", "content": system}, *history],
        "temperature": 0.6,
        "max_tokens": 4096,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {settings.external_ai_api_key}"}
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{base}/chat/completions", json=payload, headers=headers)
            if resp.status_code == 400 and "response_format" in payload:
                # Not every provider/model supports JSON mode; the prompt + parser cope without it.
                payload.pop("response_format")
                resp = await client.post(f"{base}/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
            content = (resp.json()["choices"][0]["message"].get("content") or "").strip()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            return {"message": "The external AI API is rate limiting us. Try again in a minute.", "suggestions": []}
        return {"message": f"The external AI API returned HTTP {e.response.status_code}.", "suggestions": []}
    except Exception:
        return {"message": "Sorry, I couldn't reach the external AI API. Please try again.", "suggestions": []}
    return _parse_chat_json(content)


async def chat_with_assistant(messages: list[dict], ctx: dict, language: str = "en", use_external: bool = False) -> dict:
    """Goal-planning chat. Dispatches to the configured provider (gemini | ollama).

    use_external routes to the external OpenAI-compatible API; the caller must only
    set it for admin users.
    """
    system = _build_chat_system_instruction(ctx, language)
    history = _normalize_history(messages)
    if not history:
        return {"message": "Tell me what you'd like to work on.", "suggestions": []}

    if use_external and external_ai_configured():
        return await _external_chat(system, history)

    provider = (settings.ai_provider or "gemini").lower()
    if provider == "ollama" and settings.ollama_base_url:
        return await _ollama_chat(system, history)
    return await _gemini_chat(system, history)
