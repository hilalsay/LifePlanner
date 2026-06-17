// Lightweight i18n: a string dictionary + a translate helper. No dependencies.
// Add a key to both `en` and `tr` and use it via useI18n().t("key").

export type Lang = "en" | "tr";

export const LANG_LABEL: Record<Lang, string> = { en: "EN", tr: "TR" };

type Dict = Record<string, string>;

const en: Dict = {
  // Brand / nav
  "nav.today": "Today",
  "nav.week": "Week",
  "nav.month": "Month",
  "nav.year": "Year",
  "nav.vision": "Vision",
  "nav.habits": "Habits",
  "nav.tracking": "Tracking",
  "nav.overview": "Overview",
  "nav.settings": "Settings",
  "nav.signOut": "Sign out",

  // Page titles (TopBar)
  "title./": "Today",
  "title./week": "This Week",
  "title./month": "This Month",
  "title./year": "This Year",
  "title./vision": "Life Vision",
  "title./habits": "Habits",
  "title./tracking": "Tracking",
  "title./settings": "Settings",
  "title.default": "Life Planner",

  // TopBar controls
  "topbar.assistant": "Assistant",
  "topbar.toggleTheme": "Toggle theme",
  "topbar.language": "Language",

  // Assistant panel
  "assistant.title": "Assistant",
  "assistant.newChat": "New chat",
  "assistant.history": "Chat history",
  "assistant.close": "Close",
  "assistant.tabChat": "Chat",
  "assistant.tabPlan": "My Plan",
  "assistant.send": "Send",
  "assistant.greeting":
    'Hi! Tell me what you\'d like to work on — a goal, a habit, anything — and I\'ll suggest how to add it to your plan. Try "I want to read more" or "help me get fit".',
  "assistant.placeholder": "Tell me about a goal, or drag one here…",
  "assistant.placeholderAttached": "Ask about the attached…",
  "assistant.footer": "Powered by Gemini · suggestions save to your plan.",
  "assistant.cooldown": "You can send again in {n}s…",
  "assistant.dropHere": "Drop to ask about this",
  "assistant.errorReach":
    "Sorry — I couldn't reach the assistant. Check that the backend is running and GEMINI_API_KEY is set in backend/.env.",
  "assistant.noConversations": "No conversations yet.",
  "assistant.deleteConversation": "Delete conversation",
  "assistant.planEmpty": "Nothing added yet. Switch to Chat and add a suggestion.",
  "assistant.removeAttachment": "Remove attachment",

  // Suggestions
  "suggestion.add": "Add",
  "suggestion.added": "Added",
  "suggestion.adding": "Adding",
  "kind.monthly": "Monthly focus",
  "kind.weekly": "Weekly priority",
  "kind.yearly": "Yearly goal",
  "kind.habit": "Habit",
  "kind.task": "Task",

  // Relative time
  "time.justNow": "just now",
  "time.minutes": "{n}m ago",
  "time.hours": "{n}h ago",
  "time.days": "{n}d ago",

  // Common controls
  "common.prev": "Prev",
  "common.next": "Next",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.expand": "Expand",
  "common.collapse": "Collapse",
  "common.dueBy": "Due by...",

  // Deadlines
  "deadline.overdueByDays": "Overdue by {n}d",
  "deadline.dueToday": "Due today",
  "deadline.dueTomorrow": "Due tomorrow",
  "deadline.dueOn": "Due {date}",

  // Month view
  "month.focusAreas": "Monthly Focus Areas",
  "month.noFocus": "No focus areas yet.",
  "month.addFocusPlaceholder": "Add a focus area...",
  "month.midMonth": "Mid-month (15th)",
  "month.endOfMonth": "End of month",

  // Auth pages
  "auth.createAccount": "Create an account",
  "auth.createSubtitle": "Start planning your best life today",
  "auth.signIn": "Sign in",
  "auth.signInSubtitle": "Welcome back — enter your credentials to continue",
  "auth.displayName": "Display name",
  "auth.optional": "(optional)",
  "auth.yourName": "Your name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.min8": "Min. 8 characters",
  "auth.creatingAccount": "Creating account…",
  "auth.createAccountBtn": "Create account",
  "auth.signingIn": "Signing in…",
  "auth.orContinueWith": "or continue with",
  "auth.alreadyHaveAccount": "Already have an account?",
  "auth.noAccount": "Don't have an account?",
  "auth.signUpLink": "Sign up",
  "auth.signInLink": "Sign in",
  "auth.passwordMin8Error": "Password must be at least 8 characters.",
  "auth.registrationFailed": "Registration failed",
  "auth.signInFailed": "Sign in failed",
  "auth.oauthFailed": "OAuth sign-in failed. Please try again.",

  // Monthly focus detail
  "common.saving": "Saving…",
  "common.doneCount": "{done} / {total} done",
  "focusDetail.detailPlanPlaceholder": "Detail plan — what does this focus involve? Key steps, context, why it matters…",
  "focusDetail.deleteFocus": "Delete focus",
  "focusDetail.noDetailPlan": "No detail plan yet.",
  "focusDetail.editPlan": "Edit plan",
  "focusDetail.weeklyTasks": "Weekly Tasks",
  "focusDetail.weekShort": "Wk {n}",
  "focusDetail.whichWeek": "Which week",
  "focusDetail.addWeeklyTaskPlaceholder": "Add a weekly task…",
  "focusDetail.weekLabel": "Week {n} · {date}",

  // Week view
  "week.weekNumber": "Week {n}",
  "week.priorities": "Weekly Priorities",
  "week.noPriorities": "No priorities yet.",
  "week.addPriorityPlaceholder": "Add a priority...",

  // Habit tracker
  "habits.trackerTitle": "Habit Tracker — Last 7 Days",
  "habits.habitCol": "Habit",
  "habits.addPlaceholder": "Add a habit...",
  "habits.dragHint": "Drag to the Assistant to ask about this habit",

  // Day view
  "day.tasks": "Tasks",
  "day.loading": "Loading...",
  "day.noTasks": "No tasks yet. Add one below.",
  "day.addPlaceholder": "Add a task...",
  "day.editDeadline": "Click to edit deadline",
  "day.changePriority": "Click to change priority",
  "day.inHours": "In {n}h",

  // Extra deadline phrasing (Day view)
  "deadline.overdueByMin": "Overdue by {n}m",
  "deadline.overdueByHours": "Overdue by {n}h",
  "deadline.dueInMin": "Due in {n}m",
  "deadline.dueInHours": "Due in {n}h",
  "deadline.dueInHoursMin": "Due in {h}h {m}m",
  "deadline.atTime": " at {time}",
};

