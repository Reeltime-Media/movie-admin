export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-text-muted">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
