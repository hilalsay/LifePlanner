// Shared helper for dragging plan items (tasks, priorities, focuses, habits)
// onto the Assistant panel. The dragged item is serialized into the drag event
// so the panel can drop it into the chat composer as a ready-made prompt.

export type DragItemKind = "task" | "weekly" | "monthly" | "yearly" | "habit";

export interface DragItem {
  kind: DragItemKind;
  title: string;
  priority?: string;
  deadline?: string | null;
  completed?: boolean;
  description?: string | null;
}

// Custom MIME so we only react to our own drags, not arbitrary text/files.
export const CHAT_ITEM_MIME = "application/x-lifeplanner-item";

const KIND_LABEL: Record<DragItemKind, string> = {
  task: "task",
  weekly: "weekly priority",
  monthly: "monthly focus",
  yearly: "yearly goal",
  habit: "habit",
};

/** Build the prompt prefix pasted into the chat box for a dragged item. */
export function formatItemForChat(item: DragItem): string {
  const parts: string[] = [];
  if (item.kind === "task") {
    if (item.priority) parts.push(`${item.priority} priority`);
    if (item.deadline) parts.push(`due ${item.deadline}`);
    if (item.completed) parts.push("completed");
  }
  const meta = parts.length ? ` (${parts.join(", ")})` : "";
  return `About my ${KIND_LABEL[item.kind]} "${item.title}"${meta}: `;
}

/** Attach an item to a drag event. Call from a card's onDragStart. */
export function setChatDragItem(e: React.DragEvent, item: DragItem): void {
  try {
    e.dataTransfer.setData(CHAT_ITEM_MIME, JSON.stringify(item));
    // Plain-text fallback so the drag is meaningful elsewhere too.
    e.dataTransfer.setData("text/plain", formatItemForChat(item));
    // Allow copy so the chat panel can accept the drop. Cards that also support
    // reorder (move) call this last, leaving "copyMove" so both still work.
    e.dataTransfer.effectAllowed = "copyMove";
  } catch {
    /* some browsers restrict setData mid-drag; ignore */
  }
}

/** True if the drag carries one of our items (used to show the drop hint). */
export function hasChatDragItem(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(CHAT_ITEM_MIME);
}

/** Read the dropped item back, or null if this drag isn't one of ours. */
export function readChatDragItem(e: React.DragEvent): DragItem | null {
  const raw = e.dataTransfer.getData(CHAT_ITEM_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragItem;
  } catch {
    return null;
  }
}
