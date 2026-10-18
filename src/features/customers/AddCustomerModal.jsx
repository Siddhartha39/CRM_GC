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
      return;
    }

    setLoading(true);
    try {
      const newCust = await createCustomer(form, user);
      toast.success(`Customer ${newCust.fullName} created with ID ${newCust.customerId}!`);
      setForm(initialForm);
      setDuplicateWarning(null);
      if (onCustomerAdded) onCustomerAdded(newCust);
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
      subtitle="Register customer in Galaxy Computers master database"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {duplicateWarning && (
          <div className="p-3 bg-amber-50 border-2 border-amber-600 rounded-lg flex items-center gap-2 text-sm text-amber-900 font-bold">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Customer Full Name"
            required
            placeholder="e.g. Rahul Sharma"
            value={form.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            error={errors.fullName}
          />

          <Input
            label="Primary Mobile Phone"
            required
            placeholder="10-digit mobile, e.g. 9839012345"
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
        <div className="p-4 bg-paper-dots border-2 border-border card-hand grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="font-heading font-bold text-sm text-foreground block mb-1">
              Initial Follow-Up Date:
            </label>
            <input
              type="date"
              className="input-hand w-full text-base bg-white"
              min={getKolkataTodayString()}
              value={form.nextFollowUpDate}
              onChange={(e) => handleChange('nextFollowUpDate', e.target.value)}
            />
          </div>
        </div>

        <Textarea
          label="Internal Notes"
          rows={2}
          placeholder="Special preferences, references, or billing notes..."
          value={form.internalNotes}
          onChange={(e) => handleChange('internalNotes', e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-3 border-t-2 border-dashed border-border/40">
          <Button variant="muted" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" icon={UserPlus} disabled={loading}>
            {loading ? 'Creating Customer...' : 'Save Customer to Database'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
