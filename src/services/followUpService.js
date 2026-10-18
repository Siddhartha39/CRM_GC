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
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getKolkataTodayString, isOverdueDate, isTodayDate } from '../utils/dates';
import { logAudit } from './auditService';

const FOLLOW_UPS_COLLECTION = 'followUps';
const CUSTOMERS_COLLECTION = 'customers';

/**
 * Fetch Today's Follow-ups (due on today's calendar date in Asia/Kolkata)
 */
export async function getTodayFollowUps() {
  const todayStr = getKolkataTodayString();
  try {
    const q = query(
      collection(db, FOLLOW_UPS_COLLECTION),
      where('status', '==', 'Pending'),
      where('dueDate', '==', todayStr)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching today followups:', error);
    // Unindexed fallback: get pending tasks and filter
    return await getPendingFollowUpsFiltered(task => task.dueDate === todayStr);
  }
}

/**
 * Fetch Overdue Follow-ups (Pending tasks with dueDate strictly before today in Kolkata)
 */
export async function getOverdueFollowUps() {
  const todayStr = getKolkataTodayString();
  try {
    const q = query(
      collection(db, FOLLOW_UPS_COLLECTION),
      where('status', '==', 'Pending'),
      where('dueDate', '<', todayStr),
      orderBy('dueDate', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('Overdue query fallback:', error);
    return await getPendingFollowUpsFiltered(task => isOverdueDate(task.dueDate));
  }
}

/**
 * Fetch Upcoming Follow-ups (Pending tasks due after today)
 */
export async function getUpcomingFollowUps(daysAhead = 7) {
  const todayStr = getKolkataTodayString();
  try {
    // Get all pending and filter client-side for robust date range
    return await getPendingFollowUpsFiltered(task => {
      if (!task.dueDate) return false;
      return task.dueDate > todayStr;
    });
  } catch (error) {
    console.error('Error fetching upcoming followups:', error);
    return [];
  }
}

/**
 * Fetch Completed Follow-ups
 */
export async function getCompletedFollowUps(limitCount = 50) {
  try {
    const q = query(
      collection(db, FOLLOW_UPS_COLLECTION),
      where('status', '==', 'Completed'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return list.sort((a, b) => {
      const timeA = a.completedAt?.seconds || 0;
      const timeB = b.completedAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching completed followups:', error);
    return [];
  }
}

/**
 * Helper to fetch all pending follow-ups and filter in-memory if needed
 */
async function getPendingFollowUpsFiltered(filterFn) {
  try {
    const q = query(
      collection(db, FOLLOW_UPS_COLLECTION),
      where('status', '==', 'Pending')
    );
    const snap = await getDocs(q);
    const allPending = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return allPending.filter(filterFn);
  } catch (e) {
    console.error('Failed to fetch pending follow-ups:', e);
    return [];
  }
}

/**
 * Create a new standalone follow-up task
 */
export async function createFollowUp({
  customerId,
  customerCustomId,
  customerName,
  customerPhone,
  leadCategory,
  requirement,
  purpose,
  dueDate,
  assignedTo,
  user,
}) {
  const followUpRef = doc(collection(db, FOLLOW_UPS_COLLECTION));

  const followUpRecord = {
    customerId,
    customerCustomId: customerCustomId || '',
    customerNameSnapshot: customerName || 'Customer',
    customerPhoneSnapshot: customerPhone || '',
    leadCategory: leadCategory || 'Warm',
    requirement: requirement || '',
    purpose: purpose || 'General Follow-up',
    dueDate, // YYYY-MM-DD
    status: 'Pending',
    assignedTo: assignedTo || user?.email || 'Unassigned',
    relatedCallId: null,
    createdBy: user?.email || 'System',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    rescheduleHistory: [],
  };

  await setDoc(followUpRef, followUpRecord);

  // Sync customer nextFollowUpDate
  if (customerId) {
    try {
      const custRef = doc(db, CUSTOMERS_COLLECTION, customerId);
      await updateDoc(custRef, {
        nextFollowUpDate: dueDate,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Customer nextFollowUpDate sync failed:', e);
    }
  }

  await logAudit({
    action: 'CREATE_FOLLOW_UP',
    targetType: 'followUp',
    targetId: followUpRef.id,
    targetName: customerName,
    details: { dueDate, purpose },
    user,
  });

  return { id: followUpRef.id, ...followUpRecord };
}

/**
 * Reschedule an existing follow-up while strictly preserving history
 */
export async function rescheduleFollowUp(followUpId, newDueDate, reason = '', user) {
  const followUpRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
  const snap = await getDoc(followUpRef);
  if (!snap.exists()) {
    throw new Error('Follow-up task not found');
  }

  const current = snap.data();
  const oldDueDate = current.dueDate;

  const historyEntry = {
    oldDueDate,
    newDueDate,
    reason: reason?.trim() || 'Rescheduled by user',
    changedBy: user?.email || 'System',
    changedAt: new Date().toISOString(),
  };

  const updates = {
    dueDate: newDueDate,
    status: 'Pending',
    rescheduleHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp(),
    updatedBy: user?.email || 'System',
  };

  await updateDoc(followUpRef, updates);

  // Update customer's nextFollowUpDate as well
  if (current.customerId) {
    try {
      const custRef = doc(db, CUSTOMERS_COLLECTION, current.customerId);
      await updateDoc(custRef, {
        nextFollowUpDate: newDueDate,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Failed to update customer nextFollowUpDate on reschedule:', e);
    }
  }

  await logAudit({
    action: 'RESCHEDULE_FOLLOW_UP',
    targetType: 'followUp',
    targetId: followUpId,
    targetName: current.customerNameSnapshot,
    details: { oldDueDate, newDueDate, reason },
    user,
  });

  return { id: followUpId, ...current, ...updates };
}

/**
 * Mark a follow-up task as Completed
 */
export async function completeFollowUp(followUpId, notes = '', user) {
  const followUpRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
  const snap = await getDoc(followUpRef);
  if (!snap.exists()) {
    throw new Error('Follow-up task not found');
  }

  const current = snap.data();

  const updates = {
    status: 'Completed',
    completionNotes: notes?.trim() || '',
    completedAt: serverTimestamp(),
    completedBy: user?.email || 'System',
    updatedAt: serverTimestamp(),
  };

  await updateDoc(followUpRef, updates);

  await logAudit({
    action: 'COMPLETE_FOLLOW_UP',
    targetType: 'followUp',
    targetId: followUpId,
    targetName: current.customerNameSnapshot,
    details: { completedAt: new Date().toISOString() },
    user,
  });

  return { id: followUpId, ...current, ...updates };
}

/**
 * Cancel a follow-up task
 */
export async function cancelFollowUp(followUpId, reason = '', user) {
  const followUpRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
  const snap = await getDoc(followUpRef);
  if (!snap.exists()) {
    throw new Error('Follow-up task not found');
  }

  const current = snap.data();

  const updates = {
    status: 'Cancelled',
    cancellationReason: reason?.trim() || 'Cancelled',
    updatedAt: serverTimestamp(),
    updatedBy: user?.email || 'System',
  };

  await updateDoc(followUpRef, updates);

  await logAudit({
    action: 'CANCEL_FOLLOW_UP',
    targetType: 'followUp',
    targetId: followUpId,
    targetName: current.customerNameSnapshot,
    details: { reason },
    user,
  });

  return { id: followUpId, ...current, ...updates };
}

/**
 * Aggregate follow-up task counts by date for calendar month
 */
export async function getFollowUpCountsForMonth(year, month) {
  try {
    const q = query(collection(db, FOLLOW_UPS_COLLECTION));
    const snap = await getDocs(q);

    const counts = {};
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.dueDate) return;
      const [y, m] = data.dueDate.split('-').map(Number);
      if (y === year && m === month + 1) {
        if (!counts[data.dueDate]) {
          counts[data.dueDate] = { total: 0, pending: 0, completed: 0, overdue: 0 };
        }
        counts[data.dueDate].total++;
        if (data.status === 'Completed') {
          counts[data.dueDate].completed++;
        } else if (data.status === 'Pending') {
          counts[data.dueDate].pending++;
          if (isOverdueDate(data.dueDate)) {
            counts[data.dueDate].overdue++;
          }
        }
      }
    });

    return counts;
  } catch (e) {
    console.error('Error fetching calendar counts:', e);
    return {};
  }
}
