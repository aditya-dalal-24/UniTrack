/**
 * smsAdapter.js
 *
 * Adapter: SMS Text → Normalized Transaction Draft
 *
 * Currently: parser-only (no actual SMS reading in pure PWA).
 * Future: Capacitor plugin will feed SMS bodies into this adapter.
 */
import { parseTransaction, detectCategory } from '../transactionService';
import { createDraft, TransactionSourceType } from '../transactionDraftService';

/**
 * Parse a bank SMS body and create a transaction draft.
 *
 * @param {string} smsBody - Raw SMS text
 * @param {string} sender - SMS sender (e.g. "AD-HDFCBK")
 * @param {Array} userCategories
 * @param {Array} existingExpenses
 * @returns {TransactionDraft|null}
 */
export function smsToDraft(smsBody, sender, userCategories, existingExpenses = []) {
  // Skip non-transactional SMS
  if (!smsBody || smsBody.length < 10) return null;
  const lower = smsBody.toLowerCase();
  if (
    !lower.includes('debit') &&
    !lower.includes('paid') &&
    !lower.includes('spent') &&
    !lower.includes('transferred') &&
    !lower.includes('withdrawn')
  ) {
    return null;
  }

  const parsed = parseTransaction(smsBody);
  if (!parsed.amount || parsed.amount <= 0) return null;

  const category = detectCategory(
    parsed.merchant || smsBody,
    userCategories
  );

  // Extract UPI reference if present
  const upiMatch = smsBody.match(/Ref\s*(?:No|Id|#)?[:\s]*([A-Za-z0-9]+)/i);
  const txnRef = upiMatch ? upiMatch[1] : null;

  return createDraft({
    sourceType: TransactionSourceType.ANDROID_SMS,
    amount: parsed.amount,
    merchant: parsed.merchant,
    date: new Date().toISOString().split('T')[0],
    categoryId: category?.categoryId || null,
    categoryName: category?.categoryName || null,
    confidence: category?.confidence || 0.3,
    note: `SMS from ${sender}: ${smsBody.substring(0, 60)}`,
    txnReferenceId: txnRef,
    rawData: { smsBody, sender },
    existingExpenses,
  });
}
