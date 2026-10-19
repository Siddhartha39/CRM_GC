import React from 'react';

/**
 * Neumorphic Soft UI Loading Skeleton
 * Molded placeholders with soft inset wells and subtle pulse animation.
 */
export function LoadingSkeleton({ count = 3, height = 'h-20' }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} w-full bg-background shadow-neu-flat rounded-2xl flex items-center px-5 animate-pulse`}
        >
          {/* Inset Avatar Well */}
          <div className="w-11 h-11 rounded-full bg-background shadow-neu-pressed shrink-0 mr-4" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted/30 rounded-lg w-1/3" />
            <div className="h-3 bg-muted/20 rounded-lg w-1/2" />
          </div>
          <div className="w-20 h-8 rounded-xl bg-background shadow-neu-pressed-sm shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
