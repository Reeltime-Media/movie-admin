"use client";

import { GripVertical } from "lucide-react";
import { useState, type DragEvent, type ReactNode } from "react";

type Identifiable = { id: string };

type SortableListProps<T extends Identifiable> = {
  items: T[];
  onReorder: (next: T[]) => void | Promise<void>;
  disabled?: boolean;
  renderItem: (item: T, index: number) => ReactNode;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, select, textarea, label, [role='button'], [data-no-drag]",
    ),
  );
}

/**
 * Vertical Trello-style reorder. Drag from anywhere on the card; Edit /
 * Remove and other controls stay clickable.
 */
export function SortableList<T extends Identifiable>({
  items,
  onReorder,
  disabled = false,
  renderItem,
}: SortableListProps<T>) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const clearDrag = () => {
    setDragId(null);
    setOverId(null);
  };

  const onDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (disabled || isInteractiveTarget(event.target)) {
      event.preventDefault();
      return;
    }
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    if (!dragId || disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  };

  const onDrop = async (targetId: string) => {
    if (!dragId || disabled) {
      clearDrag();
      return;
    }
    if (dragId === targetId) {
      clearDrag();
      return;
    }
    const from = items.findIndex((item) => item.id === dragId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) {
      clearDrag();
      return;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    clearDrag();
    await onReorder(next);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isDragging = dragId === item.id;
        const isOver = overId === item.id && dragId !== item.id;
        return (
          <div
            key={item.id}
            draggable={!disabled}
            onDragStart={(event) => onDragStart(event, item.id)}
            onDragOver={(event) => onDragOver(event, item.id)}
            onDrop={() => void onDrop(item.id)}
            onDragEnd={clearDrag}
            className={[
              "flex items-stretch gap-3 rounded-lg border bg-bg p-4 transition-[border-color,opacity,box-shadow]",
              disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
              isDragging
                ? "border-brand/50 opacity-50 shadow-lg shadow-black/40"
                : isOver
                  ? "border-brand shadow-[inset_0_0_0_1px_rgba(229,9,20,0.35)]"
                  : "border-border hover:border-border-hover",
            ].join(" ")}
          >
            <div
              className="flex shrink-0 items-center self-center text-text-disabled"
              aria-hidden
            >
              <GripVertical size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Assign contiguous sort_order 0..n-1 and PATCH only rows that changed. */
export async function persistReorderedSort<T extends { id: string; sort_order: number }>(
  next: T[],
  update: (id: string, sortOrder: number) => Promise<unknown>,
): Promise<T[]> {
  const withOrder = next.map((item, index) => ({ ...item, sort_order: index }));
  const changed = withOrder.filter((_, index) => next[index].sort_order !== index);
  if (changed.length > 0) {
    await Promise.all(changed.map((item) => update(item.id, item.sort_order)));
  }
  return withOrder;
}
