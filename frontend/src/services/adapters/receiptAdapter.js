/**
 * receiptAdapter.js
 *
 * Adapter: Receipt OCR → Normalized Transaction Draft
 * Bridges the existing receiptScannerService into the draft pipeline.
 */
import { scanReceipt } from '../receiptScannerService';
import { matchCategory } from '../../utils/categoryMatcher';
import { createDraft, TransactionSourceType } from '../transactionDraftService';

/**
 * Scan a receipt image and produce a TransactionDraft.
 *
 * @param {File} file - Image file
 * @param {Array} userCategories - User's expense categories
 * @param {Array} existingExpenses - For duplicate detection
 * @param {AbortSignal} [signal]
 * @returns {Promise<TransactionDraft>}
 */
export async function receiptToDraft(file, userCategories, existingExpenses = [], signal) {
  const result = await scanReceipt(file, signal);

  const categoryMatch = matchCategory(
    result.suggestedCategory,
    result.merchant,
    userCategories
  );

  // Map OCR confidence to 0-1 scale
  const confidenceMap = { HIGH: 0.9, MEDIUM: 0.6, LOW: 0.3 };
  const confidence = confidenceMap[result.confidence] || 0.3;

  return createDraft({
    sourceType: TransactionSourceType.RECEIPT_SCAN,
    amount: result.amount,
    merchant: result.merchant,
    date: result.date,
    time: result.time,
    categoryId: categoryMatch.categoryId,
    categoryName: categoryMatch.categoryName,
    confidence,
    note: [result.merchant, result.billNumber].filter(Boolean).join(' — '),
    rawData: {
      ocrResult: result,
      fileName: file.name,
      fieldConfidence: result.fieldConfidence,
    },
    existingExpenses,
  });
}
