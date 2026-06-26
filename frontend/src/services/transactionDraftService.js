/**
 * transactionDraftService.js
 *
 * Normalized transaction draft pipeline.
 * All expense sources feed into this service, which normalizes, classifies,
 * detects duplicates, and queues drafts for user confirmation.
 *
 * Pipeline: Source → Raw Ingestion → Normalize → Classify → Deduplicate → Draft
 */

// ─── SOURCE TYPES ────────────────────────────────────
export const TransactionSourceType = Object.freeze({
  RECEIPT_SCAN: 'RECEIPT_SCAN',
  ANDROID_NOTIFICATION: 'ANDROID_NOTIFICATION',
  ANDROID_SMS: 'ANDROID_SMS',
  EMAIL_IMPORT: 'EMAIL_IMPORT',
  MANUAL: 'MANUAL',
});

// ─── DRAFT STATUS ────────────────────────────────────
export const DraftStatus = Object.freeze({
  PENDING_REVIEW: 'PENDING_REVIEW',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  SAVED: 'SAVED',
});

// ─── STORAGE ─────────────────────────────────────────
const DRAFT_STORAGE_KEY = 'unitrack_transaction_drafts';

/**
 * @typedef {Object} TransactionDraft
 * @property {string} id                      - Unique draft ID
 * @property {string} sourceType              - TransactionSourceType enum
 * @property {number|null} amount             - Parsed amount
 * @property {string|null} merchant           - Merchant name
 * @property {string|null} date               - YYYY-MM-DD
 * @property {string|null} time               - HH:MM
 * @property {string|null} categoryId         - Matched category ID
 * @property {string|null} categoryName       - Matched category name
 * @property {number} confidence              - 0-1 confidence score
 * @property {string|null} note               - Auto-generated note
 * @property {string|null} txnReferenceId     - UPI ref / bank txn ID
 * @property {string} duplicateFingerprint    - Hash for duplicate detection
 * @property {boolean} isDuplicate            - Whether this is a likely duplicate
 * @property {boolean} requiresUserConfirmation
 * @property {string} status                  - DraftStatus enum
 * @property {number} createdAt               - Unix timestamp
 * @property {Object|null} rawData            - Original source data for debugging
 */

/**
 * Generate a duplicate fingerprint from transaction data.
 * Uses amount + date + merchant (normalized) to detect likely duplicates.
 */
export function generateFingerprint({ amount, date, merchant }) {
  const parts = [
    amount ? Math.round(amount * 100) : '0',
    date || 'nodate',
    (merchant || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20),
  ];
  return parts.join('|');
}

/**
 * Check if a draft is likely a duplicate of an existing expense.
 *
 * @param {string} fingerprint - The draft's fingerprint
 * @param {Array} existingExpenses - User's existing expenses
 * @returns {boolean}
 */
export function isDuplicate(fingerprint, existingExpenses = []) {
  return existingExpenses.some(exp => {
    const expFingerprint = generateFingerprint({
      amount: exp.amount,
      date: exp.date,
      merchant: exp.note,
    });
    return expFingerprint === fingerprint;
  });
}

/**
 * Create a normalized transaction draft from any source.
 *
 * @param {Object} params
 * @param {string} params.sourceType          - TransactionSourceType
 * @param {number|null} params.amount
 * @param {string|null} params.merchant
 * @param {string|null} params.date           - YYYY-MM-DD
 * @param {string|null} params.time           - HH:MM
 * @param {string|null} params.categoryId     - Pre-matched category ID
 * @param {string|null} params.categoryName   - Pre-matched category name
 * @param {number} params.confidence          - 0-1
 * @param {string|null} params.note
 * @param {string|null} params.txnReferenceId
 * @param {Object|null} params.rawData        - Original data for debugging
 * @param {Array} params.existingExpenses     - For duplicate detection
 * @returns {TransactionDraft}
 */
export function createDraft({
  sourceType = TransactionSourceType.MANUAL,
  amount = null,
  merchant = null,
  date = null,
  time = null,
  categoryId = null,
  categoryName = null,
  confidence = 0,
  note = null,
  txnReferenceId = null,
  rawData = null,
  existingExpenses = [],
}) {
  const fingerprint = generateFingerprint({ amount, date, merchant });
  const duplicate = isDuplicate(fingerprint, existingExpenses);

  // Determine if user confirmation is needed
  const requiresUserConfirmation =
    duplicate ||
    confidence < 0.7 ||
    !amount ||
    amount <= 0 ||
    sourceType !== TransactionSourceType.MANUAL;

  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceType,
    amount,
    merchant,
    date: date || new Date().toISOString().split('T')[0],
    time: time || null,
    categoryId,
    categoryName,
    confidence,
    note: note || merchant || null,
    txnReferenceId,
    duplicateFingerprint: fingerprint,
    isDuplicate: duplicate,
    requiresUserConfirmation,
    status: requiresUserConfirmation ? DraftStatus.PENDING_REVIEW : DraftStatus.CONFIRMED,
    createdAt: Date.now(),
    rawData,
  };
}

// ─── PERSISTENCE (localStorage Queue) ────────────────

/**
 * Load all drafts from localStorage.
 * @returns {TransactionDraft[]}
 */
export function loadDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save drafts array to localStorage.
 */
export function saveDrafts(drafts) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Storage full — silently ignore
  }
}

/**
 * Add a draft to the queue.
 */
export function enqueueDraft(draft) {
  const drafts = loadDrafts();
  drafts.unshift(draft); // newest first
  // Keep max 50 drafts
  const trimmed = drafts.slice(0, 50);
  saveDrafts(trimmed);
  return trimmed;
}

/**
 * Update a draft's status.
 */
export function updateDraftStatus(draftId, status) {
  const drafts = loadDrafts();
  const updated = drafts.map(d =>
    d.id === draftId ? { ...d, status } : d
  );
  saveDrafts(updated);
  return updated;
}

/**
 * Remove a draft from the queue.
 */
export function removeDraft(draftId) {
  const drafts = loadDrafts();
  const filtered = drafts.filter(d => d.id !== draftId);
  saveDrafts(filtered);
  return filtered;
}

/**
 * Get pending review count (for badge on Expenses nav).
 */
export function getPendingDraftCount() {
  return loadDrafts().filter(d => d.status === DraftStatus.PENDING_REVIEW).length;
}
