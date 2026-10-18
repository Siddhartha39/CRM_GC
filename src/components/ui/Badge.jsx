import React from 'react';

export function LeadCategoryBadge({ category, size = 'md' }) {
  let styleClass = 'badge-cold';
  let label = category || 'Cold';

  if (category === 'Hot') {
    styleClass = 'badge-hot';
  } else if (category === 'Warm') {
    styleClass = 'badge-warm';
  } else if (category === 'Cold') {
    styleClass = 'badge-cold';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-heading font-bold rounded-full border-2 ${styleClass} ${sizeClass}`}
    >
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      {label} Lead
    </span>
  );
}

export function LeadStatusBadge({ status, size = 'md' }) {
  let colorStyles = 'bg-gray-100 text-gray-800 border-gray-400';

  switch (status) {
    case 'New':
      colorStyles = 'bg-blue-50 text-blue-700 border-blue-400';
      break;
    case 'Contacted':
      colorStyles = 'bg-purple-50 text-purple-700 border-purple-400';
      break;
    case 'Follow-up':
      colorStyles = 'bg-amber-50 text-amber-800 border-amber-400';
      break;
    case 'Converted':
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-500 font-bold';
      break;
    case 'Lost':
      colorStyles = 'bg-stone-100 text-stone-600 border-stone-400 line-through';
      break;
    case 'Do Not Contact':
      colorStyles = 'bg-red-50 text-red-700 border-red-500 font-bold';
      break;
    default:
      colorStyles = 'bg-gray-100 text-gray-800 border-gray-400';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center font-body border-2 border-dashed rounded-md ${colorStyles} ${sizeClass}`}
    >
      {status || 'New'}
    </span>
  );
}

export function FollowUpStatusBadge({ status }) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-600 px-2.5 py-0.5 rounded-full">
        ✓ Done
      </span>
    );
  }
  if (status === 'Cancelled') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-stone-500 bg-stone-100 border border-stone-400 px-2 py-0.5 rounded-full line-through">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-600 px-2.5 py-0.5 rounded-full">
      ⏳ Pending
    </span>
  );
}
