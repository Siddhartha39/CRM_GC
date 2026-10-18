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
import {
  isFirestoreDisabledError,
  isStandbyMode,
  setStandbyMode,
  getLocalCollection,
  addLocalDocument,
  updateLocalDocument,
} from './storageAdapter';

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
    const snap = await getDocs(query(collection(db, FOLLOW_UPS_COLLECTION), limit(200)));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Merge with any local ones
    const local = getLocalCollection('followUps');
    const existing = new Set(docs.map(d => d.id));
    local.forEach(l => {
      if (!existing.has(l.id)) docs.push(l);
    });

    return docs;
  } catch (error) {
    setStandbyMode(true);
    return getLocalCollection('followUps');
  }
}

export async function rescheduleFollowUp(followUpId, newDueDate, reason = '', user) {
  const historyEntry = {
    newDueDate,
    reason: reason?.trim() || 'Rescheduled',
    changedBy: user?.email || 'System',
    changedAt: new Date().toISOString(),
  };

  try {
    const followUpRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
    await updateDoc(followUpRef, {
      dueDate: newDueDate,
      status: 'Pending',
      rescheduleHistory: arrayUnion(historyEntry),
      updatedAt: serverTimestamp(),
    });
    return { id: followUpId, dueDate: newDueDate };
  } catch (error) {
    if (isFirestoreDisabledError(error) || isStandbyMode()) {
      const all = getLocalCollection('followUps');
      const task = all.find(t => t.id === followUpId);
      const hist = task?.rescheduleHistory || [];
      hist.push(historyEntry);
      return updateLocalDocument('followUps', followUpId, {
        dueDate: newDueDate,
        status: 'Pending',
        rescheduleHistory: hist,
      });
    }
    throw error;
  }
}

export async function completeFollowUp(followUpId, notes = '', user) {
  try {
    const followUpRef = doc(db, FOLLOW_UPS_COLLECTION, followUpId);
    await updateDoc(followUpRef, {
      status: 'Completed',
      completionNotes: notes,
      completedAt: serverTimestamp(),
    });
    return { id: followUpId, status: 'Completed' };
  } catch (error) {
    if (isFirestoreDisabledError(error) || isStandbyMode()) {
      return updateLocalDocument('followUps', followUpId, {
        status: 'Completed',
        completionNotes: notes,
        completedAt: { seconds: Math.floor(Date.now() / 1000) },
      });
    }
    throw error;
  }
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
