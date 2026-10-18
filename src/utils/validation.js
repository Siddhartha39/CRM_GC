import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Normalizes phone numbers for duplicate checks and storage.
 * Strips spaces, hyphens, parentheses, and leading zeros/+91 country code.
 * Standardizes Indian phone numbers to 10 digits.
 */
export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  // Convert to string and strip non-digit characters
  let digits = String(rawPhone).replace(/\D/g, '');

  // If starts with 91 and has 12 digits, strip country code
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Formats normalized phone number into readable format.
 * E.g., "9839012345" -> "+91 98390 12345"
 */
export function formatPhoneNumber(phone) {
  const norm = normalizePhoneNumber(phone);
  if (norm.length === 10) {
    return `+91 ${norm.slice(0, 5)} ${norm.slice(5)}`;
  }
  return phone || '—';
}

/**
 * Safely generates sequential or collision-free customer IDs (e.g. GC-10001)
 * Uses Firestore transaction on a counter document, with safe fallback.
 */
export async function generateCustomerId() {
  const counterRef = doc(db, 'counters', 'customers');

  try {
    const newId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextNumber = 10001;

      if (counterDoc.exists()) {
        const current = counterDoc.data().currentNumber;
        if (typeof current === 'number') {
          nextNumber = current + 1;
        }
      }

      transaction.set(counterRef, { currentNumber: nextNumber, updatedAt: new Date() }, { merge: true });
      return `GC-${nextNumber}`;
    });

    return newId;
  } catch (error) {
    console.warn('Transaction failed for counter, generating timestamp-based ID:', error);
    // Safe collision-resistant fallback
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `GC-${Date.now().toString().slice(-4)}${suffix}`;
  }
}

/**
 * Validates customer form values
 */
export function validateCustomerForm(values) {
  const errors = {};

  if (!values.fullName || values.fullName.trim().length < 2) {
    errors.fullName = 'Customer name is required (min 2 characters)';
  }

  const normPhone = normalizePhoneNumber(values.phone);
  if (!normPhone) {
    errors.phone = 'Primary phone number is required';
  } else if (normPhone.length !== 10) {
    errors.phone = 'Please enter a valid 10-digit mobile number';
  }

  if (values.email && values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (values.budget && isNaN(Number(values.budget))) {
    errors.budget = 'Budget must be a numeric value';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Currency formatter for Indian Rupees
 */
export function formatINR(amount) {
  if (amount === undefined || amount === null || amount === '') return '—';
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}
