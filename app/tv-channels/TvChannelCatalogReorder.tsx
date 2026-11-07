"use client";

import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Save, Tv } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { SortableList } from "../components/SortableList";
import { Button } from "../components/ui/Button";
import { reorderAdminTvChannels, type ApiTvChannel } from "../lib/api";
import { mediaUrl } from "../lib/media";

type TvChannelCatalogReorderProps = {
  channels: ApiTvChannel[];
  onComplete: () => Promise<void> | void;
  onBack?: () => void;
};

export function TvChannelCatalogReorder({ channels, onComplete, onBack }: TvChannelCatalogReorderProps) {
  const initialItems = useMemo(() => {
    return [...channels].sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [channels]);

  const [items, setItems] = useState<ApiTvChannel[]>(initialItems);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  if (prevInitialItems !== initialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
    setHasChanges(false);
  }

  const handleReorder = (next: ApiTvChannel[]) => {
    setItems(next);
    setHasChanges(true);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row!);
    handleReorder(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ids = items.map((c) => c.id);
      await reorderAdminTvChannels(ids);
      toast.success("TV channel order saved!");
      setHasChanges(false);
      await onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save TV channel order");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setItems(initialItems);
    setHasChanges(false);
  };

  return (
    <AdminCard
      title="TV Channels Order"
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          {onBack ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onBack}
              disabled={isSaving}
            >
              Back to channels
            </Button>
          ) : null}
          {hasChanges ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={14} aria-hidden />}
              onClick={handleReset}
              disabled={isSaving}
            >
              Reset
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            icon={hasChanges ? <Save size={14} aria-hidden /> : <Check size={14} aria-hidden />}
            loading={isSaving}
            disabled={!hasChanges && !isSaving}
            onClick={() => void handleSave()}
          >
            {hasChanges ? "Save changes" : "Saved"}
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex items-center justify-between text-xs text-text-muted">
        <span>
          Showing <strong className="text-text">{items.length}</strong> TV channels in broadcast order
        </span>
        {hasChanges ? (
          <span className="font-semibold text-brand">● Unsaved order changes</span>
        ) : null}
      </div>

      <SortableList
        items={items}
        layout="grid"
        disabled={isSaving}
        onReorder={handleReorder}
        renderItem={(item, index) => {
          const logoUrl = mediaUrl(item.logo_key);
          return (
            <div className="group/item relative flex flex-col rounded-lg border border-border bg-surface p-2 shadow-xs transition-shadow hover:shadow-md">
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-surface-elevated">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={`${item.name} logo`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-text-disabled">
                    <Tv className="size-8 stroke-[1.5]" aria-hidden />
                  </div>
                )}

                {/* Position Pill */}
                <span className="absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-surface/95 px-1.5 text-xs font-bold tabular-nums text-text shadow-sm ring-1 ring-border">
                  #{index + 1}
                </span>

                {/* Reorder arrows */}
                <div className="absolute right-1.5 top-1.5 flex gap-1 rounded-md bg-surface/95 p-0.5 shadow-sm ring-1 ring-border opacity-0 transition-opacity focus-within:opacity-100 group-hover/item:opacity-100 [@media(hover:none)]:opacity-100">
                  <button
                    type="button"
                    aria-label={`Move ${item.name} earlier`}
                    title="Move earlier"
                    disabled={index === 0 || isSaving}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveItem(index, -1);
                    }}
                    className="grid size-5 place-items-center rounded text-text-muted transition-colors hover:bg-surface-elevated hover:text-text disabled:opacity-30"
                  >
                    <ChevronLeft size={13} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${item.name} later`}
                    title="Move later"
                    disabled={index === items.length - 1 || isSaving}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveItem(index, 1);
                    }}
                    className="grid size-5 place-items-center rounded text-text-muted transition-colors hover:bg-surface-elevated hover:text-text disabled:opacity-30"
                  >
                    <ChevronRight size={13} aria-hidden />
                  </button>
                </div>
              </div>

              <div className="mt-2 min-w-0">
                <h4 className="truncate text-xs font-semibold text-text" title={item.name}>
                  {item.name}
                </h4>
                <p className="mt-0.5 truncate font-mono text-2xs text-text-muted">
                  {item.slug}
                </p>
              </div>
            </div>
          );
        }}
      />
    </AdminCard>
  );
}
