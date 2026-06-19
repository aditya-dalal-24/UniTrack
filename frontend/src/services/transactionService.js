/**
 * transactionService.js
 *
 * Abstraction layer for future SMS/UPI-based expense automation.
 * Provides:
 *  - Text-based transaction parsing (amount, merchant, category)
 *  - Category auto-detection from keywords
 *  - Unified ingestion pipeline for manual + future automated sources
 *
 * No actual SMS reading. This is the architecture layer only.
 */

// ─── ENUMS ──────────────────────────────────────────────
export const TransactionSource = Object.freeze({
  MANUAL: "MANUAL",
  SMS: "SMS",
  UPI_NOTIFICATION: "UPI_NOTIFICATION",
});

// ─── KEYWORD → CATEGORY MAP ────────────────────────────
// Maps common merchant keywords/phrases to category names.
// Extend this as new categories are added.
const CATEGORY_KEYWORDS = {
  // Food & Dining
  food: "Food",
  swiggy: "Food",
  zomato: "Food",
  restaurant: "Food",
  cafe: "Food",
  canteen: "Food",
  mess: "Food",
  dominos: "Food",
  mcdonalds: "Food",
  pizza: "Food",
  burger: "Food",
  chai: "Food",
  tea: "Food",
  coffee: "Food",
  starbucks: "Food",

  // Transport
  uber: "Transport",
  ola: "Transport",
  rapido: "Transport",
  metro: "Transport",
  bus: "Transport",
  petrol: "Transport",
  fuel: "Transport",
  auto: "Transport",
  cab: "Transport",
  train: "Transport",
  irctc: "Transport",

  // Shopping
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  ajio: "Shopping",
  mall: "Shopping",

  // Education
  book: "Education",
  stationery: "Education",
  course: "Education",
  udemy: "Education",
  college: "Education",
  tuition: "Education",
  xerox: "Education",
  print: "Education",

  // Entertainment
  netflix: "Entertainment",
  spotify: "Entertainment",
  movie: "Entertainment",
  pvr: "Entertainment",
  inox: "Entertainment",
  game: "Entertainment",

  // Bills & Utilities
  electricity: "Bills",
  water: "Bills",
  wifi: "Bills",
  internet: "Bills",
  recharge: "Bills",
  jio: "Bills",
  airtel: "Bills",
  vodafone: "Bills",
  phone: "Bills",

  // Health
  medicine: "Health",
  pharmacy: "Health",
  doctor: "Health",
  hospital: "Health",
  gym: "Health",
  apollo: "Health",
};

/**
 * Detect the most likely category from a merchant name or description.
 *
 * @param {string} text - Merchant name, description, or SMS body
 * @param {Array}  userCategories - User's existing category list [{id, name}]
 * @returns {{ categoryName: string, confidence: number } | null}
 */
export function detectCategory(text, userCategories = []) {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Try keyword matching
  for (const [keyword, categoryName] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword)) {
      // Verify the category exists in the user's list (fuzzy match)
      const match = userCategories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      return {
        categoryName: match ? match.name : categoryName,
        categoryId: match?.id || null,
        confidence: match ? 0.9 : 0.6, // Lower confidence if category doesn't exist yet
      };
    }
  }
  return null;
}

/**
 * Parse a raw text string (e.g., SMS body) to extract transaction data.
 *
 * Handles formats like:
 *  - "Paid Rs.150 to Swiggy"
 *  - "INR 500 debited for Amazon"
 *  - "Rs 1,200.50 spent at PVR"
 *  - "200 canteen"
 *
 * @param {string} rawText - The raw text to parse
 * @returns {{ amount: number|null, merchant: string|null, description: string }}
 */
export function parseTransaction(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { amount: null, merchant: null, description: rawText || "" };
  }

  const text = rawText.trim();

  // Amount patterns (INR, Rs, Rs., ₹, or plain number)
  const amountPatterns = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
    /(?:paid|spent|debited|credited)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /^([\d,]+(?:\.\d{1,2})?)\s+\w/,
  ];

  let amount = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(amount) && amount > 0) break;
      amount = null;
    }
  }

  // Merchant extraction — look for "to <merchant>", "at <merchant>", "for <merchant>"
  let merchant = null;
  const merchantPatterns = [
    /(?:to|at|for|from)\s+([A-Za-z][A-Za-z0-9\s&'.]+)/i,
  ];
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match) {
      merchant = match[1].trim().substring(0, 50); // Cap at 50 chars
      break;
    }
  }

  // If no merchant found but there's text after the amount, use that
  if (!merchant && amount !== null) {
    const afterAmount = text
      .replace(/(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{1,2})?/i, "")
      .replace(/[\d,]+(?:\.\d{1,2})?/i, "")
      .replace(/(?:paid|spent|debited|credited)/gi, "")
      .trim();
    if (afterAmount.length > 1) {
      merchant = afterAmount.substring(0, 50);
    }
  }

  return {
    amount,
    merchant,
    description: text,
  };
}

/**
 * Unified transaction ingestion pipeline.
 * Normalizes data from any source into a consistent expense-ready format.
 *
 * @param {Object} params
 * @param {string} params.source - TransactionSource enum value
 * @param {string} params.rawText - Original text (SMS body, user input, etc.)
 * @param {Array}  params.userCategories - User's existing categories
 * @param {string} [params.date] - Override date (YYYY-MM-DD), defaults to today
 * @returns {{ amount: number|null, categoryName: string|null, categoryId: string|null, description: string, merchant: string|null, source: string, date: string, confidence: number }}
 */
export function ingestTransaction({
  source = TransactionSource.MANUAL,
  rawText = "",
  userCategories = [],
  date = null,
}) {
  const parsed = parseTransaction(rawText);
  const category = detectCategory(
    parsed.merchant || parsed.description,
    userCategories
  );

  return {
    amount: parsed.amount,
    categoryName: category?.categoryName || null,
    categoryId: category?.categoryId || null,
    description: parsed.description,
    merchant: parsed.merchant,
    source,
    date: date || new Date().toISOString().split("T")[0],
    confidence: category?.confidence || 0,
  };
}
