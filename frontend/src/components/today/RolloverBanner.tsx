import { useEffect, useState } from "react";
import { History, X } from "lucide-react";
import { subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { planningApi, type DailyTask } from "@/lib/api";
import { useI18n } from "@/contexts/LanguageContext";
import { toDateString } from "@/lib/utils";

const LOOKBACK_DAYS = 7;
const dismissKey = (d: string) => `lp-rollover-dismissed-${d}`;

/**
 * Unfinished tasks from the last week stay on their old date and silently
 * disappear from view. Offer to move them onto today in one tap.
 */
export function RolloverBanner({ todayStr, onMoved }: { todayStr: string; onMoved: (tasks: DailyTask[]) => void }) {
  const { t } = useI18n();
  const [left, setLeft] = useState<DailyTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(dismissKey(todayStr)) === "1"; } catch { /* storage unavailable */ }
    if (dismissed) return;
    const oldest = toDateString(subDays(new Date(todayStr + "T00:00:00"), LOOKBACK_DAYS));
    planningApi.getUnfinishedBefore(todayStr)
      .then((all) => setLeft(all.filter((x) => !x.is_completed && x.task_date < todayStr && x.task_date >= oldest)))
      .catch(() => setLeft([]));
  }, [todayStr]);

  if (left.length === 0) return null;

  const dismiss = () => {
    try { localStorage.setItem(dismissKey(todayStr), "1"); } catch { /* ignore */ }
    setLeft([]);
  };

  const moveAll = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const moved = await Promise.all(left.map((x) => planningApi.updateDailyTask(x.id, { task_date: todayStr })));
      const ok = moved.filter((x) => x.task_date === todayStr);
      if (ok.length !== moved.length) setFailed(true);
      onMoved(ok);
      setLeft((l) => l.filter((x) => !ok.some((o) => o.id === x.id)));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="region" aria-label={t("today.rolloverTitle", { n: left.length })} className="flex flex-wrap items-center gap-3 rounded-xl border border-info/25 bg-info-soft px-4 py-3">
      <History className="h-5 w-5 shrink-0 text-info" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{t("today.rolloverTitle", { n: left.length })}</p>
        <p className="truncate text-muted-foreground">{left.slice(0, 3).map((x) => x.title).join(" · ")}{left.length > 3 ? " …" : ""}</p>
        {failed && <p className="text-danger">{t("common.saveError")}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={moveAll} loading={busy}>{t("today.rolloverMove")}</Button>
        <Button size="icon-sm" variant="subtle" onClick={dismiss} aria-label={t("common.dismiss")}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
