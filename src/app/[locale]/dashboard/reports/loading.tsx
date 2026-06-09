export default function ReportsLoading() {
  return (
    <div className="animate-pulse space-y-8 p-2">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="bg-surface-container-highest h-9 w-40 rounded-xl" />
          <div className="bg-surface-container-highest h-4 w-72 rounded-lg opacity-60" />
        </div>
        <div className="bg-surface-container-highest h-10 w-28 rounded-xl" />
      </div>

      {/* Report category sections */}
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="space-y-3">
          {/* Category header */}
          <div className="flex items-center gap-3">
            <div className="bg-surface-container-highest h-6 w-6 rounded" />
            <div className="bg-surface-container-highest h-5 w-36 rounded" />
          </div>

          {/* Report rows */}
          <div className="bg-surface-container-highest overflow-hidden rounded-2xl">
            {Array.from({ length: 3 }).map((_, row) => (
              <div
                key={row}
                className="border-surface-container-high flex items-center justify-between border-b px-5 py-4 last:border-0">
                <div className="space-y-1.5">
                  <div className="bg-surface-container-high h-4 w-48 rounded" />
                  <div className="bg-surface-container-high h-3 w-64 rounded opacity-60" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-surface-container-high h-5 w-16 rounded-full" />
                  <div className="bg-surface-container-high h-4 w-4 rounded opacity-40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
