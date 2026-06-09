export default function OperationsLoading() {
  return (
    <div className="animate-pulse space-y-6 p-2">
      {/* Header */}
      <div className="space-y-2">
        <div className="bg-surface-container-highest h-9 w-44 rounded-xl" />
        <div className="bg-surface-container-highest h-4 w-80 rounded-lg opacity-60" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-highest space-y-3 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="bg-surface-container-high h-3 w-20 rounded" />
              <div className="bg-surface-container-high h-4 w-4 rounded opacity-60" />
            </div>
            <div className="bg-surface-container-high h-8 w-24 rounded-lg" />
            <div className="bg-surface-container-high h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Operations table */}
      <div className="bg-surface-container-highest overflow-hidden rounded-2xl">
        {/* Table header */}
        <div className="border-surface-container-high flex items-center gap-4 border-b px-5 py-3">
          {[40, 20, 20, 15].map((w, i) => (
            <div
              key={i}
              className="bg-surface-container-high h-3 rounded opacity-60"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-surface-container-high flex items-center gap-4 border-b px-5 py-4 last:border-0">
            <div className="flex items-center gap-3" style={{ width: '40%' }}>
              <div className="bg-surface-container-high h-8 w-8 flex-shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="bg-surface-container-high h-3 w-3/4 rounded" />
                <div className="bg-surface-container-high h-2.5 w-1/2 rounded opacity-60" />
              </div>
            </div>
            <div className="bg-surface-container-high h-3 w-20 rounded" style={{ width: '20%' }} />
            <div className="bg-surface-container-high h-3 w-16 rounded" style={{ width: '20%' }} />
            <div
              className="bg-surface-container-high h-5 w-16 rounded-full"
              style={{ width: '15%' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
