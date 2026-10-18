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
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizePhoneNumber, generateCustomerId } from '../utils/validation';
import { logAudit } from './auditService';
import { getKolkataTodayString } from '../utils/dates';
import {
  isFirestoreDisabledError,
  isStandbyMode,
  setStandbyMode,
  withTimeout,
  getLocalCollection,
  addLocalDocument,
  updateLocalDocument,
  deleteLocalDocument,
} from './storageAdapter';

const CUSTOMERS_COLLECTION = 'customers';

/**
 * Check if a phone number already exists in customers
 */
export async function checkDuplicatePhone(phone, excludeDocId = null) {
  const norm = normalizePhoneNumber(phone);
  if (!norm) return null;

  if (isStandbyMode()) {
    const local = getLocalCollection('customers');
    const match = local.find(c => c.id !== excludeDocId && c.normalizedPhone === norm);
    return match || null;
  }

  try {
    const q = query(
      collection(db, CUSTOMERS_COLLECTION),
      where('normalizedPhone', '==', norm),
      limit(2)
    );
    const snap = await withTimeout(getDocs(q), 1000);
    const duplicates = snap.docs
      .filter(doc => doc.id !== excludeDocId)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    return duplicates.length > 0 ? duplicates[0] : null;
  } catch (error) {
    const local = getLocalCollection('customers');
    const match = local.find(c => c.id !== excludeDocId && c.normalizedPhone === norm);
    return match || null;
  }
}

/**
 * Create a new customer record
 */
export async function createCustomer(data, user) {
  const normPhone = normalizePhoneNumber(data.phone);
  const normAltPhone = data.alternatePhone ? normalizePhoneNumber(data.alternatePhone) : '';
  const normWhatsApp = data.whatsAppNumber ? normalizePhoneNumber(data.whatsAppNumber) : (normPhone || '');

  // Generate unique customer ID
  let customerId = data.customerId;
  if (!customerId) {
    customerId = await generateCustomerId();
  }

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
    createdAt: { seconds: Math.floor(Date.now() / 1000) },
    updatedAt: { seconds: Math.floor(Date.now() / 1000) },
  };

  // If already in standby mode, save locally immediately (<10ms)
  if (isStandbyMode()) {
    const saved = addLocalDocument('customers', customerRecord);

    if (data.nextFollowUpDate && customerRecord.leadStatus !== 'Do Not Contact') {
      addLocalDocument('followUps', {
        customerId: saved.id,
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
        rescheduleHistory: [],
      });
    }

    return saved;
  }

  // Attempt Firestore with strict 1.5s timeout
  try {
    const customerDocRef = doc(collection(db, CUSTOMERS_COLLECTION));
    const firestoreData = {
      ...customerRecord,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await withTimeout(setDoc(customerDocRef, firestoreData), 1500);

    if (data.nextFollowUpDate && customerRecord.leadStatus !== 'Do Not Contact') {
      try {
        const followUpRef = doc(collection(db, 'followUps'));
        await withTimeout(
          setDoc(followUpRef, {
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
          }),
          1500
        );
      } catch (e) {
        console.warn('Initial follow-up doc creation skipped:', e);
      }
    }

    await logAudit({
      action: 'CREATE_CUSTOMER',
      targetType: 'customer',
      targetId: customerDocRef.id,
      targetName: customerRecord.fullName,
      details: { customerId, phone: customerRecord.phone, leadCategory: customerRecord.leadCategory },
      user,
    });

    return { id: customerDocRef.id, ...customerRecord };
  } catch (error) {
    console.warn('Firestore write failed or timed out. Falling back to local standby storage:', error);
    setStandbyMode(true);
    const saved = addLocalDocument('customers', customerRecord);

    if (data.nextFollowUpDate && customerRecord.leadStatus !== 'Do Not Contact') {
      addLocalDocument('followUps', {
        customerId: saved.id,
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
        rescheduleHistory: [],
      });
    }

    return saved;
  }
}

/**
 * Update an existing customer without overwriting call history
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
  cleanUpdates.updatedAt = { seconds: Math.floor(Date.now() / 1000) };
  cleanUpdates.updatedBy = user?.email || 'System';

  if (isStandbyMode()) {
    return updateLocalDocument('customers', docId, cleanUpdates);
  }

  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
    await withTimeout(
      updateDoc(customerRef, { ...cleanUpdates, updatedAt: serverTimestamp() }),
      1500
    );

    await logAudit({
      action: 'UPDATE_CUSTOMER',
      targetType: 'customer',
      targetId: docId,
      targetName: updates.fullName || 'Customer',
      details: { updatedFields: Object.keys(cleanUpdates) },
      user,
    });

    return { id: docId, ...cleanUpdates };
  } catch (error) {
    return updateLocalDocument('customers', docId, cleanUpdates);
  }
}

/**
 * Delete a customer record (Admin only)
 */
export async function deleteCustomer(docId, user) {
  if (isStandbyMode()) {
    return deleteLocalDocument('customers', docId);
  }

  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
    await withTimeout(deleteDoc(customerRef), 1500);

    await logAudit({
      action: 'DELETE_CUSTOMER',
      targetType: 'customer',
      targetId: docId,
      user,
    });

    return true;
  } catch (error) {
    return deleteLocalDocument('customers', docId);
  }
}

/**
 * Get single customer document by ID
 */
