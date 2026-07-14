import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <h3 className="text-base font-bold tracking-[-0.01em] text-text">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

/** Wrap a field in this to make it span both columns inside a FormSection grid. */
export function FullRow({ children }: { children: ReactNode }) {
  return <div className="md:col-span-2">{children}</div>;
}
