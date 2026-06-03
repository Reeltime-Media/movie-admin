export function AdminErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
      <div>{message}</div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 font-bold hover:underline">
          Retry
        </button>
      ) : null}
    </div>
  );
}
