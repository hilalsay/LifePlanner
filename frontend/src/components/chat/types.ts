// Shared types for the Assistant panel.

import type { DragItem } from "@/lib/dragItem";

export type SuggestionKind = "monthly" | "weekly" | "habit" | "task";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  title: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
  attachments?: DragItem[];
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
