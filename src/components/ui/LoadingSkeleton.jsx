import React from 'react';

export function LoadingSkeleton({ count = 3, height = 'h-16' }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} w-full bg-paper-white border-2 border-border/40 rounded-lg animate-pulse shadow-sm flex items-center px-4`}
        >
          <div className="w-10 h-10 rounded-full bg-muted/70 mr-4" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted/80 rounded w-1/3" />
            <div className="h-3 bg-muted/50 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
