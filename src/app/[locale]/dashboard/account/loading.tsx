export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-8 p-8">
      {/* Title skeleton */}
      <div className="bg-surface-container-highest h-8 w-48 rounded-xl" />

      {/* Tabs bar skeleton */}
      <div className="bg-surface-container-low inline-flex gap-1 rounded-xl p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-highest h-10 w-28 rounded-lg" />
        ))}
      </div>

      {/* Content cards skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="bg-surface-container-highest rounded-2xl p-8">
            <div className="mb-6 space-y-2">
              <div className="bg-surface-container-high h-5 w-48 rounded" />
              <div className="bg-surface-container-high h-4 w-72 rounded opacity-60" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-surface-container-high h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-surface-container-highest h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
