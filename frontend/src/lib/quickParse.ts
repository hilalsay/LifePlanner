/**
 * Natural-language quick add, parsed on the device (no AI call, instant, works
 * offline). Only *trailing* tokens are interpreted, so a title like
 * "Read about Monday motivation" is never mangled:
 *
 *   "Dentist tomorrow 10am !high"  → title "Dentist", tomorrow, 10:00, high
 *   "Faturayı öde cuma 14:30"      → title "Faturayı öde", next Friday, 14:30
 *
 * Supported (EN + TR): today/bugün, tomorrow/yarın, weekday names, times
 * (10am, 3:30pm, 14:00, saat 9), priorities (!high !med !low !!, !yüksek
 * !orta !düşük), and the connectors "at" / "saat".
 */
import { addDays } from "date-fns";
import { toDateString } from "@/lib/utils";

export interface QuickParse {
  title: string;
  date?: string;        // YYYY-MM-DD
  time?: string;        // HH:MM
  priority?: "low" | "medium" | "high";
}

const WEEKDAYS: Record<string, number> = {
  // 0 = Sunday (JS getDay)
  sun: 0, sunday: 0, pazar: 0,
  mon: 1, monday: 1, pazartesi: 1, pzt: 1,
  tue: 2, tues: 2, tuesday: 2, salı: 2, sali: 2,
  wed: 3, wednesday: 3, çarşamba: 3, carsamba: 3, çrş: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, perşembe: 4, persembe: 4,
  fri: 5, friday: 5, cuma: 5,
  sat: 6, saturday: 6, cumartesi: 6, cmt: 6,
};

const PRIORITY: Record<string, QuickParse["priority"]> = {
  "!!": "high", "!high": "high", "!h": "high", "!yüksek": "high", "!yuksek": "high",
  "!med": "medium", "!medium": "medium", "!m": "medium", "!orta": "medium",
  "!low": "low", "!l": "low", "!düşük": "low", "!dusuk": "low",
};

const CONNECTORS = new Set(["at", "saat", "@"]);

function parseTime(tok: string): string | undefined {
  const m = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i.exec(tok);
  if (!m) return undefined;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ampm = m[3]?.toLowerCase();
  // A bare number ("5") is too ambiguous to be a time unless am/pm or :mm is given.
  if (!m[2] && !ampm) return undefined;
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseDate(tok: string, now: Date): string | undefined {
  const w = tok.toLocaleLowerCase("tr");
  if (w === "today" || w === "bugün" || w === "bugun") return toDateString(now);
  if (w === "tomorrow" || w === "tmr" || w === "yarın" || w === "yarin") return toDateString(addDays(now, 1));
  if (w in WEEKDAYS) {
    const diff = (WEEKDAYS[w] - now.getDay() + 7) % 7 || 7; // next occurrence, never today
    return toDateString(addDays(now, diff));
  }
  return undefined;
}

export function parseQuickAdd(input: string, now = new Date()): QuickParse {
  const words = input.trim().split(/\s+/);
  const out: QuickParse = { title: input.trim() };
  let end = words.length;

  // Walk backwards over recognised tokens; stop at the first ordinary word.
  while (end > 1) {
    const raw = words[end - 1];
    const tok = raw.toLocaleLowerCase("tr");
    const prev = words[end - 2]?.toLocaleLowerCase("tr");

    if (!out.priority && PRIORITY[tok]) { out.priority = PRIORITY[tok]; end--; continue; }

    // "10" + "am" written as two words
    if (!out.time && (tok === "am" || tok === "pm") && prev && /^\d{1,2}$/.test(prev)) {
      const tm = parseTime(prev + tok);
      if (tm) { out.time = tm; end -= 2; continue; }
    }
    // "saat 9" (Turkish: hour without minutes)
    if (!out.time && /^\d{1,2}$/.test(tok) && prev === "saat" && Number(tok) < 24) {
      out.time = `${tok.padStart(2, "0")}:00`; end -= 2; continue;
    }
    const tm = !out.time ? parseTime(tok) : undefined;
    if (tm) { out.time = tm; end--; continue; }

    const d = !out.date ? parseDate(tok, now) : undefined;
    if (d) { out.date = d; end--; continue; }

    if (CONNECTORS.has(tok) && (out.time || out.date)) { end--; continue; }
    break;
  }

  if (end < words.length) out.title = words.slice(0, end).join(" ");
  return out;
}
