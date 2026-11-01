"use client";

import { useState } from "react";
import type { ApiHomeSection, ApiHomeSectionType } from "../lib/api";
import {
  ADDABLE_SECTION_TYPES,
  SECTION_TYPES,
  isRepeatableSection,
} from "../lib/homeSections";
import { adminLabelClass } from "../lib/adminUi";
import { AdminSelect, type AdminSelectOption } from "./AdminSelect";
import { HomeSectionGlyph } from "./HomeSectionGlyph";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Field";

export function HomeSectionAddDialog({
  sections,
  genreOptions,
  isSaving,
  onCreate,
  onClose,
}: {
  sections: ApiHomeSection[];
  genreOptions: AdminSelectOption[];
  isSaving: boolean;
  onCreate: (input: { type: ApiHomeSectionType; title: string; genre: string }) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<ApiHomeSectionType>("custom");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Horror");

  const existingTypes = new Set(sections.map((section) => section.type));
  const usedGenres = new Set(sections.map((section) => section.genre_name?.toLowerCase()));
  const availableTypes = ADDABLE_SECTION_TYPES.filter(
    (value) => isRepeatableSection(value) || !existingTypes.has(value),
  );
  const availableGenres = genreOptions.filter(
    (option) => !usedGenres.has(option.value.toLowerCase()),
  );
  const chosenGenre = availableGenres.some((option) => option.value === genre)
    ? genre
    : (availableGenres[0]?.value ?? "");

  const canCreate =
    !isSaving &&
    (type !== "custom" || title.trim().length > 0) &&
    (type !== "genre" || chosenGenre.length > 0);

  return (
    <Dialog
      title="Add section"
      description="New sections go to the bottom of the page. You can move them after."
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={isSaving}
            disabled={!canCreate}
            onClick={() => onCreate({ type, title: title.trim(), genre: chosenGenre })}
          >
            Add section
          </Button>
        </>
      }
    >
      <div
        role="radiogroup"
        aria-label="Section type"
        className="-mx-1 grid min-h-0 gap-1 overflow-y-auto px-1 sm:grid-cols-2"
      >
        {availableTypes.map((value) => {
          const active = value === type;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setType(value)}
              className={[
                "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                active
                  ? "border-brand bg-brand-soft font-medium text-text"
                  : "border-transparent text-text-muted hover:bg-surface-elevated hover:text-text",
              ].join(" ")}
            >
              <HomeSectionGlyph
                kind={SECTION_TYPES[value].glyph}
                className={active ? "text-brand" : "text-text-disabled"}
              />
              {SECTION_TYPES[value].label}
            </button>
          );
        })}
      </div>

      {type === "custom" ? (
        <label className="mt-4 block shrink-0">
          <span className={adminLabelClass}>Title</span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Editor’s picks"
          />
        </label>
      ) : null}

      {type === "genre" ? (
        <div className="mt-4 shrink-0">
          <span className={adminLabelClass}>Genre</span>
          {availableGenres.length > 0 ? (
            <AdminSelect
              aria-label="Genre"
              value={chosenGenre}
              onChange={setGenre}
              options={availableGenres}
            />
          ) : (
            <p className="text-sm text-text-muted">Every genre already has a rail.</p>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
