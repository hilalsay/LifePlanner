import { useRef, useState } from "react";
import { Moon, Sun, Languages, Check, LogOut, User as UserIcon, Loader2, Upload, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/contexts/LanguageContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useAuth } from "@/contexts/AuthContext";
import { dateLocale } from "@/lib/dateLocale";
import { type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();
  const { hideCompleted, setHideCompleted } = usePreferences();
  const { user, logout, updateProfile, uploadAvatar } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dirty = displayName !== (user?.display_name ?? "");

  const saveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({ display_name: displayName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* keep the form editable on error */
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setUploading(true);
    try {
      await uploadAvatar(file);
    } catch {
      /* ignore — keep current avatar */
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await updateProfile({ avatar_url: "" });
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  };

  const initial = (user?.display_name || user?.email || "?")[0]?.toUpperCase();
  const langs: { code: Lang; label: string }[] = [
    { code: "en", label: "English" },
    { code: "tr", label: "Türkçe" },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full"
              title={t("settings.changePhoto")}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary">
                  {initial}
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </span>
            </button>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? t("settings.uploading") : user?.avatar_url ? t("settings.changePhoto") : t("settings.uploadPhoto")}
                </Button>
                {user?.avatar_url && !uploading && (
                  <Button variant="ghost" size="sm" onClick={removeAvatar} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("settings.removePhoto")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.avatarHint")}</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onPickFile}
            />
          </div>

          <div className="rounded-md border px-3 py-2">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            {user && (
              <p className="text-xs text-muted-foreground">
                {t("settings.memberSince", {
                  date: format(new Date(user.created_at), "MMM yyyy", { locale: dateLocale(lang) }),
                })}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="display-name" className="text-sm font-medium">{t("auth.displayName")}</label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("auth.yourName")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{t("settings.displayNameHint")}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t("settings.saveProfile")}
            </Button>
            {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">{t("settings.profileSaved")}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.preferences")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("settings.language")}</span>
            </div>
            <div className="flex gap-1 rounded-md border p-0.5">
              {langs.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    lang === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium">{t("settings.theme")}</span>
            </div>
            <Button variant="outline" size="sm" onClick={toggle}>
              {theme === "dark" ? (
                <><Sun className="mr-2 h-4 w-4" /> {t("settings.lightMode")}</>
              ) : (
                <><Moon className="mr-2 h-4 w-4" /> {t("settings.darkMode")}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assistant */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.assistant")}</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={() => setHideCompleted(!hideCompleted)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("settings.hideCompleted")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.hideCompletedHint")}</p>
            </div>
            <span
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                hideCompleted ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  hideCompleted ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </span>
          </button>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserIcon className="h-4 w-4" />
            {t("settings.signedInWith", { provider: user?.provider ?? "email" })}
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.about")}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Life Planner v0.1.0</p>
          <p>React + FastAPI + PostgreSQL</p>
        </CardContent>
      </Card>
    </div>
  );
}
