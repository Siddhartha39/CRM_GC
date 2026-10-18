import React from 'react';
import { Button } from './Button';
import { Inbox } from 'lucide-react';

export function EmptyState({
  title = 'No records found',
  description = 'There are no items matching this filter or queue.',
  actionText,
  onAction,
  icon: Icon = Inbox,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-paper-white card-hand border-2 border-dashed border-border/60 my-4">
      <div className="w-16 h-16 rounded-full bg-sticky-yellow border-2 border-border flex items-center justify-center mb-3 shadow-hand-sm">
        <Icon className="w-8 h-8 text-foreground stroke-[1.8]" />
      </div>
      <h3 className="text-xl font-heading font-bold text-foreground mb-1">
        {title}
      </h3>
      <p className="text-sm font-body text-foreground/70 max-w-md mb-4">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

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
