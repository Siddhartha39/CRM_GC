import React from 'react';
import { Button } from './Button';
import { Inbox } from 'lucide-react';

/**
 * Neumorphic Soft UI Empty State
 * Features a deep carved icon well and soft extruded background surface.
 */
export function EmptyState({
  title = 'No records found',
  description = 'There are no items matching this filter or queue.',
  actionText,
  onAction,
  icon: Icon = Inbox,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-background shadow-neu-flat rounded-[32px] my-6 transition-all">
      {/* Deep Inset Icon Well */}
      <div className="w-20 h-20 rounded-full bg-background shadow-neu-pressed-deep flex items-center justify-center mb-4 text-accent animate-neu-float">
        <Icon className="w-9 h-9 stroke-[2]" />
      </div>
      <h3 className="text-xl font-display font-bold text-foreground mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="text-sm font-body text-muted max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionText}
        </Button>
      )}
    </div>
  );
}
