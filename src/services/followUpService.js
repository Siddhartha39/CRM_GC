import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  limit,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getKolkataTodayString, isOverdueDate } from '../utils/dates';
import { logAudit } from './auditService';

const FOLLOW_UPS_COLLECTION = 'followUps';

export async function getTodayFollowUps() {
  const todayStr = getKolkataTodayString();
  const all = await getAllFollowUps();
  return all.filter(f => f.status === 'Pending' && f.dueDate === todayStr);
}

export async function getOverdueFollowUps() {
  const todayStr = getKolkataTodayString();
  const all = await getAllFollowUps();
  return all.filter(f => f.status === 'Pending' && f.dueDate && f.dueDate < todayStr);
}

export async function getUpcomingFollowUps(daysAhead = 7) {
  const todayStr = getKolkataTodayString();
  const all = await getAllFollowUps();
  return all.filter(f => f.status === 'Pending' && f.dueDate && f.dueDate > todayStr);
}

export async function getCompletedFollowUps() {
  const all = await getAllFollowUps();
  return all.filter(f => f.status === 'Completed');
}

async function getAllFollowUps() {
  try {
    const snap = await getDocs(query(collection(db, FOLLOW_UPS_COLLECTION), limit(500)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching follow-ups from Firestore:', error);
    return [];
  }
}

export async function rescheduleFollowUp(followUpId, newDueDate, reason = '', user) {
  const historyEntry = {
    newDueDate,
    reason: reason?.trim() || 'Rescheduled',
    changedBy: user?.email || 'System',
    changedAt: new Date().toISOString(),
  };

  const followUpRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
  await updateDoc(followUpRef, {
    dueDate: newDueDate,
    status: 'Pending',
    rescheduleHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    action: 'RESCHEDULE_FOLLOW_UP',
    targetType: 'followUp',
    targetId: followUpId,
    details: { newDueDate, reason },
    user,
  });

  return { id: followUpId, dueDate: newDueDate };
}

export async function completeFollowUp(followUpId, notes = '', user) {
  const followUpRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
  await updateDoc(followUpRef, {
    status: 'Completed',
    completionNotes: notes,
    completedAt: serverTimestamp(),
  });

  await logAudit({
    action: 'COMPLETE_FOLLOW_UP',
    targetType: 'followUp',
    targetId: followUpId,
    user,
  });

  return { id: followUpId, status: 'Completed' };
}

export async function getFollowUpCountsForMonth(year, month) {
  const all = await getAllFollowUps();
  const counts = {};

  all.forEach(data => {
    if (!data.dueDate) return;
    const [y, m] = data.dueDate.split('-').map(Number);
    if (y === year && m === month + 1) {
      if (!counts[data.dueDate]) {
        counts[data.dueDate] = { total: 0, pending: 0, completed: 0, overdue: 0 };
      }
      counts[data.dueDate].total++;
      if (data.status === 'Completed') counts[data.dueDate].completed++;
      else if (data.status === 'Pending') {
        counts[data.dueDate].pending++;
        if (isOverdueDate(data.dueDate)) counts[data.dueDate].overdue++;
      }
    }
  });

  return counts;
}
