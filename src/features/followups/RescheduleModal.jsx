import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getQuickScheduleDate, getKolkataTodayString, formatKolkataDate } from '../../utils/dates';
import { rescheduleFollowUp } from '../../services/followUpService';
import { useAuth } from '../../context/AuthContext';
import { Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
      <div className="space-y-4">
        <div className="p-3 bg-amber-50 border-2 border-amber-600 rounded-lg text-sm text-amber-900">
          <div className="font-bold">Current Scheduled Date:</div>
          <div className="text-base font-heading">
            {formatKolkataDate(followUp.dueDate)}
          </div>
          {followUp.purpose && (
            <div className="text-xs text-amber-800 mt-1 italic">
              Purpose: {followUp.purpose}
            </div>
          )}
        </div>

        <div>
          <label className="font-heading font-bold text-sm text-foreground block mb-1.5">
            Quick Date Presets:
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { label: 'Tomorrow', key: 'tomorrow' },
              { label: '+3 Days', key: '3days' },
              { label: '+7 Days', key: '7days' },
              { label: '+15 Days', key: '15days' },
              { label: '+30 Days', key: '30days' },
              { label: '+3 Months', key: '3months' },
              { label: '+6 Months', key: '6months' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleQuickOption(opt.key)}
                className="text-xs bg-white border border-border px-2 py-1 rounded shadow-hand-sm hover:bg-accent hover:text-white transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="font-heading font-bold text-sm text-foreground block mb-1">
            New Due Date:
          </label>
          <input
            type="date"
            className="input-hand w-full text-base bg-white"
            min={getKolkataTodayString()}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>

        <Input
          label="Reason for Rescheduling"
          placeholder="e.g. Customer out of Kanpur, Salary on 1st, Waiting for festival discount"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-3 border-t-2 border-dashed border-border/40">
          <Button variant="muted" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Rescheduling...' : 'Confirm New Date'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
