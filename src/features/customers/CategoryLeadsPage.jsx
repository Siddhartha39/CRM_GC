import React from 'react';
import { AllLeadsPage } from './AllLeadsPage';

export function HotLeadsPage() {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-red-50 border-2 border-danger rounded-lg flex items-center justify-between text-danger font-body">
        <span className="font-bold flex items-center gap-1.5">
          🔥 Priority Calling Queue:
        </span>
        <span className="text-xs">
          Hot leads have immediate requirement. Follow up within 24 hours to maximize store conversions.
        </span>
      </div>
      <AllLeadsPage forcedCategory="Hot" />
    </div>
  );
}

export function WarmLeadsPage() {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 border-2 border-warning rounded-lg flex items-center justify-between text-warning font-body">
        <span className="font-bold flex items-center gap-1.5">
          ⚡ Evaluation Stage:
        </span>
        <span className="text-xs">
          Warm leads are comparing models or checking budget. Share quotations on WhatsApp and schedule follow-ups.
        </span>
      </div>
      <AllLeadsPage forcedCategory="Warm" />
    </div>
  );
}

export function ColdLeadsPage() {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border-2 border-secondary-accent rounded-lg flex items-center justify-between text-secondary-accent font-body">
        <span className="font-bold flex items-center gap-1.5">
          ❄️ Long-term Pipeline:
        </span>
        <span className="text-xs">
          Cold leads with future plans or delayed budgets. Schedule callbacks for 1, 3, or 6 months.
        </span>
      </div>
      <AllLeadsPage forcedCategory="Cold" />
    </div>
  );
}
