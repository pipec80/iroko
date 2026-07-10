export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-10 p-2">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="bg-surface-3 h-9 w-64 rounded-xl" />
        <div className="bg-surface-3 h-5 w-96 rounded-lg opacity-60" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-3 rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="bg-surface-2 h-3 w-24 rounded" />
              <div className="bg-surface-2 size-5 rounded" />
            </div>
            <div className="bg-surface-2 mb-3 h-9 w-32 rounded-lg" />
            <div className="bg-surface-2 h-4 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Chart area skeleton */}
      <div className="bg-surface-3 rounded-2xl p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-surface-2 size-6 rounded" />
          <div className="bg-surface-2 h-5 w-40 rounded" />
        </div>
        <div className="bg-muted/50 h-[350px] rounded-xl" />
      </div>
    </div>
  );
}
