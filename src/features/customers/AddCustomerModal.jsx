import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { createCustomer, checkDuplicatePhone } from '../../services/customerService';
import { validateCustomerForm } from '../../utils/validation';
import { getQuickScheduleDate, getKolkataTodayString } from '../../utils/dates';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_INTERESTS = [
  'Refurbished Laptop',
  'Brand New Laptop',
  'Custom Gaming PC',
  'Office Desktop / AIO',
  'Laptop Repair & Upgrade',
  'CCTV & Security Systems',
  'Printers & Networking',
  'Accessories & Spares',
];

const SOURCES = [
  'Walk-in Store',
  'Google Maps',
  'Referral / Word of Mouth',
  'JustDial',
  'WhatsApp Campaign',
  'Existing Customer',
  'Social Media',
];

/**
 * Neumorphic Soft UI Add Customer Modal
 */
export function AddCustomerModal({
  isOpen,
  onClose,
  onCustomerAdded,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const initialForm = {
    fullName: '',
    phone: '',
    alternatePhone: '',
    whatsAppNumber: '',
    email: '',
    city: 'Kanpur',
    address: '',
    source: 'Walk-in Store',
    interest: 'Refurbished Laptop',
    requirement: '',
    budget: '',
    leadCategory: 'Hot',
    leadStatus: 'New',
    assignedTo: user?.email || 'admin@galaxycrm.local',
    nextFollowUpDate: getQuickScheduleDate('tomorrow'),
    internalNotes: '',
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (field === 'phone') {
      setDuplicateWarning(null);
    }
  };

  const handlePhoneBlur = async () => {
    if (form.phone && form.phone.trim().length >= 10) {
      try {
        const dup = await checkDuplicatePhone(form.phone);
        if (dup) {
          setDuplicateWarning(`Customer with this phone already exists: ${dup.fullName} (${dup.customerId})`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {
        console.error('Duplicate check error:', e);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateCustomerForm(form);
    if (!isValid) {
      setErrors(validationErrors);
      toast.error('Please resolve validation errors in the form.');
      return;
    }

    setLoading(true);
    try {
      const created = await createCustomer(form, user);
      toast.success(`Customer ${created.fullName} (${created.customerId}) added successfully!`);
      setForm(initialForm);
      if (onCustomerAdded) onCustomerAdded(created);
      onClose();
    } catch (err) {
      console.error('Error adding customer:', err);
      toast.error(`Failed to create customer: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      subtitle="Register customer into Galaxy Computers master database"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {duplicateWarning && (
          <div className="p-4 bg-background shadow-neu-pressed-sm rounded-2xl flex items-center gap-3 text-xs text-amber-600 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 stroke-[2]" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Identity & Primary Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Customer Full Name"
            placeholder="e.g. Amit Kumar"
            required
            value={form.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            error={errors.fullName}
          />

          <Input
            label="Primary Mobile Phone"
            placeholder="10-digit mobile number"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={handlePhoneBlur}
            error={errors.phone}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Alternate Phone"
            placeholder="Optional landline/mobile"
            value={form.alternatePhone}
            onChange={(e) => handleChange('alternatePhone', e.target.value)}
          />

          <Input
            label="WhatsApp Number"
            placeholder="Optional (defaults to primary)"
            value={form.whatsAppNumber}
            onChange={(e) => handleChange('whatsAppNumber', e.target.value)}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. rahul@example.com"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
          />
        </div>

        {/* Location & Source */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="City / Area"
            placeholder="e.g. Naveen Market, Kanpur"
            value={form.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />

          <Select
            label="Customer Source"
            value={form.source}
            onChange={(e) => handleChange('source', e.target.value)}
            options={SOURCES}
          />

          <Select
            label="Product Interest"
            value={form.interest}
            onChange={(e) => handleChange('interest', e.target.value)}
            options={PRODUCT_INTERESTS}
          />
        </div>

        {/* Requirements & Budget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Requirement Specification"
              placeholder="e.g. Dell Latitude 16GB RAM for Python programming"
              value={form.requirement}
              onChange={(e) => handleChange('requirement', e.target.value)}
            />
          </div>

          <Input
            label="Estimated Budget (₹ INR)"
            type="number"
            placeholder="e.g. 35000"
            value={form.budget}
            onChange={(e) => handleChange('budget', e.target.value)}
            error={errors.budget}
          />
        </div>

        {/* Lead Classification & Follow-up */}
        <div className="p-5 bg-background shadow-neu-pressed-sm rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Initial Lead Category"
            value={form.leadCategory}
            onChange={(e) => handleChange('leadCategory', e.target.value)}
            options={[
              { value: 'Hot', label: '🔥 Hot Lead (Immediate Need)' },
              { value: 'Warm', label: '⚡ Warm Lead (Needs Evaluation)' },
              { value: 'Cold', label: '❄️ Cold Lead (Future/Budget)' },
            ]}
          />

          <Select
            label="Lead Status"
            value={form.leadStatus}
            onChange={(e) => handleChange('leadStatus', e.target.value)}
            options={['New', 'Contacted', 'Follow-up', 'Converted', 'Lost', 'Do Not Contact']}
          />

          <div className="flex flex-col gap-1.5">
            <label className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80">
              Initial Follow-Up Date:
            </label>
            <input
              type="date"
              className="w-full bg-background text-foreground shadow-neu-pressed rounded-2xl px-4 py-2.5 text-sm font-body border-0 outline-none transition-all focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
              min={getKolkataTodayString()}
              value={form.nextFollowUpDate}
              onChange={(e) => handleChange('nextFollowUpDate', e.target.value)}
            />
          </div>
        </div>

        {/* Assigned Staff Executive */}
        <Input
          label="Assigned Executive Email"
          placeholder="e.g. admin@galaxycomputers.in"
          value={form.assignedTo}
          onChange={(e) => handleChange('assignedTo', e.target.value)}
        />

        <Textarea
          label="Internal Notes"
          rows={2}
          placeholder="Special preferences, references, or billing notes..."
          value={form.internalNotes}
          onChange={(e) => handleChange('internalNotes', e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-muted/20">
          <Button variant="muted" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" icon={UserPlus} disabled={loading} variant="primary">
            {loading ? 'Creating Customer...' : 'Save Customer to Database'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
