export default function ProjectsLoading() {
  return (
    <div className="animate-pulse space-y-6 p-2">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="bg-surface-container-highest h-4 w-24 rounded" />
          <div className="bg-surface-container-highest h-9 w-48 rounded-xl" />
        </div>
        <div className="bg-surface-container-highest h-10 w-36 rounded-xl" />
      </div>

      {/* Project cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface-container-highest rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="bg-surface-container-high h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="bg-surface-container-high h-4 w-3/4 rounded" />
                <div className="bg-surface-container-high h-3 w-1/2 rounded opacity-60" />
              </div>
            </div>
            <div className="bg-surface-container-high mb-2 h-3 w-full rounded" />
            <div className="bg-surface-container-high mb-4 h-3 w-4/5 rounded opacity-60" />
            <div className="flex items-center justify-between">
              <div className="bg-surface-container-high h-5 w-16 rounded-full" />
              <div className="bg-surface-container-high h-3 w-20 rounded opacity-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
