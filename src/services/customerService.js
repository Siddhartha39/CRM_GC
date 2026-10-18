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
  startAfter,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizePhoneNumber, generateCustomerId } from '../utils/validation';
import { logAudit } from './auditService';
import { getKolkataTodayString } from '../utils/dates';

const CUSTOMERS_COLLECTION = 'customers';

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
    console.error('Error checking duplicate phone:', error);
    return null;
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
  const customerId = data.customerId || await generateCustomerId();

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
    leadCategory: data.leadCategory || 'Cold', // Hot, Warm, Cold
    leadStatus: data.leadStatus || 'New',     // New, Contacted, Follow-up, Converted, Lost, Do Not Contact
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

  await setDoc(customerDocRef, customerRecord);

  // If initial nextFollowUpDate was scheduled, create follow-up document
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
      console.warn('Could not create initial followUp doc:', e);
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
 * Update an existing customer without overwriting call history
 */
export async function updateCustomer(docId, updates, user) {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
  const currentSnap = await getDoc(customerRef);
  if (!currentSnap.exists()) {
    throw new Error('Customer not found');
  }

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

  // Protect system fields from being overwritten
  delete cleanUpdates.id;
  delete cleanUpdates.createdAt;
  delete cleanUpdates.createdBy;
  cleanUpdates.updatedAt = serverTimestamp();
  cleanUpdates.updatedBy = user?.email || 'System';

  await updateDoc(customerRef, cleanUpdates);

  await logAudit({
    action: 'UPDATE_CUSTOMER',
    targetType: 'customer',
    targetId: docId,
    targetName: updates.fullName || currentSnap.data().fullName,
    details: { updatedFields: Object.keys(cleanUpdates) },
    user,
  });

  return { id: docId, ...currentSnap.data(), ...cleanUpdates };
}

/**
 * Delete a customer record (Admin only)
 */
export async function deleteCustomer(docId, user) {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
  const currentSnap = await getDoc(customerRef);
  const name = currentSnap.exists() ? currentSnap.data().fullName : docId;

  await deleteDoc(customerRef);

  await logAudit({
    action: 'DELETE_CUSTOMER',
    targetType: 'customer',
    targetId: docId,
    targetName: name,
    details: { deletedAt: new Date().toISOString() },
    user,
  });

  return true;
}

/**
 * Get single customer document by ID
 */
