/**
 * notificationAdapter.js
 *
 * Adapter: Android Payment Notification → Normalized Transaction Draft
 *
 * Currently: interface-only (no actual notification reading in pure PWA).
 * Future: Capacitor NotificationListenerService will feed payloads here.
 */
import { parseTransaction, detectCategory } from '../transactionService';
import { createDraft, TransactionSourceType } from '../transactionDraftService';

// Apps whose notifications we care about
const PAYMENT_APPS = [
  'com.google.android.apps.nbu.paisa',  // Google Pay
  'net.one97.paytm',                     // Paytm
  'in.org.npci.upiapp',                  // BHIM
  'com.phonepe.app',                     // PhonePe
];

/**
 * Parse a notification payload and create a transaction draft.
 *
 * @param {Object} notification - { packageName, title, text, timestamp }
 * @param {Array} userCategories
 * @param {Array} existingExpenses
 * @returns {TransactionDraft|null}
 */
export function notificationToDraft(notification, userCategories, existingExpenses = []) {
  const { packageName, title, text, timestamp } = notification;

  // Only process payment app notifications
  if (!PAYMENT_APPS.some(pkg => packageName?.includes(pkg))) return null;

  const fullText = `${title || ''} ${text || ''}`;
  const parsed = parseTransaction(fullText);
  if (!parsed.amount || parsed.amount <= 0) return null;

  const category = detectCategory(
    parsed.merchant || fullText,
    userCategories
  );

  return createDraft({
    sourceType: TransactionSourceType.ANDROID_NOTIFICATION,
    amount: parsed.amount,
    merchant: parsed.merchant,
    date: timestamp
      ? new Date(timestamp).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    categoryId: category?.categoryId || null,
    categoryName: category?.categoryName || null,
    confidence: category?.confidence || 0.4,
    note: `${title || 'Payment'}: ${(text || '').substring(0, 60)}`,
    rawData: notification,
    existingExpenses,
  });
}
