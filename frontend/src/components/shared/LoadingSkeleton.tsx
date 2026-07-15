interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12 rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div className="skeleton h-4 w-2/3 rounded-lg" />
      <div className="skeleton h-3 w-full rounded-lg" />
      <div className="skeleton h-3 w-4/5 rounded-lg" />
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="skeleton h-8 w-40 rounded-xl mb-2" />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
