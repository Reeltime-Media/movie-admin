type InlineLoadingProps = {
  label?: string;
  className?: string;
  minHeight?: "sm" | "md" | "lg";
};

const minHeightClass = {
  sm: "min-h-[120px]",
  md: "min-h-[200px]",
  lg: "min-h-[320px]",
};

export function InlineLoading({
  label,
  className = "",
  minHeight = "md",
}: InlineLoadingProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center py-10",
        minHeightClass[minHeight],
        className,
      ].join(" ")}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label ?? "Loading"}
    >
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand"
        aria-hidden
      />
      {label ? <p className="mt-3 text-[12px] font-medium text-text-muted">{label}</p> : null}
    </div>
  );
}
