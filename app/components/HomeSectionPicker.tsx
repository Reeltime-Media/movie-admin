"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminCatalogSearchBar } from "./AdminCatalogSearchBar";
import { AdminMediaThumb } from "./AdminMediaThumb";
import { InlineLoading } from "./InlineLoading";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

export type HomeSectionPickerRow = {
  id: string;
  kind: "movie" | "series" | "tv_channel";
  title: string;
  slug: string;
  meta: string;
  posterKey: string | null;
};

export function HomeSectionPicker({
  sectionName,
  noun,
  rows,
  loading,
  listedIds,
  limit,
  onAdd,
  onClose,
}: {
  sectionName: string;
  noun: string;
  rows: HomeSectionPickerRow[];
  loading: boolean;
  listedIds: Set<string>;
  limit: number | null;
  onAdd: (row: HomeSectionPickerRow) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) => row.title.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const count = listedIds.size;
  const atLimit = limit != null && count >= limit;

  return (
    <Dialog
      title={`Add to ${sectionName}`}
      description={limit != null ? `${count} of ${limit} ${noun} added` : undefined}
      size="lg"
      onClose={onClose}
      footer={
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      }
    >
      <AdminCatalogSearchBar
        value={search}
        onChange={setSearch}
        placeholder={`Search ${noun}`}
        resultCount={filtered.length}
        totalCount={rows.length}
        maxWidthClassName="w-full"
      />
      <div className="-mx-5 mt-3 min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <InlineLoading label="Loading catalog" minHeight="sm" />
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">No matches. Try another name.</p>
        ) : (
          <ul>
            {filtered.map((row) => (
              <li
                key={`${row.kind}-${row.id}`}
                className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-surface-soft"
              >
                <AdminMediaThumb
                  objectKey={row.posterKey}
                  alt=""
                  emptyLabel=""
                  className={
                    row.kind === "tv_channel" ? "h-9 w-16 border-0" : "h-12 w-8 rounded-md border-0"
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">{row.title}</span>
                  {row.meta ? (
                    <span className="block truncate text-xs text-text-muted">{row.meta}</span>
                  ) : null}
                </span>
                {listedIds.has(row.id) ? (
                  <span className="inline-flex items-center gap-1 px-2.5 text-xs font-medium text-text-muted">
                    <Check size={13} aria-hidden />
                    Added
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={atLimit}
                    onClick={() => onAdd(row)}
                  >
                    Add
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
