import React from 'react';

/**
 * Neumorphic Soft UI Badges
 * Molded tactile pills with smooth inset or flat shadow depth and no harsh borders.
 */
export function LeadCategoryBadge({ category, size = 'md' }) {
  const normCategory = category || 'Cold';

  const categoryConfig = {
    Hot: {
      dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
      text: 'text-red-600',
      label: '🔥 Hot Lead',
    },
    Warm: {
      dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      text: 'text-amber-700',
      label: '⚡ Warm Lead',
    },
    Cold: {
      dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
      text: 'text-blue-600',
      label: '❄️ Cold Lead',
    },
  };

  const config = categoryConfig[normCategory] || categoryConfig.Cold;
  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center gap-2 font-display font-bold rounded-full bg-background shadow-neu-pressed-sm ${config.text} ${sizeClass}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

export function LeadStatusBadge({ status, size = 'md' }) {
  const normStatus = status || 'New';

  const statusConfig = {
    New: 'text-accent shadow-neu-pressed-sm',
    Contacted: 'text-secondary-accent shadow-neu-pressed-sm',
    'Follow-up': 'text-amber-600 shadow-neu-pressed-sm',
    Converted: 'text-emerald-600 font-bold shadow-neu-flat-sm',
    Lost: 'text-muted line-through opacity-75 shadow-neu-pressed-sm',
    'Do Not Contact': 'text-danger font-bold shadow-neu-pressed-sm',
  };

  const statusStyle = statusConfig[normStatus] || 'text-foreground shadow-neu-pressed-sm';
  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center font-body font-semibold rounded-xl bg-background ${statusStyle} ${sizeClass}`}
    >
      {normStatus}
    </span>
  );
}

export function FollowUpStatusBadge({ status }) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-background shadow-neu-flat-sm px-3 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Done
      </span>
    );
  }
  if (status === 'Cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted bg-background shadow-neu-pressed-sm px-2.5 py-1 rounded-full line-through opacity-75">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-background shadow-neu-pressed-sm px-3 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Pending
    </span>
  );
}
