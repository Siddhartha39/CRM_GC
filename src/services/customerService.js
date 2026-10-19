import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizePhoneNumber } from '../utils/validation';
import { logAudit } from './auditService';

const CUSTOMERS_COLLECTION = 'customers';

// Clean out any legacy demo cache from browser storage
if (typeof window !== 'undefined') {
  localStorage.removeItem('galaxy_crm_customers');
  localStorage.removeItem('galaxy_crm_call_logs');
  localStorage.removeItem('galaxy_crm_follow_ups');
  localStorage.removeItem('galaxy_crm_audit_logs');
  localStorage.removeItem('galaxy_crm_is_standby');
}

/**
 * Generate clean unique customer ID (e.g. GC-10001)
 */
async function getNextCustomerId() {
  try {
    const snap = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const nextNum = 10001 + snap.size;
    return `GC-${nextNum}`;
  } catch (e) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `GC-${Date.now().toString().slice(-4)}${randomSuffix}`;
  }
}

/**
 * Check if a phone number already exists in customers
 */
export async function checkDuplicatePhone(phone, excludeDocId = null) {
  const norm = normalizePhoneNumber(phone);
  if (!norm) return null;

  try {
    const q = query(
      collection(db, CUSTOMERS_COLLECTION),
      where('normalizedPhone', '==', norm),
      limit(2)
    );
    const snap = await getDocs(q);
    const duplicates = snap.docs
      .filter(doc => doc.id !== excludeDocId)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    return duplicates.length > 0 ? duplicates[0] : null;
  } catch (error) {
    console.warn('Duplicate check skipped:', error);
    return null;
  }
}

/**
 * Create a new customer record directly in Cloud Firestore
 */
