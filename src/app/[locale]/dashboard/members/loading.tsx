export default function MembersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="bg-surface-3 h-8 w-40 animate-pulse rounded-lg" />
        <div className="bg-surface-3 h-4 w-64 animate-pulse rounded" />
      </div>
      <div className="card h-80 animate-pulse" />
    </div>
  );
}
