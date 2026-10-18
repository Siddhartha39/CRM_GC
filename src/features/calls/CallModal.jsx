import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { LeadCategoryBadge } from '../../components/ui/Badge';
import { formatKolkataDate, getQuickScheduleDate, getKolkataTodayString } from '../../utils/dates';
import { logCall } from '../../services/callService';
import { useAuth } from '../../context/AuthContext';
import { Phone, Clock, Calendar, CheckCircle, AlertOctagon } from 'lucide-react';
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
      // Default follow up suggestion: tomorrow
      setNextFollowUpDate(getQuickScheduleDate('tomorrow'));
      setErrors({});
    }
  }, [customer, isOpen]);

  // Adjust defaults when call outcome changes
  const handleOutcomeChange = (outcome) => {
    setCallOutcome(outcome);
    if (outcome === 'Converted / Sale Completed') {
      setNewCategory('Hot');
      setNextFollowUpDate('');
    } else if (outcome === 'Not Interested' || outcome === 'Wrong Number') {
      setNewCategory('Cold');
    } else if (outcome === 'No Answer' || outcome === 'Busy') {
      // Suggest tomorrow for callback
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
        previousLeadCategory: customer.leadCategory || 'Cold',
        newLeadCategory: newCategory,
        nextAction,
        nextFollowUpDate: doNotContact ? null : (scheduleFollowUp ? nextFollowUpDate : (nextFollowUpDate || null)),
        notes,
        doNotContact,
        user,
      });

      toast.success(`Call logged successfully for ${customer.fullName}`);
      if (onCallLogged) onCallLogged();
      onClose();
    } catch (err) {
      console.error('Failed to log call:', err);
      toast.error(`Error saving call: ${err.message}`);
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
      subtitle={`Galaxy Computers — Calling Desk`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Customer Snapshot Banner */}
        <div className="p-3.5 bg-paper-white card-hand border-2 border-border flex flex-wrap items-center justify-between gap-3 bg-paper-dots">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-lg text-foreground">
                {customer.fullName}
              </span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono font-bold border border-border/50">
                {customer.customerId || 'GC-CUST'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80 mt-1">
              <Phone className="w-3.5 h-3.5 text-secondary-accent" />
              <a href={`tel:${customer.phone}`} className="hover:underline font-bold text-secondary-accent">
                {customer.phone}
              </a>
              {customer.requirement && (
                <span className="text-xs text-foreground/60 italic truncate max-w-xs">
                  • {customer.requirement}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-foreground/60">Current Category:</div>
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
        <div className="p-3 bg-sticky-yellow border-2 border-border border-wobbly-md space-y-2">
          <label className="font-heading font-bold text-sm text-foreground block">
            Update Lead Category After Call:
          </label>
          <div className="flex flex-wrap gap-3">
            {['Hot', 'Warm', 'Cold'].map((cat) => (
              <label
                key={cat}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-all ${
                  newCategory === cat
                    ? 'border-border bg-white shadow-hand-sm font-bold'
                    : 'border-transparent hover:bg-white/50'
                }`}
              >
                <input
                  type="radio"
                  name="leadCategory"
                  value={cat}
                  checked={newCategory === cat}
                  onChange={() => setNewCategory(cat)}
                  className="accent-accent"
                />
                <LeadCategoryBadge category={cat} size="sm" />
              </label>
            ))}
          </div>
        </div>

        {/* Special Opt-out Handling for Not Interested */}
        {callOutcome === 'Not Interested' && (
          <div className="p-3 bg-red-50 border-2 border-danger rounded-lg flex items-start gap-2.5">
            <AlertOctagon className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <label className="text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={doNotContact}
                onChange={(e) => setDoNotContact(e.target.checked)}
                className="mr-2 accent-danger"
              />
              <span className="font-bold text-danger">Do Not Contact:</span> Customer declined all future marketing and routine follow-ups.
            </label>
          </div>
        )}

        {/* Next Action & Follow-up Scheduling */}
        {!doNotContact && (
          <div className="space-y-3 p-3 bg-stone-50 border-2 border-border rounded-lg">
            <Input
              label="Next Action to Take"
              placeholder="e.g. Share quotation on WhatsApp, Check RAM stock, Arrange demo"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />

            <div>
              <label className="font-heading font-bold text-sm text-foreground block mb-1">
                Schedule Next Follow-Up Date:
              </label>
              {/* Quick schedule buttons */}
              <div className="flex flex-wrap gap-1.5 mb-2">
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
                    className="text-xs bg-white border border-border px-2 py-1 rounded shadow-hand-sm hover:bg-accent hover:text-white transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                className="input-hand w-full text-base bg-white"
                min={getKolkataTodayString()}
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
              />
              {errors.nextFollowUpDate && (
                <span className="text-xs text-danger font-medium mt-1 block">
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
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t-2 border-dashed border-border/40">
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
