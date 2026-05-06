import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="mx-auto h-12 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mx-auto h-4 w-5/6" />
        <div className="grid grid-cols-3 gap-4 pt-8">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
