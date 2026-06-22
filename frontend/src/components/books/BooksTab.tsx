import { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackingApi, searchGoogleBooks, type BookEntry, type GoogleBookResult } from "@/lib/api";
import { BookDetailModal, STATUS_STYLES } from "./BookDetailModal";
import { useI18n } from "@/contexts/LanguageContext";

function MiniStars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div className="flex gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3 w-3 ${
            n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: (k: string) => string }) {
  const cfg = STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.to_read;
  const label =
    status === "to_read"
      ? t("tracking.bookToRead")
      : status === "reading"
      ? t("tracking.bookReading")
      : status === "completed"
      ? t("tracking.bookCompleted")
      : t("tracking.bookAbandoned");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.classes}`}
    >
      {cfg.emoji} {label}
    </span>
  );
}

export function BooksTab() {
  const { t } = useI18n();
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookEntry | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pending, setPending] = useState<{ title: string; author?: string; cover_url?: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackingApi.getBooks().then(setBooks).catch(console.error);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setPending(null);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const found = await searchGoogleBooks(value);
      setResults(found);
      setShowDropdown(found.length > 0);
      setSearching(false);
    }, 500);
  }, []);

  const selectResult = (r: GoogleBookResult) => {
    setPending({ title: r.title, author: r.author, cover_url: r.cover_url });
    setQuery(r.title);
    setShowDropdown(false);
    setResults([]);
  };

  const addBook = async () => {
    const title = pending?.title ?? query.trim();
    if (!title) return;
    const book = await trackingApi.createBook({
      title,
      author: pending?.author,
      cover_url: pending?.cover_url,
    });
    setBooks((bs) => [book, ...bs]);
    setQuery("");
    setPending(null);
    setResults([]);
    setShowDropdown(false);
  };

  const handleUpdated = (updated: BookEntry) => {
    setBooks((bs) => bs.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBook(updated);
  };

  const handleDeleted = (id: string) => {
    setBooks((bs) => bs.filter((b) => b.id !== id));
    setSelectedBook(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("tracking.readingList")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Empty state */}
          {books.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("tracking.noBooksYet")}
            </p>
          )}

          {/* Book list */}
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className="w-full text-left rounded-lg border px-3 py-3 hover:bg-muted/50 active:bg-muted transition-colors flex gap-3 items-start min-h-[80px]"
            >
              {/* Cover thumbnail */}
              <div className="shrink-0 w-12 h-[64px] sm:w-14 sm:h-[72px] rounded overflow-hidden bg-muted flex items-center justify-center">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Text info */}
              <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                {/* Full title — never truncated, wraps to multiple lines */}
                <p className="text-sm font-medium leading-snug break-words whitespace-normal">
                  {book.title}
                </p>
                {book.author && (
                  <p className="text-xs text-muted-foreground leading-snug break-words">
                    {book.author}
                  </p>
                )}
                <MiniStars rating={book.rating} />
                <StatusPill status={book.status} t={t} />
              </div>
            </button>
          ))}

          {/* Add book form */}
          <div ref={wrapperRef} className="relative pt-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setShowDropdown(false); addBook(); }
                    if (e.key === "Escape") setShowDropdown(false);
                  }}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  placeholder={t("tracking.addBookPlaceholder")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                {searching && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {/* Cover preview when a result is selected */}
                {pending?.cover_url && !showDropdown && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-4 rounded overflow-hidden">
                    <img src={pending.cover_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => { setShowDropdown(false); addBook(); }}
              >
                {t("common.add")}
              </Button>
            </div>

            {/* Google Books suggestions dropdown */}
            {showDropdown && results.length > 0 && (
              <div className="absolute left-0 right-[68px] top-[calc(100%-4px)] z-50 rounded-lg border bg-background shadow-xl overflow-hidden">
                {results.map((r, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                    onClick={() => selectResult(r)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="shrink-0 h-11 w-8 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {r.cover_url ? (
                        <img src={r.cover_url} alt={r.title} className="h-full w-full object-cover" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      {r.author && (
                        <p className="text-xs text-muted-foreground truncate">{r.author}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
