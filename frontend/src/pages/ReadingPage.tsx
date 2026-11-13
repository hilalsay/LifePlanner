import { BooksTab } from "@/components/books/BooksTab";

/** Reading list (formerly the "Books" tab of Tracking). */
export function ReadingPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <BooksTab />
    </div>
  );
}
