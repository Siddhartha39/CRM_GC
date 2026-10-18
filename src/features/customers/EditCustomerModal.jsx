import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { updateCustomer } from '../../services/customerService';
import { validateCustomerForm } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setForm({
        fullName: customer.fullName || '',
        phone: customer.phone || '',
        alternatePhone: customer.alternatePhone || '',
        whatsAppNumber: customer.whatsAppNumber || '',
        email: customer.email || '',
        city: customer.city || 'Kanpur',
        address: customer.address || '',
        source: customer.source || 'Walk-in Store',
        interest: customer.interest || 'Refurbished Laptop',
        requirement: customer.requirement || '',
        budget: customer.budget !== null && customer.budget !== undefined ? customer.budget : '',
        leadCategory: customer.leadCategory || 'Warm',
        leadStatus: customer.leadStatus || 'New',
        assignedTo: customer.assignedTo || '',
        internalNotes: customer.internalNotes || '',
      });
      setErrors({});
    }
  }, [customer, isOpen]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer?.id) return;

    const { isValid, errors: validationErrors } = validateCustomerForm(form);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const updated = await updateCustomer(customer.id, form, user);
      toast.success(`Customer ${updated.fullName} updated successfully!`);
      if (onCustomerUpdated) onCustomerUpdated(updated);
      onClose();
    } catch (err) {
      console.error('Error updating customer:', err);
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Customer — ${customer.customerId || ''}`}
      subtitle={`Updating profile for ${customer.fullName}`}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Customer Full Name"
            required
            value={form.fullName || ''}
            onChange={(e) => handleChange('fullName', e.target.value)}
            error={errors.fullName}
          />

          <Input
            label="Primary Phone"
            required
            value={form.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={errors.phone}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Alternate Phone"
            value={form.alternatePhone || ''}
            onChange={(e) => handleChange('alternatePhone', e.target.value)}
          />

          <Input
            label="WhatsApp Number"
            value={form.whatsAppNumber || ''}
            onChange={(e) => handleChange('whatsAppNumber', e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            value={form.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="City / Area"
            value={form.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
          />

          <Select
            label="Lead Category"
            value={form.leadCategory || 'Warm'}
            onChange={(e) => handleChange('leadCategory', e.target.value)}
            options={[
              { value: 'Hot', label: '🔥 Hot Lead' },
              { value: 'Warm', label: '⚡ Warm Lead' },
              { value: 'Cold', label: '❄️ Cold Lead' },
            ]}
          />

          <Select
            label="Lead Status"
            value={form.leadStatus || 'New'}
            onChange={(e) => handleChange('leadStatus', e.target.value)}
            options={['New', 'Contacted', 'Follow-up', 'Converted', 'Lost', 'Do Not Contact']}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Product Requirement"
              value={form.requirement || ''}
              onChange={(e) => handleChange('requirement', e.target.value)}
            />
          </div>

          <Input
            label="Budget (₹)"
            type="number"
            value={form.budget || ''}
            onChange={(e) => handleChange('budget', e.target.value)}
            error={errors.budget}
          />
        </div>

        <Textarea
          label="Internal Notes"
          rows={2}
          value={form.internalNotes || ''}
          onChange={(e) => handleChange('internalNotes', e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-3 border-t-2 border-dashed border-border/40">
          <Button variant="muted" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" icon={Save} disabled={loading}>
            {loading ? 'Saving Changes...' : 'Update Customer Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
