import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { LeadCategoryBadge } from '../../components/ui/Badge';
import { getQuickScheduleDate, getKolkataTodayString } from '../../utils/dates';
import { logCall } from '../../services/callService';
import { useAuth } from '../../context/AuthContext';
import { Phone, CheckCircle, AlertOctagon } from 'lucide-react';
import { toast } from 'sonner';

const CALL_OUTCOMES = [
  'Interested',
  'Call Back Later',
  'No Requirement',
  'No Answer',
  'Busy',
  'Not Interested',
  'Converted / Sale Completed',
  'Wrong Number',
];

/**
 * Neumorphic Soft UI Call Logging Modal
 */
export function CallModal({
  isOpen,
  onClose,
  customer,
  onCallLogged,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form State
  const [callOutcome, setCallOutcome] = useState('Interested');
  const [callDuration, setCallDuration] = useState('3 mins');
  const [feedback, setFeedback] = useState('');
  const [newCategory, setNewCategory] = useState('Warm');
  const [nextAction, setNextAction] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [doNotContact, setDoNotContact] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setNewCategory(customer.leadCategory || 'Warm');
      setDoNotContact(customer.leadStatus === 'Do Not Contact');
      setCallOutcome('Interested');
      setFeedback('');
      setNextAction('');
      setNotes('');
      setNextFollowUpDate(getQuickScheduleDate('tomorrow'));
      setErrors({});
    }
  }, [customer, isOpen]);

  const handleOutcomeChange = (outcome) => {
    setCallOutcome(outcome);
    if (outcome === 'Converted / Sale Completed') {
      setNewCategory('Hot');
      setNextFollowUpDate('');
    } else if (outcome === 'Not Interested' || outcome === 'Wrong Number') {
      setNewCategory('Cold');
    } else if (outcome === 'No Answer' || outcome === 'Busy') {
      setNextFollowUpDate(getQuickScheduleDate('tomorrow'));
    }
  };

  const handleQuickDate = (option) => {
    setNextFollowUpDate(getQuickScheduleDate(option));
  };

  const handleSubmit = async (scheduleFollowUp = false) => {
    if (!customer) return;

    const validationErrors = {};
    if (callOutcome === 'Interested' && !feedback.trim()) {
      validationErrors.feedback = 'Please record customer feedback';
    }
    if (scheduleFollowUp && !nextFollowUpDate && !doNotContact) {
      validationErrors.nextFollowUpDate = 'Please select a follow-up date';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await logCall({
        customerId: customer.id,
        customerCustomId: customer.customerId,
        customerName: customer.fullName,
        customerPhone: customer.phone,
        callOutcome,
        callDuration,
        feedback: feedback.trim() || `Call outcome recorded: ${callOutcome}`,
        previousLeadCategory: customer.leadCategory,
        newLeadCategory: newCategory,
        nextAction: nextAction.trim(),
        nextFollowUpDate: (!doNotContact && scheduleFollowUp) ? nextFollowUpDate : null,
        notes: notes.trim(),
        employeeId: user?.uid || 'user-101',
        employeeEmail: user?.email || 'admin@galaxycrm.local',
        employeeName: user?.displayName || user?.email?.split('@')[0] || 'Executive',
        markAsDoNotContact: doNotContact,
      });

      toast.success(`Call with ${customer.fullName} logged permanently.`);
      if (onCallLogged) onCallLogged();
      onClose();
    } catch (err) {
      console.error('Failed to log call:', err);
      toast.error('Failed to log call: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Customer Call"
      subtitle="Galaxy Computers — Calling Desk"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Customer Snapshot Banner */}
        <div className="p-4 sm:p-5 bg-background shadow-neu-pressed-sm rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-display font-extrabold text-lg text-foreground">
                {customer.fullName}
              </span>
              <span className="text-xs font-mono font-bold text-muted bg-background shadow-neu-pressed-sm px-2.5 py-0.5 rounded-lg">
                {customer.customerId || 'GC-CUST'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-1.5 font-bold text-accent">
                <Phone className="w-3.5 h-3.5" />
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {customer.phone}
                </a>
              </span>
              {customer.requirement && (
                <span className="text-xs truncate max-w-xs text-foreground/70">
                  • {customer.requirement}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-muted">Current Category</span>
            <LeadCategoryBadge category={customer.leadCategory} size="sm" />
          </div>
        </div>

        {/* Call Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Call Outcome"
            required
            value={callOutcome}
            onChange={(e) => handleOutcomeChange(e.target.value)}
            options={CALL_OUTCOMES}
          />

          <Input
            label="Call Duration"
            placeholder="e.g. 2 mins, 5 mins"
            value={callDuration}
            onChange={(e) => setCallDuration(e.target.value)}
          />
        </div>

        {/* Customer Feedback */}
        <Textarea
          label="Customer Feedback & Conversation Summary"
          required={callOutcome === 'Interested'}
          rows={3}
          placeholder="What did the customer say? Specify product interest, questions, or price discussions..."
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            if (errors.feedback) setErrors(prev => ({ ...prev, feedback: null }));
          }}
          error={errors.feedback}
        />

        {/* Lead Category After Call */}
        <div className="p-4 bg-background shadow-neu-pressed-sm rounded-2xl space-y-2.5">
          <label className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 block">
            Update Lead Category After Call:
          </label>
          <div className="flex flex-wrap gap-2.5">
            {['Hot', 'Warm', 'Cold'].map((cat) => (
              <label
                key={cat}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-300 ${
                  newCategory === cat
                    ? 'bg-background shadow-neu-pressed ring-2 ring-accent'
                    : 'bg-background shadow-neu-flat-sm hover:shadow-neu-flat'
                }`}
              >
                <input
                  type="radio"
                  name="leadCategory"
                  value={cat}
                  checked={newCategory === cat}
                  onChange={() => setNewCategory(cat)}
                  className="sr-only"
                />
                <LeadCategoryBadge category={cat} size="sm" />
              </label>
            ))}
          </div>
        </div>

        {/* Special Opt-out Handling for Not Interested */}
        {callOutcome === 'Not Interested' && (
          <div className="p-4 bg-background shadow-neu-pressed-sm rounded-2xl flex items-start gap-3 text-sm">
            <AlertOctagon className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <label className="cursor-pointer select-none">
              <input
                type="checkbox"
                checked={doNotContact}
                onChange={(e) => setDoNotContact(e.target.checked)}
                className="mr-2 accent-accent"
              />
              <span className="font-bold text-danger">Do Not Contact:</span> Customer declined all future marketing and routine follow-ups.
            </label>
          </div>
        )}

        {/* Next Action & Follow-up Scheduling */}
        {!doNotContact && (
          <div className="space-y-4 p-4 bg-background shadow-neu-pressed-sm rounded-2xl">
            <Input
              label="Next Action to Take"
              placeholder="e.g. Share quotation on WhatsApp, Check RAM stock, Arrange demo"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />

            <div>
              <label className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 block mb-2">
                Schedule Next Follow-Up Date:
              </label>
              {/* Quick schedule buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: 'Tomorrow', key: 'tomorrow' },
                  { label: '+3 Days', key: '3days' },
                  { label: '+7 Days', key: '7days' },
                  { label: '+15 Days', key: '15days' },
                  { label: '+30 Days', key: '30days' },
                  { label: '+3 Months', key: '3months' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleQuickDate(item.key)}
                    className="text-xs font-display font-semibold bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm px-3 py-1.5 rounded-xl text-foreground transition-all"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                className="w-full bg-background text-foreground shadow-neu-pressed rounded-2xl px-4 py-2.5 text-sm font-body border-0 outline-none transition-all focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                min={getKolkataTodayString()}
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
              />
              {errors.nextFollowUpDate && (
                <span className="text-xs text-danger font-medium mt-1.5 block">
                  ⚠ {errors.nextFollowUpDate}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Internal Notes */}
        <Input
          label="Internal Private Notes (Optional)"
          placeholder="For internal team reference..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-muted/20">
          <Button variant="muted" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            Save Call Only
          </Button>
          <Button
            variant="primary"
            icon={CheckCircle}
            onClick={() => handleSubmit(true)}
            disabled={loading}
          >
            {loading ? 'Saving to Database...' : 'Save & Schedule Follow-Up'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
