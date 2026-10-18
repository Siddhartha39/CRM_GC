import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';
import { getKolkataNow } from '../utils/dates';

const CALL_LOGS_COLLECTION = 'callLogs';
const CUSTOMERS_COLLECTION = 'customers';
const FOLLOW_UPS_COLLECTION = 'followUps';

/**
 * Records a call attempt/conversation with permanent history and synchronized customer status.
 * Uses atomic batch write to ensure consistency across callLogs, customers, and followUps.
 */
export async function logCall({
  customerId, // Document ID of customer in Firestore
  customerCustomId = '',
  customerName = '',
  customerPhone = '',
  callOutcome,
  callDuration = '',
  feedback = '',
  previousLeadCategory = 'Warm',
  newLeadCategory = 'Warm',
  nextAction = '',
  nextFollowUpDate = null,
  notes = '',
  doNotContact = false,
  user,
}) {
  if (!customerId) {
    throw new Error('Customer ID is required to log call');
  }

  const batch = writeBatch(db);

  // 1. Reference customer doc
  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  const customerSnap = await getDoc(customerRef);
  if (!customerSnap.exists()) {
    throw new Error('Customer record not found');
  }
  const custData = customerSnap.data();

  // 2. Prepare Call Log document
  const callLogRef = doc(collection(db, CALL_LOGS_COLLECTION));
  const callRecord = {
    customerId,
    customerCustomId: custData.customerId || customerCustomId,
    customerNameSnapshot: custData.fullName || customerName,
    customerPhoneSnapshot: custData.phone || customerPhone,
    callAt: serverTimestamp(),
    callOutcome,
    callDuration: callDuration ? String(callDuration).trim() : '',
    feedback: feedback?.trim() || '',
    previousLeadCategory: previousLeadCategory || custData.leadCategory || 'Cold',
    newLeadCategory: newLeadCategory || custData.leadCategory || 'Cold',
    nextAction: nextAction?.trim() || '',
    nextFollowUpDate: nextFollowUpDate || null,
    employeeId: user?.uid || 'system',
    employeeEmail: user?.email || 'system',
    employeeName: user?.displayName || user?.email?.split('@')[0] || 'Executive',
    notes: notes?.trim() || '',
    createdAt: serverTimestamp(),
  };

  batch.set(callLogRef, callRecord);

  // 3. Determine new Customer lead status
  let newStatus = custData.leadStatus || 'Contacted';
  if (doNotContact || callOutcome === 'Not Interested' && doNotContact) {
    newStatus = 'Do Not Contact';
  } else if (callOutcome === 'Converted / Sale Completed') {
    newStatus = 'Converted';
  } else if (nextFollowUpDate) {
    newStatus = 'Follow-up';
  } else if (callOutcome === 'No Requirement' || callOutcome === 'Wrong Number') {
    newStatus = 'Lost';
  } else {
    newStatus = 'Contacted';
  }

  // 4. Update customer record
  const customerUpdates = {
    lastCallAt: serverTimestamp(),
    lastCallOutcome: callOutcome,
    leadCategory: newLeadCategory,
    leadStatus: newStatus,
    latestFeedback: feedback ? feedback.trim() : (custData.latestFeedback || `Call outcome: ${callOutcome}`),
    nextFollowUpDate: newStatus === 'Do Not Contact' ? null : (nextFollowUpDate || null),
    updatedAt: serverTimestamp(),
    updatedBy: user?.email || 'System',
  };

  batch.update(customerRef, customerUpdates);

  // 5. Handle Follow-up task creation or cancellation
  if (nextFollowUpDate && newStatus !== 'Do Not Contact') {
    const followUpRef = doc(collection(db, FOLLOW_UPS_COLLECTION));
    batch.set(followUpRef, {
      customerId,
      customerCustomId: custData.customerId || customerCustomId,
      customerNameSnapshot: custData.fullName || customerName,
      customerPhoneSnapshot: custData.phone || customerPhone,
      leadCategory: newLeadCategory,
      requirement: custData.requirement || '',
      purpose: nextAction || `Follow-up: ${callOutcome}`,
      dueDate: nextFollowUpDate,
      status: 'Pending',
      assignedTo: custData.assignedTo || user?.email || 'Unassigned',
      relatedCallId: callLogRef.id,
      createdBy: user?.email || 'System',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      rescheduleHistory: [],
    });
  }

  // Commit atomic batch
  await batch.commit();

  // Audit
  await logAudit({
    action: 'LOG_CALL',
    targetType: 'callLog',
    targetId: callLogRef.id,
    targetName: custData.fullName || customerName,
    details: {
      customerId,
      callOutcome,
      previousCategory: previousLeadCategory,
      newCategory: newLeadCategory,
      scheduledDate: nextFollowUpDate,
    },
    user,
  });

  return {
    id: callLogRef.id,
    ...callRecord,
  };
}

/**
 * Fetch permanent call history timeline for a customer (newest first)
 */
export async function getCallLogsByCustomer(customerId) {
  if (!customerId) return [];
  try {
    const q = query(
      collection(db, CALL_LOGS_COLLECTION),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('Error fetching call logs with index, using unindexed fallback:', error);
    try {
      const fallbackQuery = query(
        collection(db, CALL_LOGS_COLLECTION),
        where('customerId', '==', customerId)
      );
      const snap = await getDocs(fallbackQuery);
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory by callAt or createdAt desc
      return logs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
    } catch (fbErr) {
      console.error('Call log fallback failed:', fbErr);
      return [];
    }
  }
}

/**
 * Fetch recent call logs across all customers for dashboard feed
 */
export async function getRecentCallLogs(limitCount = 10) {
  try {
    const q = query(
      collection(db, CALL_LOGS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching recent call logs:', error);
    return [];
  }
}
