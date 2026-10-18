import {
  collection,
  doc,
  getDocs,
  query,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';

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

  const batch = writeBatch(db);
  const callLogRef = doc(collection(db, CALL_LOGS_COLLECTION));

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

  await logAudit({
    action: 'LOG_CALL',
    targetType: 'callLog',
    targetId: callLogRef.id,
    targetName: customerName,
    details: { callOutcome, newCategory: newLeadCategory },
    user,
  });

  return { id: callLogRef.id, ...callRecord };
}

export async function getCallLogsByCustomer(customerId) {
  if (!customerId) return [];
  try {
    const snap = await getDocs(query(collection(db, CALL_LOGS_COLLECTION), limit(200)));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const filtered = all.filter(l => l.customerId === customerId);
    return filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (e) {
    console.error('Error fetching call logs:', e);
    return [];
  }
}

export async function getRecentCallLogs(limitCount = 10) {
  try {
    const snap = await getDocs(query(collection(db, CALL_LOGS_COLLECTION), limit(limitCount)));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (e) {
    console.error('Error fetching recent call logs:', e);
    return [];
  }
}
