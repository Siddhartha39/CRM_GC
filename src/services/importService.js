import {
  collection,
  doc,
  writeBatch,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAudit } from './auditService';
import { normalizePhoneNumber } from '../utils/validation';

const CUSTOMERS_COLLECTION = 'customers';
const FOLLOW_UPS_COLLECTION = 'followUps';
const BATCH_CHUNK_SIZE = 150; // Safely below 500 writes per batch (customer doc + followUp doc <= 300)

/**
 * Pre-fetches an in-memory map of existing customer records keyed by normalized phone.
 * Allows instant, zero-latency duplicate detection during file preview.
 */
export async function getExistingCustomerPhoneMap() {
  const phoneMap = new Map();
  try {
    const snap = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    snap.docs.forEach((d) => {
      const data = d.data();
      const norm = data.normalizedPhone || normalizePhoneNumber(data.phone);
      if (norm) {
        phoneMap.set(norm, {
          id: d.id,
          docId: d.id,
          ...data,
        });
      }
    });
  } catch (error) {
    console.warn('Could not prefetch existing customers for duplicate checks:', error);
  }
  return phoneMap;
}

/**
 * Executes high-performance, safe batch import into Cloud Firestore.
 * Supports duplicate modes:
 *  - 'skip': skips matching phone records
 *  - 'update': safely updates matching records while preserving call logs and history
 *  - 'add_only': inserts only if no duplicate exists; duplicate rows are treated as skipped
 *
 * @param {Object} options
 * @param {Array} options.recordsToImport - List of validated records
 * @param {string} options.duplicateMode - 'skip' | 'update' | 'add_only'
 * @param {Object} options.user - Authenticated user context
 * @param {Function} options.onProgress - Progress callback ({ current, total, percentage, statusText })
 */
