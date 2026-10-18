/**
 * Standby Storage Adapter
 * Provides high-availability local storage fallback when Cloud Firestore API is not yet initialized in the Firebase project.
 * Automatically synchronizes with localStorage so the user can test all CRM features immediately.
 */

const STORAGE_KEYS = {
  CUSTOMERS: 'galaxy_crm_customers',
  CALL_LOGS: 'galaxy_crm_call_logs',
  FOLLOW_UPS: 'galaxy_crm_follow_ups',
  AUDIT_LOGS: 'galaxy_crm_audit_logs',
  IS_STANDBY: 'galaxy_crm_is_standby',
};

// Check if error is related to uninitialized Firestore in Google Cloud
export function isFirestoreDisabledError(error) {
  if (!error) return false;
  const msg = error.message || String(error);
  const code = error.code || '';
  return (
    code === 'permission-denied' ||
    msg.includes('Cloud Firestore API has not been used') ||
    msg.includes('is disabled') ||
    msg.includes('permission-denied') ||
    msg.includes('timeout') ||
    msg.includes('Failed to get document because the client is offline')
  );
}

export function setStandbyMode(active = true) {
  localStorage.setItem(STORAGE_KEYS.IS_STANDBY, active ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('galaxy-standby-mode-changed', { detail: { active } }));
}

export function isStandbyMode() {
  const val = localStorage.getItem(STORAGE_KEYS.IS_STANDBY);
  // Default to true if demo auth is active or if standby was explicitly set
  if (val === 'false') return false;
  if (val === 'true') return true;
  if (localStorage.getItem('galaxy_demo_auth')) return true;
  return false;
}

// Timeout helper to avoid waiting on hanging Firestore network requests
export function withTimeout(promise, ms = 1500) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Firestore network timeout (${ms}ms)`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Local collection operations
export function getLocalCollection(collectionName) {
  try {
    const raw = localStorage.getItem(`galaxy_crm_${collectionName}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCollection(collectionName, items) {
  try {
    localStorage.setItem(`galaxy_crm_${collectionName}`, JSON.stringify(items));
  } catch (e) {
    console.warn('localStorage full:', e);
  }
}

export function addLocalDocument(collectionName, data) {
  const items = getLocalCollection(collectionName);
  const id = data.id || `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newDoc = {
    ...data,
    id,
    createdAt: data.createdAt || { seconds: Math.floor(Date.now() / 1000) },
    updatedAt: { seconds: Math.floor(Date.now() / 1000) },
  };
  items.unshift(newDoc);
  saveLocalCollection(collectionName, items);
  setStandbyMode(true);
  return newDoc;
}

export function updateLocalDocument(collectionName, id, updates) {
  const items = getLocalCollection(collectionName);
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: { seconds: Math.floor(Date.now() / 1000) },
    };
    saveLocalCollection(collectionName, items);
    return items[index];
  }
  return null;
}

export function deleteLocalDocument(collectionName, id) {
  const items = getLocalCollection(collectionName);
  const filtered = items.filter(item => item.id !== id);
  saveLocalCollection(collectionName, filtered);
  return true;
}