export async function createCustomer(data, user) {
  const normPhone = normalizePhoneNumber(data.phone);
  const normAltPhone = data.alternatePhone ? normalizePhoneNumber(data.alternatePhone) : '';
  const normWhatsApp = data.whatsAppNumber ? normalizePhoneNumber(data.whatsAppNumber) : (normPhone || '');

  // Generate unique customer ID
  let customerId = data.customerId;
  if (!customerId) {
    customerId = await getNextCustomerId();
  }

  const customerDocRef = doc(collection(db, CUSTOMERS_COLLECTION));

  const customerRecord = {
    customerId,
    fullName: data.fullName?.trim() || 'Unknown',
    phone: data.phone?.trim() || '',
    normalizedPhone: normPhone,
    alternatePhone: data.alternatePhone?.trim() || '',
    normalizedAltPhone: normAltPhone,
    whatsAppNumber: data.whatsAppNumber?.trim() || normWhatsApp,
    email: data.email?.trim() || '',
    city: data.city?.trim() || 'Kanpur',
    address: data.address?.trim() || '',
    source: data.source || 'Walk-in Store',
    interest: data.interest || 'Laptops',
    requirement: data.requirement?.trim() || '',
    budget: data.budget ? Number(data.budget) : null,
    leadCategory: data.leadCategory || 'Cold',
    leadStatus: data.leadStatus || 'New',
    assignedTo: data.assignedTo || user?.email || 'Unassigned',
    assignedToName: data.assignedToName || user?.displayName || 'Unassigned',
    lastCallAt: null,
    lastCallOutcome: null,
    nextFollowUpDate: data.nextFollowUpDate || null,
    latestFeedback: data.latestFeedback || '',
    internalNotes: data.internalNotes?.trim() || '',
    createdBy: user?.email || 'System',
    updatedBy: user?.email || 'System',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Direct Firestore Write
  await setDoc(customerDocRef, customerRecord);

  // If initial follow-up date was scheduled, create follow-up task document in Firestore
  if (data.nextFollowUpDate && customerRecord.leadStatus !== 'Do Not Contact') {
    try {
      const followUpRef = doc(collection(db, 'followUps'));
      await setDoc(followUpRef, {
        customerId: customerDocRef.id,
        customerCustomId: customerId,
        customerNameSnapshot: customerRecord.fullName,
        customerPhoneSnapshot: customerRecord.phone,
        leadCategory: customerRecord.leadCategory,
        requirement: customerRecord.requirement,
        purpose: 'Initial Follow-up after registration',
        dueDate: data.nextFollowUpDate,
        status: 'Pending',
        assignedTo: customerRecord.assignedTo,
        createdBy: user?.email || 'System',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rescheduleHistory: [],
      });
    } catch (e) {
      console.warn('Initial follow-up doc creation error:', e);
    }
  }

  // Audit
  await logAudit({
    action: 'CREATE_CUSTOMER',
    targetType: 'customer',
    targetId: customerDocRef.id,
    targetName: customerRecord.fullName,
    details: { customerId, phone: customerRecord.phone, leadCategory: customerRecord.leadCategory },
    user,
  });

  return { id: customerDocRef.id, ...customerRecord };
}

/**
 * Update an existing customer record
 */
export async function updateCustomer(docId, updates, user) {
  const cleanUpdates = { ...updates };
  if (cleanUpdates.phone) {
    cleanUpdates.normalizedPhone = normalizePhoneNumber(cleanUpdates.phone);
  }
  if (cleanUpdates.alternatePhone) {
    cleanUpdates.normalizedAltPhone = normalizePhoneNumber(cleanUpdates.alternatePhone);
  }
  if (cleanUpdates.budget !== undefined && cleanUpdates.budget !== '') {
    cleanUpdates.budget = Number(cleanUpdates.budget);
  }

  delete cleanUpdates.id;
  delete cleanUpdates.createdAt;
  delete cleanUpdates.createdBy;
  cleanUpdates.updatedAt = serverTimestamp();
  cleanUpdates.updatedBy = user?.email || 'System';

  const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
  await updateDoc(customerRef, cleanUpdates);

  await logAudit({
    action: 'UPDATE_CUSTOMER',
    targetType: 'customer',
    targetId: docId,
    targetName: updates.fullName || 'Customer',
    details: { updatedFields: Object.keys(cleanUpdates) },
    user,
  });

  return { id: docId, ...cleanUpdates };
}

/**
 * Delete a customer record (Admin only)
 */
export async function deleteCustomer(docId, user) {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
  await deleteDoc(customerRef);

  await logAudit({
    action: 'DELETE_CUSTOMER',
    targetType: 'customer',
    targetId: docId,
    user,
  });

  return true;
}

/**
 * Get single customer document by ID
 */
export async function getCustomerById(docId) {
  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
    const snap = await getDoc(customerRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (error) {
    console.error('Error getting customer:', error);
  }
  return null;
}

/**
 * Get customers from Firestore with filtering, searching, and sorting
 */
export async function getCustomers({
  category = null,
  status = null,
  assignedTo = null,
  search = '',
  limitCount = 100,
} = {}) {
  try {
    const q = collection(db, CUSTOMERS_COLLECTION);
    const snap = await getDocs(query(q, limit(limitCount)));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return filterAndSearchCustomers(list, { category, status, search });
  } catch (error) {
    console.error('Error fetching customers from Firestore:', error);
    return [];
  }
}

function filterAndSearchCustomers(list, { category, status, assignedTo, search }) {
  let results = [...list];

  if (assignedTo && assignedTo !== 'All') {
    results = results.filter(c => c.assignedTo === assignedTo || c.assignedToEmail === assignedTo);
  }

  if (category && category !== 'All') {
    results = results.filter(c => c.leadCategory === category);
  }
  if (status && status !== 'All') {
    results = results.filter(c => c.leadStatus === status);
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    const normTerm = normalizePhoneNumber(term);

    results = results.filter(cust => {
      const nameMatch = cust.fullName?.toLowerCase().includes(term);
      const idMatch = cust.customerId?.toLowerCase().includes(term);
      const reqMatch = cust.requirement?.toLowerCase().includes(term);
      const phoneMatch = cust.phone?.includes(term) || (normTerm && cust.normalizedPhone?.includes(normTerm));
      const emailMatch = cust.email?.toLowerCase().includes(term);
      return nameMatch || idMatch || reqMatch || phoneMatch || emailMatch;
    });
  }

  return results;
}

/**
 * Bulk import customer rows from parsed CSV
 */
export async function bulkImportCustomers(rows, user) {
  const results = {
    total: rows.length,
    success: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await createCustomer(row, user);
      results.success++;
    } catch (e) {
      results.errors.push({ row: i + 1, error: e.message });
      results.skipped++;
    }
  }

  return results;
}
