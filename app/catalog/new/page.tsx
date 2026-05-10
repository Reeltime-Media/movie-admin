import Link from "next/link";
import { AdminCard } from "../../components/AdminCard";
import { AdminShell } from "../../components/AdminShell";

const textInputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

const selectClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated";

const fileInputClass =
  "w-full rounded-md border border-dashed border-border bg-bg px-3 py-4 text-[12px] text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-white hover:border-border-hover";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] text-text-disabled">{hint}</span> : null}
    </label>
  );
}

export default function NewCatalogTitlePage() {
  return (
    <AdminShell title="Upload new movie">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="max-w-[72ch] text-[13px] leading-relaxed text-text-muted">
            Add a movie or series entry for the Reeltime client. This screen is ready for a backend
            upload action when storage and authentication are connected.
          </p>
        </div>
        <Link
          href="/catalog"
          className="rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
        >
          Back to catalog
        </Link>
      </div>

      <form action="/catalog" method="get" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminCard title="Title details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <input
                name="title"
                required
                placeholder="The Last Drive"
                className={textInputClass}
              />
            </Field>

            <Field label="Content type">
              <select name="type" defaultValue="Movie" className={selectClass}>
                <option>Movie</option>
                <option>Series</option>
              </select>
            </Field>

            <Field label="Genre">
              <input
                name="genre"
                required
                placeholder="Action Thriller"
                className={textInputClass}
              />
            </Field>

            <Field label="Release year">
              <input
                name="releaseYear"
                type="number"
                min="1900"
                max="2100"
                placeholder="2026"
                className={textInputClass}
              />
            </Field>

            <Field label="Rating">
              <input
                name="rating"
                inputMode="decimal"
                placeholder="8.7"
                className={textInputClass}
              />
            </Field>

            <Field label="Runtime">
              <input name="runtime" placeholder="1h 42m" className={textInputClass} />
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  name="description"
                  rows={5}
                  placeholder="Short synopsis shown on detail pages and promotional placements."
                  className={`${textInputClass} resize-y`}
                />
              </Field>
            </div>
          </div>
        </AdminCard>

        <div className="space-y-6">
          <AdminCard title="Publishing">
            <div className="space-y-4">
              <Field label="Status">
                <select name="status" defaultValue="Draft" className={selectClass}>
                  <option>Draft</option>
                  <option>Review</option>
                  <option>Scheduled</option>
                  <option>Published</option>
                </select>
              </Field>

              <Field label="Visibility">
                <select name="visibility" defaultValue="Client catalog" className={selectClass}>
                  <option>Client catalog</option>
                  <option>Hidden</option>
                  <option>Staff pick</option>
                  <option>Coming soon</option>
                </select>
              </Field>

              <Field label="Rental price">
                <input name="price" placeholder="$2.99" className={textInputClass} />
              </Field>
            </div>
          </AdminCard>

          <AdminCard title="Upload assets">
            <div className="space-y-4">
              <Field label="Poster image" hint="PNG, JPG, or WebP. Recommended portrait poster.">
                <input name="poster" type="file" accept="image/*" className={fileInputClass} />
              </Field>

              <Field label="Movie file" hint="MP4, MOV, or HLS package when backend storage is ready.">
                <input
                  name="video"
                  type="file"
                  accept="video/mp4,video/quicktime,application/x-mpegURL"
                  className={fileInputClass}
                />
              </Field>

              <Field label="Trailer file">
                <input name="trailer" type="file" accept="video/*" className={fileInputClass} />
              </Field>
            </div>
          </AdminCard>
        </div>

        <div className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-end gap-3 rounded-lg border border-border bg-surface px-5 py-4">
            <Link
              href="/catalog"
              className="rounded-md border border-border bg-bg px-4 py-2.5 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-md border border-border bg-surface-elevated px-4 py-2.5 text-[12px] font-bold text-text transition-colors hover:border-border-hover"
            >
              Save draft
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Submit for review
            </button>
          </div>
        </div>
      </form>
    </AdminShell>
  );
}
