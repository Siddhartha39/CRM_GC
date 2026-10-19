import React from 'react';
import { AllLeadsPage } from './AllLeadsPage';

/**
 * Neumorphic Soft UI Category Specific Lead Pages
 */
export function HotLeadsPage() {
  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 bg-background shadow-neu-flat-sm rounded-2xl flex flex-wrap items-center justify-between gap-3 text-red-500 font-body">
        <span className="font-display font-bold text-sm flex items-center gap-2">
          🔥 Priority Calling Queue:
        </span>
        <span className="text-xs text-muted">
          Hot leads have immediate requirements. Call within 24 hours to maximize store conversions.
        </span>
      </div>
      <AllLeadsPage forcedCategory="Hot" />
    </div>
  );
}

export function WarmLeadsPage() {
  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 bg-background shadow-neu-flat-sm rounded-2xl flex flex-wrap items-center justify-between gap-3 text-amber-500 font-body">
        <span className="font-display font-bold text-sm flex items-center gap-2">
          ⚡ Evaluation Stage:
        </span>
        <span className="text-xs text-muted">
          Warm leads are evaluating laptop/PC models and budget. Share WhatsApp quotes and schedule timely follow-ups.
        </span>
      </div>
      <AllLeadsPage forcedCategory="Warm" />
    </div>
  );
}

export function ColdLeadsPage() {
  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 bg-background shadow-neu-flat-sm rounded-2xl flex flex-wrap items-center justify-between gap-3 text-blue-500 font-body">
        <span className="font-display font-bold text-sm flex items-center gap-2">
          ❄️ Long-term Pipeline:
        </span>
        <span className="text-xs text-muted">
          Cold leads with future plans or delayed budgets. Keep in touch with callbacks for upcoming sales cycles.
        </span>
      </div>
      <AllLeadsPage forcedCategory="Cold" />
    </div>
  );
}
