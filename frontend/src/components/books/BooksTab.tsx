import { useState, useEffect, useRef } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackingApi, searchGoogleBooks, type BookEntry, type GoogleBookResult } from "@/lib/api";
import { BookDetailModal, StatusPill, BookCover } from "./BookDetailModal";
import { useI18n } from "@/contexts/LanguageContext";

function MiniStars({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div className="flex gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3 w-3 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
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
  const [selectedResult, setSelectedResult] = useState<GoogleBookResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackingApi.getBooks().then(setBooks).catch(console.error);
  }, []);

  // Cancel any pending debounce timer on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

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

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedResult(null);
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
  };

  const selectResult = (r: GoogleBookResult) => {
    setSelectedResult(r);
    setQuery(r.title);
    setShowDropdown(false);
    setResults([]);
  };

  const addBook = async () => {
    const title = selectedResult?.title ?? query.trim();
    if (!title) return;
    const book = await trackingApi.createBook({
      title,
      author: selectedResult?.author,
      cover_url: selectedResult?.cover_url,
    });
    setBooks((bs) => [book, ...bs]);
    setQuery("");
    setSelectedResult(null);
    setResults([]);
    setShowDropdown(false);
  };

  const hasThumbnail = !!selectedResult?.cover_url && !showDropdown;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("tracking.readingList")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {books.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("tracking.noBooksYet")}</p>
          )}

          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className="w-full text-left rounded-lg border px-3 py-3 hover:bg-muted/50 active:bg-muted transition-colors flex gap-3 items-start min-h-[80px]"
            >
              <BookCover
                url={book.cover_url}
                alt={book.title}
                className="shrink-0 w-12 h-[64px] sm:w-14 sm:h-[72px] rounded overflow-hidden"
              />
              <div className="flex-1 min-w-0 space-y-1 pt-0.5">
                {/* Full title — wraps to multiple lines, never truncated */}
                <p className="text-sm font-medium leading-snug break-words whitespace-normal">{book.title}</p>
                {book.author && (
                  <p className="text-xs text-muted-foreground leading-snug break-words">{book.author}</p>
                )}
                <MiniStars rating={book.rating} />
                <StatusPill status={book.status} />
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
                  className={`w-full rounded-md border bg-background py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${hasThumbnail ? "pl-8 pr-3" : "px-3"}`}
                />
                {/* Spinner */}
                {searching && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {/* Selected cover preview */}
                {hasThumbnail && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-4 rounded overflow-hidden pointer-events-none">
                    <img src={selectedResult!.cover_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <Button size="sm" onClick={() => { setShowDropdown(false); addBook(); }}>
                {t("common.add")}
              </Button>
            </div>

            {/* Google Books dropdown */}
            {showDropdown && results.length > 0 && (
              <div className="absolute left-0 right-[68px] top-[calc(100%-4px)] z-50 rounded-lg border bg-background shadow-xl overflow-hidden">
                {results.map((r) => (
                  <button
                    key={r.title + (r.author ?? "")}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectResult(r)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left border-b last:border-b-0"
                  >
                    <BookCover
                      url={r.cover_url}
                      alt={r.title}
                      className="shrink-0 h-11 w-8 rounded overflow-hidden"
                      iconClassName="h-4 w-4 text-muted-foreground/40"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      {r.author && <p className="text-xs text-muted-foreground truncate">{r.author}</p>}
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
          onUpdated={(updated) => { setBooks((bs) => bs.map((b) => (b.id === updated.id ? updated : b))); setSelectedBook(updated); }}
          onDeleted={(id) => { setBooks((bs) => bs.filter((b) => b.id !== id)); setSelectedBook(null); }}
        />
      )}
    </>
  );
}
