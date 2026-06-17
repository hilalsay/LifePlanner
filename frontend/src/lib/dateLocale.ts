// Maps the app language to a date-fns locale, so date formatting
// (month names, weekday names, "Due Jun 30") follows the chosen language.
import { tr, enUS, type Locale } from "date-fns/locale";
import type { Lang } from "./i18n";

export function dateLocale(lang: Lang): Locale {
  return lang === "tr" ? tr : enUS;
}
