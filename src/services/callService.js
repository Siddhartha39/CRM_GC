import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';
import {
  isFirestoreDisabledError,
  isStandbyMode,
  setStandbyMode,
  getLocalCollection,
  addLocalDocument,
  updateLocalDocument,
} from './storageAdapter';

const CALL_LOGS_COLLECTION = 'callLogs';

export async function logCall({
  customerId,
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

  const callRecord = {
    customerId,
    customerCustomId,
    customerNameSnapshot: customerName,
    customerPhoneSnapshot: customerPhone,
    callAt: serverTimestamp(),
    callOutcome,
    callDuration: callDuration ? String(callDuration).trim() : '',
    feedback: feedback?.trim() || '',
    previousLeadCategory,
    newLeadCategory,
    nextAction: nextAction?.trim() || '',
    nextFollowUpDate: nextFollowUpDate || null,
    employeeId: user?.uid || 'system',
    employeeEmail: user?.email || 'system',
    employeeName: user?.displayName || user?.email?.split('@')[0] || 'Executive',
    notes: notes?.trim() || '',
    createdAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    const callLogRef = doc(collection(db, CALL_LOGS_COLLECTION));
    batch.set(callLogRef, callRecord);

    const customerRef = doc(db, 'customers', customerId);
    let newStatus = 'Contacted';
    if (doNotContact) newStatus = 'Do Not Contact';
    else if (callOutcome === 'Converted / Sale Completed') newStatus = 'Converted';
    else if (nextFollowUpDate) newStatus = 'Follow-up';

    batch.update(customerRef, {
      lastCallAt: serverTimestamp(),
      lastCallOutcome: callOutcome,
      leadCategory: newLeadCategory,
      leadStatus: newStatus,
      latestFeedback: feedback.trim() || `Call outcome: ${callOutcome}`,
      nextFollowUpDate: newStatus === 'Do Not Contact' ? null : nextFollowUpDate,
      updatedAt: serverTimestamp(),
    });

    if (nextFollowUpDate && newStatus !== 'Do Not Contact') {
      const followUpRef = doc(collection(db, 'followUps'));
      batch.set(followUpRef, {
        customerId,
        customerCustomId,
        customerNameSnapshot: customerName,
        customerPhoneSnapshot: customerPhone,
        leadCategory: newLeadCategory,
        purpose: nextAction || `Follow-up: ${callOutcome}`,
        dueDate: nextFollowUpDate,
        status: 'Pending',
        assignedTo: user?.email || 'Unassigned',
        relatedCallId: callLogRef.id,
        createdBy: user?.email || 'System',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rescheduleHistory: [],
      });
    }

    await batch.commit();
    return { id: callLogRef.id, ...callRecord };
  } catch (error) {
    if (isFirestoreDisabledError(error) || isStandbyMode()) {
      setStandbyMode(true);
      const savedCall = addLocalDocument('callLogs', callRecord);

      let newStatus = 'Contacted';
      if (doNotContact) newStatus = 'Do Not Contact';
      else if (callOutcome === 'Converted / Sale Completed') newStatus = 'Converted';
      else if (nextFollowUpDate) newStatus = 'Follow-up';

      updateLocalDocument('customers', customerId, {
        lastCallAt: { seconds: Math.floor(Date.now() / 1000) },
        lastCallOutcome: callOutcome,
        leadCategory: newLeadCategory,
        leadStatus: newStatus,
        latestFeedback: feedback.trim() || `Call outcome: ${callOutcome}`,
        nextFollowUpDate: newStatus === 'Do Not Contact' ? null : nextFollowUpDate,
      });

      if (nextFollowUpDate && newStatus !== 'Do Not Contact') {
        addLocalDocument('followUps', {
          customerId,
          customerCustomId,
          customerNameSnapshot: customerName,
          customerPhoneSnapshot: customerPhone,
          leadCategory: newLeadCategory,
          purpose: nextAction || `Follow-up: ${callOutcome}`,
          dueDate: nextFollowUpDate,
          status: 'Pending',
          assignedTo: user?.email || 'Unassigned',
          relatedCallId: savedCall.id,
          createdBy: user?.email || 'System',
          rescheduleHistory: [],
        });
      }

      return savedCall;
    }
    throw error;
  }
}

export async function getCallLogsByCustomer(customerId) {
  if (!customerId) return [];
  try {
    const snap = await getDocs(query(collection(db, CALL_LOGS_COLLECTION), limit(100)));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const filtered = all.filter(l => l.customerId === customerId);
    if (filtered.length > 0) return filtered;
  } catch (e) {
    // Fallback to local
  }
  const local = getLocalCollection('callLogs');
  return local.filter(l => l.customerId === customerId);
}

export async function getRecentCallLogs(limitCount = 10) {
  try {
    const snap = await getDocs(query(collection(db, CALL_LOGS_COLLECTION), limit(limitCount)));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (list.length > 0) return list;
  } catch (e) {
    // Fallback to local
  }
  const local = getLocalCollection('callLogs');
  return local.slice(0, limitCount);
}