const tr: Dict = {
  // Brand / nav
  "nav.today": "Bugün",
  "nav.week": "Hafta",
  "nav.month": "Ay",
  "nav.year": "Yıl",
  "nav.vision": "Vizyon",
  "nav.habits": "Alışkanlıklar",
  "nav.tracking": "Takip",
  "nav.overview": "Genel Bakış",
  "nav.settings": "Ayarlar",
  "nav.signOut": "Çıkış yap",

  // Page titles
  "title./": "Bugün",
  "title./week": "Bu Hafta",
  "title./month": "Bu Ay",
  "title./year": "Bu Yıl",
  "title./vision": "Yaşam Vizyonu",
  "title./habits": "Alışkanlıklar",
  "title./tracking": "Takip",
  "title./settings": "Ayarlar",
  "title.default": "Life Planner",

  // TopBar controls
  "topbar.assistant": "Asistan",
  "topbar.toggleTheme": "Temayı değiştir",
  "topbar.language": "Dil",

  // Assistant panel
  "assistant.title": "Asistan",
  "assistant.newChat": "Yeni sohbet",
  "assistant.history": "Sohbet geçmişi",
  "assistant.close": "Kapat",
  "assistant.tabChat": "Sohbet",
  "assistant.tabPlan": "Planım",
  "assistant.send": "Gönder",
  "assistant.greeting":
    'Merhaba! Üzerinde çalışmak istediğin şeyi söyle — bir hedef, bir alışkanlık, ne olursa — planına nasıl ekleyeceğini önereyim. "Daha çok kitap okumak istiyorum" ya da "forma girmeme yardım et" diye dene.',
  "assistant.placeholder": "Bir hedefinden bahset ya da buraya sürükle…",
  "assistant.placeholderAttached": "Ekli öğe hakkında sor…",
  "assistant.footer": "Gemini ile çalışır · öneriler planına kaydedilir.",
  "assistant.cooldown": "{n} sn sonra tekrar gönderebilirsin…",
  "assistant.dropHere": "Sormak için buraya bırak",
  "assistant.errorReach":
    "Üzgünüm — asistana ulaşamadım. Backend'in çalıştığından ve backend/.env içinde GEMINI_API_KEY'in tanımlı olduğundan emin ol.",
  "assistant.noConversations": "Henüz sohbet yok.",
  "assistant.deleteConversation": "Sohbeti sil",
  "assistant.planEmpty": "Henüz bir şey eklenmedi. Sohbete geçip bir öneri ekle.",
  "assistant.removeAttachment": "Eki kaldır",

  // Suggestions
  "suggestion.add": "Ekle",
  "suggestion.added": "Eklendi",
  "suggestion.adding": "Ekleniyor",
  "kind.monthly": "Aylık odak",
  "kind.weekly": "Haftalık öncelik",
  "kind.yearly": "Yıllık hedef",
  "kind.habit": "Alışkanlık",
  "kind.task": "Görev",

  // Relative time
  "time.justNow": "az önce",
  "time.minutes": "{n} dk önce",
  "time.hours": "{n} sa önce",
  "time.days": "{n} gün önce",

  // Common controls
  "common.prev": "Önceki",
  "common.next": "Sonraki",
  "common.save": "Kaydet",
  "common.cancel": "İptal",
  "common.expand": "Genişlet",
  "common.collapse": "Daralt",
  "common.dueBy": "Son tarih...",

  // Deadlines
  "deadline.overdueByDays": "{n} gün gecikti",
  "deadline.dueToday": "Bugün son",
  "deadline.dueTomorrow": "Yarın son",
  "deadline.dueOn": "Son: {date}",

  // Month view
  "month.focusAreas": "Aylık Odak Alanları",
  "month.noFocus": "Henüz odak alanı yok.",
  "month.addFocusPlaceholder": "Bir odak alanı ekle...",
  "month.midMonth": "Ay ortası (15)",
  "month.endOfMonth": "Ay sonu",

  // Auth pages
  "auth.createAccount": "Hesap oluştur",
  "auth.createSubtitle": "Bugün en iyi yaşamını planlamaya başla",
  "auth.signIn": "Giriş yap",
  "auth.signInSubtitle": "Tekrar hoş geldin — devam etmek için bilgilerini gir",
  "auth.displayName": "Görünen ad",
  "auth.optional": "(isteğe bağlı)",
  "auth.yourName": "Adınız",
  "auth.email": "E-posta",
  "auth.password": "Şifre",
  "auth.min8": "En az 8 karakter",
  "auth.creatingAccount": "Hesap oluşturuluyor…",
  "auth.createAccountBtn": "Hesap oluştur",
  "auth.signingIn": "Giriş yapılıyor…",
  "auth.orContinueWith": "ya da şununla devam et",
  "auth.alreadyHaveAccount": "Zaten hesabın var mı?",
  "auth.noAccount": "Hesabın yok mu?",
  "auth.signUpLink": "Kayıt ol",
  "auth.signInLink": "Giriş yap",
  "auth.passwordMin8Error": "Şifre en az 8 karakter olmalı.",
  "auth.registrationFailed": "Kayıt başarısız",
  "auth.signInFailed": "Giriş başarısız",
  "auth.oauthFailed": "OAuth ile giriş başarısız. Lütfen tekrar dene.",

  // Monthly focus detail
  "common.saving": "Kaydediliyor…",
  "common.doneCount": "{done} / {total} tamam",
  "focusDetail.detailPlanPlaceholder": "Detay planı — bu odak neyi içeriyor? Önemli adımlar, bağlam, neden önemli…",
  "focusDetail.deleteFocus": "Odağı sil",
  "focusDetail.noDetailPlan": "Henüz detay planı yok.",
  "focusDetail.editPlan": "Planı düzenle",
  "focusDetail.weeklyTasks": "Haftalık Görevler",
  "focusDetail.weekShort": "Hf {n}",
  "focusDetail.whichWeek": "Hangi hafta",
  "focusDetail.addWeeklyTaskPlaceholder": "Haftalık görev ekle…",
  "focusDetail.weekLabel": "{n}. Hafta · {date}",

  // Week view
  "week.weekNumber": "{n}. Hafta",
  "week.priorities": "Haftalık Öncelikler",
  "week.noPriorities": "Henüz öncelik yok.",
  "week.addPriorityPlaceholder": "Bir öncelik ekle...",

  // Habit tracker
  "habits.trackerTitle": "Alışkanlık Takibi — Son 7 Gün",
  "habits.habitCol": "Alışkanlık",
  "habits.addPlaceholder": "Bir alışkanlık ekle...",
  "habits.dragHint": "Bu alışkanlık hakkında sormak için Asistana sürükle",

  // Day view
  "day.tasks": "Görevler",
  "day.loading": "Yükleniyor...",
  "day.noTasks": "Henüz görev yok. Aşağıdan ekle.",
  "day.addPlaceholder": "Bir görev ekle...",
  "day.editDeadline": "Son tarihi düzenlemek için tıkla",
  "day.changePriority": "Önceliği değiştirmek için tıkla",
  "day.inHours": "{n} sa sonra",

  // Extra deadline phrasing (Day view)
  "deadline.overdueByMin": "{n} dk gecikti",
  "deadline.overdueByHours": "{n} sa gecikti",
  "deadline.dueInMin": "{n} dk içinde",
  "deadline.dueInHours": "{n} sa içinde",
  "deadline.dueInHoursMin": "{h} sa {m} dk içinde",
  "deadline.atTime": " {time}",
};

export const translations: Record<Lang, Dict> = { en, tr };

export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>
): string {
  let s = translations[lang][key] ?? translations.en[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.replace(`{${k}}`, String(vars[k]));
    }
  }
  return s;
}
