import { useState, useEffect, useRef } from "react";
import { Settings2, Trash2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LifeArea, YearlyGoal } from "@/lib/api";
import { useI18n } from "@/contexts/LanguageContext";

export const AREA_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
  "#0ea5e9", "#f43f5e", "#84cc16", "#a855f7",
];

interface Props {
  area: LifeArea;
  goals: YearlyGoal[];
  selected: boolean;
  onSelect: () => void;
  onUpdate: (data: Partial<LifeArea>) => Promise<void> | void;
  onDelete: () => void;
}

export function AreaCard({ area, goals, selected, onSelect, onUpdate, onDelete }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(area.name);
  const [color, setColor] = useState(area.color);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setName(area.name);
      setColor(area.color);
      nameRef.current?.focus();
    }
  }, [editing, area.name, area.color]);

  const saveAndClose = async () => {
    const trimmed = name.trim();
    const patch: Partial<LifeArea> = {};
    if (trimmed && trimmed !== area.name) patch.name = trimmed;
    if (color !== area.color) patch.color = color;
    if (Object.keys(patch).length) await onUpdate(patch);
    setEditing(false);
  };

  const toggleActive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ is_active: !area.is_active });
  };

  const inactive = !area.is_active;

  return (
    <Card
      className={`group flex flex-col transition-all hover:shadow-md ${
        selected ? "ring-2 ring-primary" : ""
      } ${inactive ? "opacity-55" : ""}`}
    >
      <CardHeader className="pb-2">
        {editing ? (
          <div className="space-y-3">
            {/* Name */}
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveAndClose();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder={t("area.namePlaceholder")}
              className="w-full rounded border bg-background px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
            />

            {/* Color picker */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("area.color")}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {AREA_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                      color.toLowerCase() === c.toLowerCase()
                        ? "ring-2 ring-offset-2 ring-foreground ring-offset-background"
                        : ""
                    }`}
                    aria-label={`Set color ${c}`}
                  />
                ))}
                {/* Custom color */}
                <label
                  className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-muted-foreground/50"
                  title={t("area.customColor")}
                  style={
                    AREA_COLORS.some((c) => c.toLowerCase() === color.toLowerCase())
                      ? undefined
                      : { backgroundColor: color, borderStyle: "solid" }
                  }
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  {AREA_COLORS.some((c) => c.toLowerCase() === color.toLowerCase()) && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">+</span>
                  )}
                </label>
              </div>
            </div>

            {/* Active toggle */}
            <button
              type="button"
              onClick={() => onUpdate({ is_active: !area.is_active })}
              className="flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-xs"
            >
              <span className="font-medium">{area.is_active ? t("area.active") : t("area.inactive")}</span>
              <span
                className={`relative h-4 w-7 rounded-full transition-colors ${
                  area.is_active ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                    area.is_active ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>

            {/* Actions */}
            <div className="flex items-center justify-between pt-0.5">
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(false)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={saveAndClose} className="rounded p-1 text-primary hover:bg-muted">
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleActive}
              className="h-3 w-3 shrink-0 rounded-full transition-transform hover:scale-125"
              style={{ backgroundColor: area.color }}
              title={area.is_active ? t("area.clickDeactivate") : t("area.clickActivate")}
            />
            <h3
              className="flex-1 cursor-pointer truncate text-sm font-semibold"
              onClick={onSelect}
            >
              {area.name}
            </h3>
            {inactive && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t("area.inactive")}</Badge>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              title={t("area.customize")}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </CardHeader>

      {!editing && (
        <CardContent
          className="flex-1 cursor-pointer space-y-1"
          onClick={onSelect}
        >
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("area.noGoals")}</p>
          ) : (
            goals.map((g) => (
              <div key={g.id} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: area.color }} />
                <p className="flex-1 truncate text-xs">{g.title}</p>
                {g.progress > 0 && (
                  <span className="shrink-0 text-xs text-muted-foreground">{Math.round(g.progress)}%</span>
                )}
              </div>
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}
