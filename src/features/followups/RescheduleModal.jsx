import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { getQuickScheduleDate, getKolkataTodayString, formatKolkataDate } from '../../utils/dates';
import { rescheduleFollowUp } from '../../services/followUpService';
import { useAuth } from '../../context/AuthContext';
import { Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Neumorphic Soft UI Reschedule Modal
 */
export function RescheduleModal({
  isOpen,
  onClose,
  followUp,
  onRescheduled,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState(getQuickScheduleDate('tomorrow'));
  const [reason, setReason] = useState('Customer requested callback at a later date');

  const handleQuickOption = (option) => {
    setNewDate(getQuickScheduleDate(option));
  };

  const handleSave = async () => {
    if (!followUp?.id) return;
    if (!newDate) {
      toast.error('Please pick a new follow-up date');
      return;
    }

    setLoading(true);
    try {
      await rescheduleFollowUp(followUp.id, newDate, reason, user);
      toast.success(`Follow-up rescheduled to ${formatKolkataDate(newDate)}!`);
      if (onRescheduled) onRescheduled();
      onClose();
    } catch (err) {
      console.error('Failed to reschedule:', err);
      toast.error(`Reschedule failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!followUp) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Follow-Up Task"
      subtitle={`Customer: ${followUp.customerNameSnapshot || 'Customer'}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <div className="p-4 bg-background shadow-neu-pressed-sm rounded-2xl text-sm">
          <div className="font-display font-bold text-xs uppercase tracking-wider text-muted">Current Scheduled Date:</div>
          <div className="text-lg font-display font-bold text-foreground mt-0.5">
            {formatKolkataDate(followUp.dueDate)}
          </div>
          {followUp.purpose && (
            <div className="text-xs text-muted mt-1 italic">
              Purpose: {followUp.purpose}
            </div>
          )}
        </div>

        <div>
          <label className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 block mb-2">
            Quick Date Presets:
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: 'Tomorrow', key: 'tomorrow' },
              { label: '+3 Days', key: '3days' },
              { label: '+7 Days', key: '7days' },
              { label: '+15 Days', key: '15days' },
              { label: '+30 Days', key: '30days' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleQuickOption(opt.key)}
                className="px-3 py-1.5 text-xs font-display font-semibold rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm text-foreground transition-all"
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 block mb-1.5">
            Or Pick Exact Callback Date:
          </label>
          <input
            type="date"
            className="w-full bg-background text-foreground shadow-neu-pressed rounded-2xl px-4 py-2.5 text-sm font-body border-0 outline-none transition-all focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            min={getKolkataTodayString()}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>

        <div>
          <label className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 block mb-1.5">
            Reschedule Reason:
          </label>
          <input
            type="text"
            className="w-full bg-background text-foreground shadow-neu-pressed rounded-2xl px-4 py-2.5 text-sm font-body border-0 outline-none transition-all focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer in meeting, asked to call back Saturday..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-muted/20">
          <Button variant="muted" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
