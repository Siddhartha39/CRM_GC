import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Records an audit log entry for changes across the CRM.
 */
export async function logAudit({
  action,
  targetType, // 'customer', 'callLog', 'followUp', 'auth', 'import'
  targetId,
  targetName = '',
  details = {},
  user = null,
}) {
  try {
    const auditRef = collection(db, 'auditLogs');
    await addDoc(auditRef, {
      action,
      targetType,
      targetId: String(targetId || ''),
      targetName,
      details,
      actorUid: user?.uid || 'system',
      actorEmail: user?.email || 'system@galaxycrm.local',
      actorName: user?.displayName || user?.email?.split('@')[0] || 'System',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to record audit log:', error);
  }
}

/**
 * Fetch audit history for a specific customer or record
 */
export async function getAuditHistoryByTarget(targetId, max = 25) {
  try {
    const q = query(
      collection(db, 'auditLogs'),
      where('targetId', '==', String(targetId)),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return [];
  }
}
