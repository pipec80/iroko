export default function TeamLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8 p-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="bg-surface-container-highest h-8 w-56 rounded-xl" />
          <div className="bg-surface-container-highest h-4 w-80 rounded-lg opacity-60" />
        </div>
        <div className="bg-surface-container-highest h-12 w-40 rounded-xl" />
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Members list */}
        <div className="bg-surface-container-low rounded-3xl lg:col-span-2">
          <div className="bg-surface-container-highest/10 px-8 py-6">
            <div className="bg-surface-container-high h-3 w-32 rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-5 px-8 py-5">
              <div className="bg-surface-container-highest size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="bg-surface-container-highest h-4 w-36 rounded" />
                <div className="bg-surface-container-highest h-3 w-20 rounded opacity-50" />
              </div>
              <div className="bg-surface-container-highest h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>

        {/* Side cards */}
        <div className="space-y-6">
          <div className="bg-primary/5 h-64 rounded-3xl" />
          <div className="bg-surface-container-low h-40 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
