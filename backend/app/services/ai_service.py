import re
from typing import Optional
from app.config import settings


def get_gemini_model():
    if not settings.gemini_api_key:
        return None
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel("gemini-2.5-flash-lite")


async def _ollama_generate(system: Optional[str], prompt: str) -> Optional[str]:
    """Plain-text (non-JSON) generation via the local Ollama model. None on failure."""
    import httpx

    base = settings.ollama_base_url.rstrip("/")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.7},
    }
    headers = {"Host": settings.ollama_host_header} if settings.ollama_host_header else {}
    try:
        async with httpx.AsyncClient(timeout=240) as client:
            resp = await client.post(f"{base}/api/chat", json=payload, headers=headers)
            resp.raise_for_status()
            return (resp.json().get("message", {}).get("content") or "").strip() or None
    except Exception:
        return None


async def _gemini_generate(system: Optional[str], prompt: str) -> Optional[str]:
    """Plain-text generation via Gemini. None on failure / missing key."""
    if not settings.gemini_api_key:
        return None
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash-lite", system_instruction=system or None)
    try:
        response = await model.generate_content_async(prompt)
        return (response.text or "").strip() or None
    except Exception:
        return None


async def _generate_text(system: Optional[str], prompt: str) -> Optional[str]:
    """Provider-aware plain-text generation (mirrors the chat provider dispatch)."""
    provider = (settings.ai_provider or "gemini").lower()
    if provider == "ollama" and settings.ollama_base_url:
        text = await _ollama_generate(system, prompt)
        if text:
            return text
    return await _gemini_generate(system, prompt)


async def generate_motivational_message(language: str = "en") -> str:
    lang_name = _LANG_NAME.get(language, "English")
    system = (
        "You write short, witty, and genuinely motivational one-liners for a personal "
        f"life planner. Always write the message in {lang_name}."
    )
    prompt = (
        "Generate one short (1-2 sentences), funny yet genuinely motivational message "
        "for someone using their personal life planner. Be witty, warm, and specific. "
        f"No hashtags. No emojis. Write it in {lang_name}. Just the message text."
    )
    text = await _generate_text(system, prompt)
    if not text:
        from app.services.motivational import get_local_message
        return get_local_message()
    return text


async def generate_weekly_review(week_data: dict, language: str = "en") -> str:
    lang_name = _LANG_NAME.get(language, "English")
    system = (
        "You are a thoughtful, direct, and supportive personal coach writing a weekly "
        f"review. Always write the entire review in {lang_name}."
    )

    def _fmt(items):
        items = [str(i) for i in (items or []) if str(i).strip()]
        return ", ".join(items) if items else "none"

    prompt = f"""You are a thoughtful personal coach reviewing someone's week so far (Monday through today).

Week data:
- Tasks completed: {week_data.get('completed_tasks', 0)} of {week_data.get('total_tasks', 0)}
- Completed tasks: {_fmt(week_data.get('completed_task_titles'))}
- Still pending / missed: {_fmt(week_data.get('pending_task_titles'))}
- Weekly priorities: {_fmt(week_data.get('priorities'))}
- Active habits: {_fmt(week_data.get('active_habits'))} ({week_data.get('habit_completions', 0)} check-ins this week)
- Avg mood: {week_data.get('avg_mood', 'N/A')} / 10
- Avg energy: {week_data.get('avg_energy', 'N/A')} / 10

Write a warm, honest, 3-paragraph weekly review in {lang_name}. Reference specific tasks and priorities by name where it helps. Cover: what went well, what to improve, and one specific focus for the rest of the week. Be direct and supportive, not generic."""

    text = await _generate_text(system, prompt)
    if not text:
        return "AI review unavailable — configure an AI provider (Ollama or Gemini) in backend/.env to enable this feature."
    return text


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

# The model occasionally labels suggestions with non-canonical kinds; fold the
# equivalent ones onto our vocabulary so they're recovered instead of dropped.
KIND_SYNONYMS = {
    "task_created": "task",
    "schedule_suggestion": "task",
}


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
            # Accept the alternate shape the model sometimes emits
            # ({"type": ..., "text": ...}) and fold synonym kinds onto our vocabulary.
            kind = str(s.get("kind") or s.get("type") or "").lower().strip()
            kind = KIND_SYNONYMS.get(kind, kind)
            title = str(s.get("title") or s.get("text") or "").strip()
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
        async with httpx.AsyncClient(timeout=120) as client:
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
                payload.pop("response_format")  # not every model supports JSON mode
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
