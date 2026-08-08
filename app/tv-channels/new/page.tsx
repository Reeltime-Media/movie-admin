"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../../components/AdminCard";
import { AdminShell } from "../../components/AdminShell";
import { Button } from "../../components/ui/Button";
import { adminInputClass, adminLabelClass } from "../../lib/adminUi";
import { createAdminTvChannel } from "../../lib/api";

export default function NewTvChannelPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSourceUrl = sourceUrl.trim();
    if (!trimmedName) {
      setError("Enter a channel name.");
      return;
    }
    if (!trimmedSourceUrl) {
      setError("Enter a source stream URL.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createAdminTvChannel({
        name: trimmedName,
        description: description.trim() || null,
        sourceUrl: trimmedSourceUrl,
        isFree,
      });
      toast.success("Channel created");
      router.push(`/tv-channels/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create channel";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminShell
      title="New TV channel"
      headerAction={
        <Button href="/tv-channels" variant="secondary" size="sm" className="shrink-0">
          Back to TV channels
        </Button>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="w-full space-y-6">
        <AdminCard title="Channel details">
          <div className="space-y-4">
            <label className="block">
              <span className={adminLabelClass}>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Channel 5 News"
                className={adminInputClass}
                required
              />
            </label>

            <label className="block">
              <span className={adminLabelClass}>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional short description shown to viewers."
                className={`${adminInputClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={adminLabelClass}>Source URL</span>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                type="url"
                placeholder="https://origin.example.com/stream/index.m3u8"
                className={adminInputClass}
                required
              />
              <span className="mt-1.5 block text-2xs text-text-disabled">
                The origin HLS (.m3u8) source FFmpeg restreams from. Admin-only — never shown to
                viewers.
              </span>
            </label>

            <button
              type="button"
              role="switch"
              aria-checked={isFree}
              onClick={() => setIsFree((v) => !v)}
              className="group flex items-center gap-3"
            >
              <span
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  isFree ? "bg-success" : "bg-text-disabled/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                    isFree ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </span>
              <span className="text-xs font-semibold text-text">
                {isFree ? "Free channel" : "Requires subscription"}
              </span>
            </button>
          </div>

          {error ? <p className="mt-4 text-xs font-semibold text-warning">{error}</p> : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button href="/tv-channels" variant="secondary">
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create channel"}
            </Button>
          </div>
        </AdminCard>
      </form>
    </AdminShell>
  );
}