export async function getCustomerById(docId) {
  if (!isStandbyMode()) {
    try {
      const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
      const snap = await withTimeout(getDoc(customerRef), 1000);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (error) {
      // Fallback to local
    }
  }

  const local = getLocalCollection('customers');
  const found = local.find(c => c.id === docId);
  return found || null;
}

/**
 * Get customers with filtering, searching, and sorting
 */
export async function getCustomers({
  category = null,
  status = null,
  assignedTo = null,
  search = '',
  limitCount = 100,
} = {}) {
  let list = [];

  if (!isStandbyMode()) {
    try {
      let q = collection(db, CUSTOMERS_COLLECTION);
      const conditions = [];

      if (category && category !== 'All') {
        conditions.push(where('leadCategory', '==', category));
      }
      if (status && status !== 'All') {
        conditions.push(where('leadStatus', '==', status));
      }

      const firestoreQuery = query(q, ...conditions, limit(limitCount));
      const snap = await withTimeout(getDocs(firestoreQuery), 1500);

      list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Merge with any local documents created during standby
      const local = getLocalCollection('customers');
      const existingIds = new Set(list.map(r => r.id));
      local.forEach(l => {
        if (!existingIds.has(l.id)) {
          list.push(l);
        }
      });
    } catch (error) {
      setStandbyMode(true);
      list = getLocalCollection('customers');
    }
  } else {
    list = getLocalCollection('customers');
  }

  let filtered = filterAndSearchCustomers(list, { category, status, search });
  if (filtered.length === 0 && !search && (!category || category === 'All') && (!status || status === 'All')) {
    const seeded = await seedSampleKanpurCustomers({ email: 'admin@galaxycomputers.in', displayName: 'Vishal' });
    return seeded;
  }
  return filtered;
}

function filterAndSearchCustomers(list, { category, status, search }) {
  let results = [...list];

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

/**
 * Seed realistic sample customers for Galaxy Computers (Kanpur store)
 */
export async function seedSampleKanpurCustomers(user) {
  const today = getKolkataTodayString();
  const sampleData = [
    {
      fullName: "Amitabh Verma",
      phone: "9839012345",
      email: "amitabh.v@gmail.com",
      city: "Mall Road, Kanpur",
      source: "Walk-in Store",
      interest: "Refurbished Laptop",
      requirement: "Lenovo ThinkPad T480, i5 8th Gen, 16GB RAM for Office Work",
      budget: 24000,
      leadCategory: "Hot",
      leadStatus: "Follow-up",
      nextFollowUpDate: today,
      latestFeedback: "Wants to check battery health and physical condition in-store today afternoon.",
      internalNotes: "Referred by Naveen Market electronics association.",
    },
    {
      fullName: "Pooja Sachan",
      phone: "9415056789",
      email: "pooja.sachan@rediffmail.com",
      city: "Kakadeo, Kanpur",
      source: "Google Maps",
      interest: "Desktop Gaming PC",
      requirement: "Full custom PC build with RTX 4060, i5 13th Gen, 32GB RAM for Video Editing",
      budget: 78000,
      leadCategory: "Hot",
      leadStatus: "Follow-up",
      nextFollowUpDate: today,
      latestFeedback: "Quotations sent on WhatsApp. Comparing price with online sellers.",
      internalNotes: "Offered 2-year in-store warranty.",
    },
    {
      fullName: "Rajesh Kumar Gupta",
      phone: "9935123456",
      email: "rkgupta.kanpur@yahoo.co.in",
      city: "Govind Nagar, Kanpur",
      source: "Existing Customer",
      interest: "Laptop Repair & Upgrade",
      requirement: "HP Pavilion laptop 512GB NVMe SSD upgrade + thermal paste cleaning",
      budget: 4500,
      leadCategory: "Warm",
      leadStatus: "Contacted",
      nextFollowUpDate: "2026-10-15",
      latestFeedback: "Asked to call back when his son brings the laptop.",
      internalNotes: "Frequent buyer of cables and peripherals.",
    },
    {
      fullName: "Dr. Alok Srivastava",
      phone: "9838765432",
      email: "dralok.kanpur@gmail.com",
      city: "Swaroop Nagar, Kanpur",
      source: "Clinic Referral",
      interest: "All-in-One PC",
      requirement: "HP 24-inch AIO Desktop for clinic patient management software",
      budget: 52000,
      leadCategory: "Warm",
      leadStatus: "Follow-up",
      nextFollowUpDate: "2026-10-25",
      latestFeedback: "Interested in wireless keyboard mouse combo and anti-glare screen.",
      internalNotes: "Clinic renovation finishing by end of month.",
    },
    {
      fullName: "Manoj Awasthi",
      phone: "9450345678",
      email: "awasthi.trading@gmail.com",
      city: "Collector Ganj, Kanpur",
      source: "Wholesale Market",
      interest: "Accounting Desktop",
      requirement: "Dual Core or i3 desktop with Tally Prime and printer setup",
      budget: 28000,
      leadCategory: "Cold",
      leadStatus: "New",
      nextFollowUpDate: "2026-11-10",
      latestFeedback: "Will consider next financial quarter.",
      internalNotes: "Old client.",
    },
  ];

  const created = [];
  for (let i = 0; i < sampleData.length; i++) {
    const item = sampleData[i];
    item.customerId = `GC-${10001 + i}`;
    const cust = await createCustomer(item, user);
    created.push(cust);
  }

  return created;
}