export async function executeBulkImport({
  recordsToImport = [],
  duplicateMode = 'skip',
  user,
  onProgress = () => {},
}) {
  const summary = {
    total: recordsToImport.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    rejectedRecords: [],
  };

  if (!recordsToImport || recordsToImport.length === 0) {
    return summary;
  }

  // Pre-fetch fresh database phone map to prevent race conditions
  onProgress({ current: 0, total: recordsToImport.length, percentage: 5, statusText: 'Verifying database index...' });
  const existingMap = await getExistingCustomerPhoneMap();

  // Determine starting sequential Customer ID
  let baseSequenceNumber = 10001 + existingMap.size;

  // Split into chunks for Firestore Write Batches
  const chunks = [];
  for (let i = 0; i < recordsToImport.length; i += BATCH_CHUNK_SIZE) {
    chunks.push(recordsToImport.slice(i, i + BATCH_CHUNK_SIZE));
  }

  let processedCount = 0;

  for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
    const chunk = chunks[cIdx];
    const batch = writeBatch(db);
    const chunkOperations = [];

    for (const record of chunk) {
      processedCount++;
      const normPhone = record.normalizedPhone || normalizePhoneNumber(record.phone);
      const existingCustomer = existingMap.get(normPhone);

      // Scenario A: Duplicate exists in Database
      if (existingCustomer) {
        if (duplicateMode === 'skip' || duplicateMode === 'add_only') {
          summary.skipped++;
          summary.rejectedRecords.push({
            ...record,
            rejectionReason: `Duplicate skipped: Phone ${record.phone} already belongs to ${existingCustomer.fullName} (${existingCustomer.customerId || 'ID N/A'})`,
          });
          continue;
        }

        if (duplicateMode === 'update') {
          // UPDATE matching customer:
          // PRESERVE: customerId, createdAt, createdBy, lastCallAt, lastCallOutcome, internalNotes, historical subcollections
          const customerRef = doc(db, CUSTOMERS_COLLECTION, existingCustomer.id);

          const updatePayload = {
            fullName: record.fullName || existingCustomer.fullName,
            phone: record.phone || existingCustomer.phone,
            normalizedPhone: normPhone,
            updatedAt: serverTimestamp(),
            updatedBy: user?.email || 'Excel Import',
          };

          if (record.alternatePhone) updatePayload.alternatePhone = record.alternatePhone;
          if (record.email) updatePayload.email = record.email;
          if (record.city) updatePayload.city = record.city;
          if (record.address) updatePayload.address = record.address;
          if (record.requirement) updatePayload.requirement = record.requirement;
          if (record.budget !== null && record.budget !== undefined) updatePayload.budget = record.budget;
          if (record.leadCategory) updatePayload.leadCategory = record.leadCategory;
          if (record.leadStatus) updatePayload.leadStatus = record.leadStatus;
          if (record.latestFeedback) updatePayload.latestFeedback = record.latestFeedback;
          if (record.source) updatePayload.source = record.source;
          if (record.assignedTo) updatePayload.assignedTo = record.assignedTo;

          // If new follow-up date provided
          if (record.nextFollowUpDate) {
            updatePayload.nextFollowUpDate = record.nextFollowUpDate;

            // Schedule follow-up task if different or newly assigned
            if (record.nextFollowUpDate !== existingCustomer.nextFollowUpDate && record.leadStatus !== 'Do Not Contact') {
              const followUpRef = doc(collection(db, FOLLOW_UPS_COLLECTION));
              batch.set(followUpRef, {
                customerId: existingCustomer.id,
                customerCustomId: existingCustomer.customerId || '',
                customerNameSnapshot: updatePayload.fullName,
                customerPhoneSnapshot: updatePayload.phone,
                leadCategory: updatePayload.leadCategory || existingCustomer.leadCategory || 'Cold',
                requirement: updatePayload.requirement || existingCustomer.requirement || '',
                purpose: 'Follow-up from spreadsheet import update',
                dueDate: record.nextFollowUpDate,
                status: 'Pending',
                assignedTo: updatePayload.assignedTo || existingCustomer.assignedTo || user?.email || 'Unassigned',
                createdBy: user?.email || 'Excel Import',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                rescheduleHistory: [],
              });
            }
          }

          batch.update(customerRef, updatePayload);
          chunkOperations.push({ type: 'update', id: existingCustomer.id });
          summary.updated++;
          continue;
        }
      }

      // Scenario B: New Customer Record
      const newDocRef = doc(collection(db, CUSTOMERS_COLLECTION));
      const newCustomerId = `GC-${baseSequenceNumber++}`;

      const customerRecord = {
        customerId: newCustomerId,
        fullName: record.fullName,
        phone: record.phone,
        normalizedPhone: normPhone,
        alternatePhone: record.alternatePhone || '',
        normalizedAltPhone: record.alternatePhone ? normalizePhoneNumber(record.alternatePhone) : '',
        whatsAppNumber: normPhone,
        email: record.email || '',
        city: record.city || 'Kanpur',
        address: record.address || '',
        source: record.source || 'Excel Import',
        interest: record.requirement || 'General Inquiry',
        requirement: record.requirement || '',
        budget: record.budget || null,
        leadCategory: record.leadCategory || 'Cold',
        leadStatus: record.leadStatus || 'New',
        assignedTo: record.assignedTo || user?.email || 'Unassigned',
        assignedToName: record.assignedTo || user?.displayName || 'Unassigned',
        lastCallAt: record.lastCallDate || null,
        lastCallOutcome: record.lastCallDate ? 'Imported Call Record' : null,
        nextFollowUpDate: record.nextFollowUpDate || null,
        latestFeedback: record.latestFeedback || '',
        internalNotes: record.latestFeedback ? `Import note: ${record.latestFeedback}` : '',
        createdBy: user?.email || 'Excel Import',
        updatedBy: user?.email || 'Excel Import',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.set(newDocRef, customerRecord);

      // Create initial follow-up task if scheduled
      if (record.nextFollowUpDate && customerRecord.leadStatus !== 'Do Not Contact') {
        const followUpRef = doc(collection(db, FOLLOW_UPS_COLLECTION));
        batch.set(followUpRef, {
          customerId: newDocRef.id,
          customerCustomId: newCustomerId,
          customerNameSnapshot: customerRecord.fullName,
          customerPhoneSnapshot: customerRecord.phone,
          leadCategory: customerRecord.leadCategory,
          requirement: customerRecord.requirement,
          purpose: 'Scheduled callback from spreadsheet import',
          dueDate: record.nextFollowUpDate,
          status: 'Pending',
          assignedTo: customerRecord.assignedTo,
          createdBy: user?.email || 'Excel Import',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          rescheduleHistory: [],
        });
      }

      // Add to in-memory map to prevent subsequent duplicates within remaining batches
      existingMap.set(normPhone, {
        id: newDocRef.id,
        customerId: newCustomerId,
        ...customerRecord,
      });

      chunkOperations.push({ type: 'insert', id: newDocRef.id });
      summary.imported++;
    }

    // Commit batch to Firestore
    if (chunkOperations.length > 0) {
      try {
        await batch.commit();
      } catch (batchErr) {
        console.error('Batch commit failed for chunk', cIdx + 1, batchErr);
        summary.failed += chunkOperations.length;
        if (chunkOperations.some((op) => op.type === 'insert')) {
          summary.imported -= chunkOperations.filter((op) => op.type === 'insert').length;
        }
        if (chunkOperations.some((op) => op.type === 'update')) {
          summary.updated -= chunkOperations.filter((op) => op.type === 'update').length;
        }
        summary.errors.push({
          chunk: cIdx + 1,
          error: batchErr.message || 'Firestore batch write failed',
        });
      }
    }

    // Report progress
    const pct = Math.min(100, Math.round((processedCount / recordsToImport.length) * 100));
    onProgress({
      current: processedCount,
      total: recordsToImport.length,
      percentage: pct,
      statusText: `Processed ${processedCount} of ${recordsToImport.length} records (${pct}%)...`,
    });
  }

  // Audit Log
  try {
    await logAudit({
      action: 'BULK_IMPORT_CUSTOMERS',
      targetType: 'import',
      targetName: `Spreadsheet Import (${duplicateMode})`,
      details: {
        total: summary.total,
        imported: summary.imported,
        updated: summary.updated,
        skipped: summary.skipped,
        failed: summary.failed,
        duplicateMode,
      },
      user,
    });
  } catch (e) {
    console.warn('Audit log write error:', e);
  }

  return summary;
}