export async function getCustomerById(docId) {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, docId);
  const snap = await getDoc(customerRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Get customers with filtering, searching, and sorting
 */
export async function getCustomers({
  category = null,
  status = null,
  assignedTo = null,
  search = '',
  limitCount = 50,
} = {}) {
  try {
    let q = collection(db, CUSTOMERS_COLLECTION);
    const conditions = [];

    if (category && category !== 'All') {
      conditions.push(where('leadCategory', '==', category));
    }
    if (status && status !== 'All') {
      conditions.push(where('leadStatus', '==', status));
    }
    if (assignedTo && assignedTo !== 'All') {
      conditions.push(where('assignedTo', '==', assignedTo));
    }

    // Apply conditions
    const firestoreQuery = query(q, ...conditions, orderBy('createdAt', 'desc'), limit(limitCount));
    const snap = await getDocs(firestoreQuery);

    let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side search for flexible matching (name, phone, customerId, requirement)
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
  } catch (error) {
    console.error('Error fetching customers:', error);
    // If composite index is missing or building, fallback to basic query without order
    try {
      const fallbackSnap = await getDocs(query(collection(db, CUSTOMERS_COLLECTION), limit(limitCount)));
      let results = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (category && category !== 'All') {
        results = results.filter(c => c.leadCategory === category);
      }
      if (status && status !== 'All') {
        results = results.filter(c => c.leadStatus === status);
      }
      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        results = results.filter(cust =>
          cust.fullName?.toLowerCase().includes(term) ||
          cust.customerId?.toLowerCase().includes(term) ||
          cust.requirement?.toLowerCase().includes(term) ||
          cust.phone?.includes(term)
        );
      }
      return results;
    } catch (fbErr) {
      console.error('Fallback query error:', fbErr);
      return [];
    }
  }
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

  const batch = writeBatch(db);
  let batchCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.fullName || !row.phone) {
      results.errors.push({ row: rowNum, error: 'Missing Customer Name or Phone Number' });
      results.skipped++;
      continue;
    }

    const normPhone = normalizePhoneNumber(row.phone);
    if (!normPhone || normPhone.length !== 10) {
      results.errors.push({ row: rowNum, error: `Invalid phone format: ${row.phone}` });
      results.skipped++;
      continue;
    }

    const newDocRef = doc(collection(db, CUSTOMERS_COLLECTION));
    const customerId = row.customerId || `GC-${10000 + i + Math.floor(Math.random() * 900)}`;

    const newCustomer = {
      customerId,
      fullName: row.fullName.trim(),
      phone: row.phone.trim(),
      normalizedPhone: normPhone,
      alternatePhone: row.alternatePhone ? row.alternatePhone.trim() : '',
      normalizedAltPhone: row.alternatePhone ? normalizePhoneNumber(row.alternatePhone) : '',
      whatsAppNumber: row.whatsAppNumber ? row.whatsAppNumber.trim() : normPhone,
      email: row.email ? row.email.trim() : '',
      city: row.city ? row.city.trim() : 'Kanpur',
      address: row.address ? row.address.trim() : '',
      source: row.source || 'CSV Import',
      interest: row.interest || 'Computer & Laptops',
      requirement: row.requirement ? row.requirement.trim() : '',
      budget: row.budget ? Number(row.budget) : null,
      leadCategory: ['Hot', 'Warm', 'Cold'].includes(row.leadCategory) ? row.leadCategory : 'Cold',
      leadStatus: ['New', 'Contacted', 'Follow-up', 'Converted', 'Lost', 'Do Not Contact'].includes(row.leadStatus) ? row.leadStatus : 'New',
      assignedTo: row.assignedTo || user?.email || 'Unassigned',
      assignedToName: row.assignedToName || user?.displayName || 'Unassigned',
      lastCallAt: null,
      lastCallOutcome: null,
      nextFollowUpDate: row.nextFollowUpDate || null,
      latestFeedback: row.latestFeedback || '',
      internalNotes: row.internalNotes || 'Imported via CSV',
      createdBy: user?.email || 'CSV Import',
      updatedBy: user?.email || 'CSV Import',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(newDocRef, newCustomer);
    batchCount++;
    results.success++;

    // Commit batches every 400 documents to respect Firestore limits
    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  await logAudit({
    action: 'CSV_IMPORT',
    targetType: 'import',
    targetId: 'bulk',
    targetName: 'Customer CSV Import',
    details: results,
    user,
  });

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
      nextFollowUpDate: today, // Due today!
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
      nextFollowUpDate: today, // Due today!
      latestFeedback: "Quotations sent on WhatsApp. Comparing price with Nehru Place online sellers.",
      internalNotes: "Offered 2-year in-store hardware warranty to win deal.",
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
      nextFollowUpDate: "2026-10-15", // Past due -> Overdue!
      latestFeedback: "Asked to call back on Saturday when his son is home with the laptop.",
      internalNotes: "Frequent buyer of cables and peripherals.",
    },
    {
      fullName: "Dr. Alok Srivastava",
      phone: "9838765432",
      email: "dralok.kanpur@gmail.com",
      city: "Swaroop Nagar, Kanpur",
      source: "Doctor Clinic Referral",
      interest: "All-in-One PC",
      requirement: "HP 24-inch AIO Desktop for clinic patient management software",
      budget: 52000,
      leadCategory: "Warm",
      leadStatus: "Follow-up",
      nextFollowUpDate: "2026-10-25", // Upcoming!
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
      requirement: "Dual Core or i3 desktop with Tally Prime 4.0 and dot matrix printer setup",
      budget: 28000,
      leadCategory: "Cold",
      leadStatus: "New",
      nextFollowUpDate: "2026-11-10",
      latestFeedback: "Will consider next financial quarter when new warehouse opens.",
      internalNotes: "Old client from 2021.",
    },
    {
      fullName: "Vikas Sharma (Coaching Institute)",
      phone: "9125678901",
      email: "vikas.targetacademy@gmail.com",
      city: "Kakadeo Coaching Hub, Kanpur",
      source: "WhatsApp Campaign",
      interest: "Bulk Refurbished Desktops",
      requirement: "12 Core i5 PCs for student online test lab setup",
      budget: 180000,
      leadCategory: "Hot",
      leadStatus: "Converted",
      nextFollowUpDate: null,
      latestFeedback: "Deal finalized! 12 Dell OptiPlex systems delivered and installed with networking switch.",
      internalNotes: "Advance payment received in full via UPI.",
    },
    {
      fullName: "Sunita Tiwari",
      phone: "9792456781",
      email: "sunita.t@outlook.com",
      city: "Kalyanpur, Kanpur",
      source: "JustDial",
      interest: "Student Laptop",
      requirement: "Lightweight 14-inch laptop for B.Tech CS student (Python & Web Dev)",
      budget: 42000,
      leadCategory: "Warm",
      leadStatus: "Follow-up",
      nextFollowUpDate: today, // Due today!
      latestFeedback: "Shortlisted ASUS Vivobook 15 and Lenovo IdeaPad. Calling today to confirm stock.",
      internalNotes: "Requested free laptop bag and mouse.",
    },
    {
      fullName: "Rameshwar Dayal",
      phone: "9336112233",
      email: "",
      city: "Chakeri, Kanpur",
      source: "Banner Ad",
      interest: "CCTV & Security",
      requirement: "8 Channel Hikvision IP Camera setup with 2TB surveillance hard drive",
      budget: 35000,
      leadCategory: "Cold",
      leadStatus: "Do Not Contact",
      nextFollowUpDate: null,
      latestFeedback: "Customer opted out - already installed cameras from another local vendor.",
      internalNotes: "Marked Do Not Contact as requested.",
    }
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
