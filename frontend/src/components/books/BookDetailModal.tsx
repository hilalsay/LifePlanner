import { useState, useEffect, useRef } from "react";
import { X, Star, Trash2, BookOpen, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackingApi, fetchBookCover, type BookEntry } from "@/lib/api";
import { useI18n } from "@/contexts/LanguageContext";

// Renders a cover image, falling back to a book icon when there's no URL
// or the image fails to load.
export function BookCover({
  url,
  alt,
  className,
  iconClassName,
}: {
  url?: string;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className ?? ""}`}>
        <BookOpen className={iconClassName ?? "h-5 w-5 text-muted-foreground/40"} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover bg-muted ${className ?? ""}`}
    />
  );
}

export const STATUS_STYLES = {
  reading:   { emoji: "📖", labelKey: "tracking.bookReading",   classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  completed: { emoji: "✅", labelKey: "tracking.bookCompleted", classes: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  to_read:   { emoji: "📚", labelKey: "tracking.bookToRead",    classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  abandoned: { emoji: "❌", labelKey: "tracking.bookAbandoned", classes: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" },
} as const;

const STATUSES = ["to_read", "reading", "completed", "abandoned"] as const;

export function StatusPill({ status }: { status: string }) {
  const { t } = useI18n();
  const cfg = STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.to_read;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}>
      {cfg.emoji} {t(cfg.labelKey)}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 active:scale-95"
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              n <= (hover || value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

interface Props {
  book: BookEntry;
  onClose: () => void;
  onUpdated: (b: BookEntry) => void;
  onDeleted: (id: string) => void;
}

export function BookDetailModal({ book, onClose, onUpdated, onDeleted }: Props) {
  const { t } = useI18n();
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  const [title, setTitle] = useState(book.title);
  const [coverUrl, setCoverUrl] = useState(book.cover_url ?? "");
  const [fetchingCover, setFetchingCover] = useState(false);
  const coverDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [author, setAuthor] = useState(book.author ?? "");
  const [genre, setGenre] = useState(book.genre ?? "");
  const [status, setStatus] = useState(book.status);
  const [rating, setRating] = useState(book.rating ?? 0);
  const [review, setReview] = useState(book.review ?? "");
  const [notes, setNotes] = useState(book.notes ?? "");
  const [startDate, setStartDate] = useState(book.start_date ?? "");
  const [endDate, setEndDate] = useState(book.end_date ?? "");
  const [totalPages, setTotalPages] = useState(book.total_pages ? String(book.total_pages) : "");
  const [currentPage, setCurrentPage] = useState(book.current_page ? String(book.current_page) : "");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Reset confirm-delete if the book changes while the modal is open
  useEffect(() => { setConfirmDelete(false); }, [book.id]);

  // Clear the "saved" confirmation timer on unmount
  useEffect(() => () => clearTimeout(savedTimerRef.current), []);

  // Cancel any pending cover lookup on unmount
  useEffect(() => () => clearTimeout(coverDebounceRef.current), []);

  // Look up a fresh cover 800ms after the user stops editing the title.
  const handleTitleChange = (value: string) => {
    setTitle(value);
    clearTimeout(coverDebounceRef.current);
    const trimmed = value.trim();
    if (!trimmed || trimmed === book.title) {
      setFetchingCover(false);
      return;
    }
    setFetchingCover(true);
    coverDebounceRef.current = setTimeout(async () => {
      const found = await fetchBookCover(trimmed);
      if (found) setCoverUrl(found);
      setFetchingCover(false);
    }, 800);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === "completed" && !rating && !review) {
      setShowReviewPrompt(true);
      setTimeout(() => {
        reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    } else {
      setShowReviewPrompt(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await trackingApi.updateBook(book.id, {
        title,
        cover_url: coverUrl || undefined,
        author: author || undefined,
        genre: genre || undefined,
        status,
        rating: rating || undefined,
        review: review || undefined,
        notes: notes || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        total_pages: totalPages ? Number(totalPages) : undefined,
        current_page: currentPage ? Number(currentPage) : undefined,
      });
      onUpdated(updated);
      setSaved(true);
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await trackingApi.deleteBook(book.id);
    onDeleted(book.id);
  };

  const inputCls = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mt-auto sm:m-auto sm:w-full sm:max-w-lg flex flex-col max-h-[92dvh] rounded-t-2xl sm:rounded-2xl bg-background shadow-2xl overflow-hidden">
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-4 pt-2 pb-3 border-b shrink-0">
          <div className="relative shrink-0 w-14 h-[76px] sm:w-16 sm:h-[84px] rounded-lg overflow-hidden">
            <BookCover url={coverUrl} alt={title} className="w-full h-full" iconClassName="h-7 w-7 text-muted-foreground/40" />
            {fetchingCover && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-semibold text-base leading-snug">{book.title}</p>
            {book.author && <p className="text-sm text-muted-foreground mt-0.5">{book.author}</p>}
            <div className="mt-2">
              <StatusPill status={status} />
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-1.5 hover:bg-muted transition-colors mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Status selector */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t("tracking.bookStatus")}
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const cfg = STATUS_STYLES[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      status === s
                        ? `${cfg.classes} ring-2 ring-offset-1 ring-current`
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {cfg.emoji} {t(cfg.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title / Author / Genre */}
          <div className="space-y-3">
            <div>
              <label className={labelCls}>{t("tracking.bookTitle")}</label>
              <input value={title} onChange={(e) => handleTitleChange(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("tracking.bookAuthor")}</label>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={t("tracking.bookAuthorPlaceholder")} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("tracking.bookGenre")}</label>
              <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder={t("tracking.bookGenrePlaceholder")} className={inputCls} />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("tracking.bookStartDate")}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("tracking.bookEndDate")}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Pages */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("tracking.bookCurrentPage")}</label>
              <input type="number" min={0} value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("tracking.bookTotalPages")}</label>
              <input type="number" min={0} value={totalPages} onChange={(e) => setTotalPages(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>

          {/* Review section */}
          <div ref={reviewSectionRef} className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-4 space-y-4">
            <h3 className="text-sm font-semibold">{t("tracking.myReview")}</h3>

            {showReviewPrompt && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                🎉 {t("tracking.completedPrompt")}
              </div>
            )}

            <div>
              <label className={labelCls}>{t("tracking.bookRating")}</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div>
              <label className={labelCls}>{t("tracking.bookReviewText")}</label>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder={t("tracking.bookReviewPlaceholder")} rows={4} className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className={labelCls}>{t("tracking.myNotes")}</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("tracking.myNotesPlaceholder")} rows={3} className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>

        {/* Saved confirmation */}
        {saved && (
          <div className="px-4 pt-3 shrink-0">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" />
              {t("common.saved")}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-3 flex gap-3 bg-background shrink-0">
          <Button onClick={handleSave} className="flex-1" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className={confirmDelete ? "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground px-3" : "px-3"}
            title={t("common.delete")}
          >
            {confirmDelete ? <span className="text-xs">{t("tracking.confirmDelete")}</span> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
