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
  "nav.menu": "Menu",

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
  "assistant.attachTooltip": "Attach from your plan",
  "assistant.attachTitle": "Attach from your plan",
  "assistant.noPlanItems": "Nothing in your plan to attach yet.",
  "assistant.done": "Done",

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

  // Statuses & priorities
  "status.active": "Active",
  "status.completed": "Completed",
  "status.paused": "Paused",
  "status.archived": "Archived",
  "status.abandoned": "Abandoned",
  "priority.low": "Low",
  "priority.medium": "Medium",
  "priority.high": "High",

  // Common (more)
  "common.update": "Update",
  "common.delete": "Delete",
  "common.add": "Add",
  "common.today": "Today",
  "common.none": "— None —",
  "common.completedCount": "{done} / {total} completed",

  // Vision board
  "vision.title": "Life Vision — {year}",
  "vision.newAreaPlaceholder": "New life area...",
  "vision.allGoals": "All Goals — {year}",
  "vision.goalsForArea": "Goals — {name}",
  "vision.clearFilter": "Clear filter",
  "vision.viewDetails": "View details",
  "vision.addGoalPlaceholder": "Add a goal...",
  "vision.addGoalToArea": "Add goal to {name}...",

  // Year view
  "year.goalsTitle": "Yearly Goals",
  "year.noGoals": "No goals set for {year}.",
  "year.addPlaceholder": "Add a yearly goal...",

  // Tracking
  "tracking.tabMood": "Mood",
  "tracking.tabHealth": "Health",
  "tracking.tabBooks": "Books",
  "tracking.todaysMood": "Today's Mood",
  "tracking.mood": "Mood",
  "tracking.energy": "Energy",
  "tracking.moodNotesPlaceholder": "How are you feeling today? (optional)",
  "tracking.saveMood": "Save Today's Mood",
  "tracking.updateMood": "Update Today's Mood",
  "tracking.pastMoods": "Past Moods",
  "tracking.moodEnergyLine": "mood {m}/10 · energy {e}/10",
  "tracking.todaysHealth": "Today's Health",
  "tracking.sleep": "Sleep (hours)",
  "tracking.water": "Water (glasses)",
  "tracking.exercise": "Exercise (minutes)",
  "tracking.weight": "Weight (kg)",
  "tracking.steps": "Steps",
  "tracking.notesOptional": "Notes (optional)",
  "tracking.saveHealth": "Save Today's Health",
  "tracking.updateHealth": "Update Today's Health",
  "tracking.readingList": "Reading List",
  "tracking.bookToRead": "To Read",
  "tracking.bookReading": "Reading",
  "tracking.bookCompleted": "Completed",
  "tracking.bookAbandoned": "Abandoned",
  "tracking.addBookPlaceholder": "Add a book...",
  "tracking.egSleep": "e.g. 7.5",
  "tracking.egWater": "e.g. 8",
  "tracking.egExercise": "e.g. 30",
  "tracking.egWeight": "e.g. 65.0",
  "tracking.egSteps": "e.g. 8000",
  "tracking.sleepShort": "Sleep",
  "tracking.waterShort": "Water",
  "tracking.exerciseShort": "Exercise",
  "tracking.weightShort": "Weight",

  // Calendar overview
  "overview.noTasks": "No tasks recorded.",
  "overview.noMood": "No mood recorded.",
  "overview.noHealth": "No health data recorded.",
  "overview.moodLow": "Low mood",
  "overview.moodHigh": "Great mood",

  // Settings
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.currentlyLight": "Currently light mode",
  "settings.currentlyDark": "Currently dark mode",
  "settings.lightMode": "Light Mode",
  "settings.darkMode": "Dark Mode",
  "settings.aiFeatures": "AI Features",
  "settings.aiIntroPre": "Add your API keys to",
  "settings.aiIntroPost": "to enable:",
  "settings.feature1": "AI weekly reviews (Claude)",
  "settings.feature2": "Natural language task parsing (Gemini)",
  "settings.feature3": "AI motivational messages (Claude)",
  "settings.about": "About",
  "settings.profile": "Profile",
  "settings.preferences": "Preferences",
  "settings.account": "Account",
  "settings.language": "Language",
  "settings.saveProfile": "Save profile",
  "settings.profileSaved": "Profile saved.",
  "settings.signedInWith": "Signed in with {provider}",
  "settings.memberSince": "Member since {date}",
  "settings.displayNameHint": "Shown across the app.",
  "settings.assistant": "Assistant",
  "settings.hideCompleted": "Hide completed tasks",
  "settings.hideCompletedHint": "Don't show finished tasks when attaching to the assistant.",
  "settings.uploadPhoto": "Upload photo",
  "settings.changePhoto": "Change photo",
  "settings.removePhoto": "Remove",
  "settings.uploading": "Uploading…",
  "settings.avatarHint": "PNG, JPG or WebP · max 5 MB",

  // Area card
  "area.namePlaceholder": "Area name",
  "area.color": "Color",
  "area.customColor": "Custom color",
  "area.active": "Active",
  "area.inactive": "Inactive",
  "area.clickActivate": "Click to activate",
  "area.clickDeactivate": "Click to deactivate",
  "area.customize": "Customize",
  "area.noGoals": "No goals yet",

  // Goal detail panel
  "goalDetail.titleLabel": "Title",
  "goalDetail.notes": "Notes",
  "goalDetail.notesPlaceholder": "What does achieving this look like? Why does it matter?",
  "goalDetail.progress": "Progress",
  "goalDetail.status": "Status",
  "goalDetail.targetDate": "Target Date",
  "goalDetail.lifeArea": "Life Area",
  "goalDetail.target": "Target: {date}",
  "goalDetail.milestones": "Monthly Milestones",
  "goalDetail.milestonesHelp": "Break this goal into monthly steps. Each milestone links to your Month view.",
  "goalDetail.noMilestones": "No milestones yet — add one below.",
  "goalDetail.addMilestone": "Add milestone",
  "goalDetail.milestonePlaceholder": "Milestone title...",

  // Motivational banner
  "banner.loading": "Loading wisdom...",
  "banner.refresh": "Refresh with AI",
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
  "nav.menu": "Menü",

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
  "assistant.attachTooltip": "Planından ekle",
  "assistant.attachTitle": "Planından ekle",
  "assistant.noPlanItems": "Eklenecek bir öğe yok.",
  "assistant.done": "Tamam",

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

  // Statuses & priorities
  "status.active": "Aktif",
  "status.completed": "Tamamlandı",
  "status.paused": "Duraklatıldı",
  "status.archived": "Arşivlendi",
  "status.abandoned": "Bırakıldı",
  "priority.low": "Düşük",
  "priority.medium": "Orta",
  "priority.high": "Yüksek",

  // Common (more)
  "common.update": "Güncelle",
  "common.delete": "Sil",
  "common.add": "Ekle",
  "common.today": "Bugün",
  "common.none": "— Yok —",
  "common.completedCount": "{done} / {total} tamamlandı",

  // Vision board
  "vision.title": "Yaşam Vizyonu — {year}",
  "vision.newAreaPlaceholder": "Yeni yaşam alanı...",
  "vision.allGoals": "Tüm Hedefler — {year}",
  "vision.goalsForArea": "Hedefler — {name}",
  "vision.clearFilter": "Filtreyi temizle",
  "vision.viewDetails": "Detayları gör",
  "vision.addGoalPlaceholder": "Bir hedef ekle...",
  "vision.addGoalToArea": "{name} alanına hedef ekle...",

  // Year view
  "year.goalsTitle": "Yıllık Hedefler",
  "year.noGoals": "{year} için hedef yok.",
  "year.addPlaceholder": "Bir yıllık hedef ekle...",

  // Tracking
  "tracking.tabMood": "Ruh Hali",
  "tracking.tabHealth": "Sağlık",
  "tracking.tabBooks": "Kitaplar",
  "tracking.todaysMood": "Bugünkü Ruh Hali",
  "tracking.mood": "Ruh Hali",
  "tracking.energy": "Enerji",
  "tracking.moodNotesPlaceholder": "Bugün nasıl hissediyorsun? (isteğe bağlı)",
  "tracking.saveMood": "Bugünkü Ruh Halini Kaydet",
  "tracking.updateMood": "Bugünkü Ruh Halini Güncelle",
  "tracking.pastMoods": "Geçmiş Ruh Halleri",
  "tracking.moodEnergyLine": "ruh hali {m}/10 · enerji {e}/10",
  "tracking.todaysHealth": "Bugünkü Sağlık",
  "tracking.sleep": "Uyku (saat)",
  "tracking.water": "Su (bardak)",
  "tracking.exercise": "Egzersiz (dakika)",
  "tracking.weight": "Kilo (kg)",
  "tracking.steps": "Adım",
  "tracking.notesOptional": "Notlar (isteğe bağlı)",
  "tracking.saveHealth": "Bugünkü Sağlığı Kaydet",
  "tracking.updateHealth": "Bugünkü Sağlığı Güncelle",
  "tracking.readingList": "Okuma Listesi",
  "tracking.bookToRead": "Okunacak",
  "tracking.bookReading": "Okunuyor",
  "tracking.bookCompleted": "Tamamlandı",
  "tracking.bookAbandoned": "Bırakıldı",
  "tracking.addBookPlaceholder": "Bir kitap ekle...",
  "tracking.egSleep": "örn. 7.5",
  "tracking.egWater": "örn. 8",
  "tracking.egExercise": "örn. 30",
  "tracking.egWeight": "örn. 65.0",
  "tracking.egSteps": "örn. 8000",
  "tracking.sleepShort": "Uyku",
  "tracking.waterShort": "Su",
  "tracking.exerciseShort": "Egzersiz",
  "tracking.weightShort": "Kilo",

  // Calendar overview
  "overview.noTasks": "Görev kaydı yok.",
  "overview.noMood": "Ruh hali kaydı yok.",
  "overview.noHealth": "Sağlık verisi kaydı yok.",
  "overview.moodLow": "Düşük mod",
  "overview.moodHigh": "Harika mod",

  // Settings
  "settings.appearance": "Görünüm",
  "settings.theme": "Tema",
  "settings.currentlyLight": "Şu an açık mod",
  "settings.currentlyDark": "Şu an koyu mod",
  "settings.lightMode": "Açık Mod",
  "settings.darkMode": "Koyu Mod",
  "settings.aiFeatures": "Yapay Zekâ Özellikleri",
  "settings.aiIntroPre": "Şunları etkinleştirmek için API anahtarlarını",
  "settings.aiIntroPost": "dosyasına ekle:",
  "settings.feature1": "Yapay zekâ haftalık değerlendirmeler (Claude)",
  "settings.feature2": "Doğal dil görev ayrıştırma (Gemini)",
  "settings.feature3": "Yapay zekâ motivasyon mesajları (Claude)",
  "settings.about": "Hakkında",
  "settings.profile": "Profil",
  "settings.preferences": "Tercihler",
  "settings.account": "Hesap",
  "settings.language": "Dil",
  "settings.saveProfile": "Profili kaydet",
  "settings.profileSaved": "Profil kaydedildi.",
  "settings.signedInWith": "{provider} ile giriş yapıldı",
  "settings.memberSince": "Üyelik tarihi: {date}",
  "settings.displayNameHint": "Uygulama genelinde görünür.",
  "settings.assistant": "Asistan",
  "settings.hideCompleted": "Tamamlanan görevleri gizle",
  "settings.hideCompletedHint": "Asistana eklerken tamamlanmış görevleri gösterme.",
  "settings.uploadPhoto": "Fotoğraf yükle",
  "settings.changePhoto": "Fotoğrafı değiştir",
  "settings.removePhoto": "Kaldır",
  "settings.uploading": "Yükleniyor…",
  "settings.avatarHint": "PNG, JPG veya WebP · en fazla 5 MB",

  // Area card
  "area.namePlaceholder": "Alan adı",
  "area.color": "Renk",
  "area.customColor": "Özel renk",
  "area.active": "Aktif",
  "area.inactive": "Pasif",
  "area.clickActivate": "Etkinleştirmek için tıkla",
  "area.clickDeactivate": "Devre dışı bırakmak için tıkla",
  "area.customize": "Özelleştir",
  "area.noGoals": "Henüz hedef yok",

  // Goal detail panel
  "goalDetail.titleLabel": "Başlık",
  "goalDetail.notes": "Notlar",
  "goalDetail.notesPlaceholder": "Bunu başarmak neye benziyor? Neden önemli?",
  "goalDetail.progress": "İlerleme",
  "goalDetail.status": "Durum",
  "goalDetail.targetDate": "Hedef Tarih",
  "goalDetail.lifeArea": "Yaşam Alanı",
  "goalDetail.target": "Hedef: {date}",
  "goalDetail.milestones": "Aylık Kilometre Taşları",
  "goalDetail.milestonesHelp": "Bu hedefi aylık adımlara böl. Her kilometre taşı Ay görünümüne bağlanır.",
  "goalDetail.noMilestones": "Henüz kilometre taşı yok — aşağıdan ekle.",
  "goalDetail.addMilestone": "Kilometre taşı ekle",
  "goalDetail.milestonePlaceholder": "Kilometre taşı başlığı...",

  // Motivational banner
  "banner.loading": "Bilgelik yükleniyor...",
  "banner.refresh": "Yapay zekâ ile yenile",
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
