export default function BillingLoading() {
  return (
    <div className="animate-pulse space-y-6 p-2">
      {/* Header */}
      <div className="space-y-2">
        <div className="bg-surface-container-highest h-9 w-44 rounded-xl" />
        <div className="bg-surface-container-highest h-4 w-80 rounded-lg opacity-60" />
      </div>

      {/* Plan card */}
      <div className="bg-surface-container-highest space-y-5 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="bg-surface-container-high h-3 w-20 rounded" />
            <div className="bg-surface-container-high h-7 w-32 rounded-lg" />
          </div>
          <div className="bg-surface-container-high h-8 w-24 rounded-xl" />
        </div>

        <div className="bg-surface-container-low h-px w-full rounded" />

        {/* Features list */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="bg-surface-container-high size-4 shrink-0 rounded-full" />
              <div
                className="bg-surface-container-high h-3 rounded"
                style={{ width: `${[55, 70, 45, 60][i]}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
      <div className="bg-surface-container-highest overflow-hidden rounded-2xl">
        <div className="border-surface-container-high border-b px-5 py-4">
          <div className="bg-surface-container-high h-5 w-36 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-surface-container-high flex items-center justify-between border-b px-5 py-3.5 last:border-0">
            <div className="bg-surface-container-high h-3 w-28 rounded" />
            <div className="bg-surface-container-high h-3 w-16 rounded" />
            <div className="bg-surface-container-high h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
