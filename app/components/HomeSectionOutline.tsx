"use client";

import { Eye, EyeOff, Plus } from "lucide-react";
import type { ApiHomeSection } from "../lib/api";
import { sectionLabel, sectionSummary, sectionTypeInfo } from "../lib/homeSections";
import { HomeSectionGlyph } from "./HomeSectionGlyph";
import { SortableList } from "./SortableList";
import { Button } from "./ui/Button";

/** The home page, top to bottom: pick a section, drag to reorder, show or hide it. */
export function HomeSectionOutline({
  sections,
  activeId,
  onSelect,
  onPreview,
  onReorder,
  onToggleVisible,
  onAdd,
}: {
  sections: ApiHomeSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Fired on hover or focus, before a likely click. */
  onPreview: (section: ApiHomeSection) => void;
  onReorder: (next: ApiHomeSection[]) => void | Promise<void>;
  onToggleVisible: (section: ApiHomeSection) => void;
  onAdd: () => void;
}) {
  const visibleCount = sections.filter((section) => section.is_visible).length;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Page sections</h2>
          <p className="text-xs text-text-muted">
            {visibleCount} of {sections.length} showing, top to bottom
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" icon={<Plus size={14} aria-hidden />} onClick={onAdd}>
          Add
        </Button>
      </div>

      <div className="px-1.5 pb-1.5 pt-1">
        <SortableList
          items={sections}
          layout="rows"
          onReorder={onReorder}
          itemClassName={(section) =>
            section.id === activeId ? "bg-surface-elevated" : "hover:bg-surface-soft"
          }
          renderItem={(section) => {
            const label = sectionLabel(section);
            const active = section.id === activeId;
            return (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-drag-ok
                  onClick={() => onSelect(section.id)}
                  onMouseEnter={() => onPreview(section)}
                  onFocus={() => onPreview(section)}
                  aria-current={active ? "true" : undefined}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1.5 pl-1 text-left"
                >
                  <HomeSectionGlyph
                    kind={sectionTypeInfo(section.type).glyph}
                    className={[
                      active ? "text-brand" : "text-text-disabled",
                      section.is_visible ? "" : "opacity-40",
                    ].join(" ")}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={[
                        "block truncate text-sm font-medium",
                        section.is_visible ? "text-text" : "text-text-muted",
                      ].join(" ")}
                    >
                      {label}
                    </span>
                    <span className="block truncate text-xs text-text-muted">
                      {section.is_visible ? sectionSummary(section) : "Hidden"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleVisible(section)}
                  aria-label={section.is_visible ? `Hide ${label}` : `Show ${label}`}
                  title={section.is_visible ? "Hide from home" : "Show on home"}
                  className={[
                    "grid size-7 shrink-0 place-items-center rounded-md text-text-disabled transition-colors hover:bg-surface-elevated hover:text-text focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100",
                    section.is_visible ? "opacity-0" : "opacity-100",
                  ].join(" ")}
                >
                  {section.is_visible ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
                </button>
              </div>
            );
          }}
        />
      </div>

      <p className="border-t border-border px-4 py-2.5 text-xs text-text-muted">
        Automatic genre rails and the viewer’s library follow these sections.
      </p>
    </section>
  );
}
