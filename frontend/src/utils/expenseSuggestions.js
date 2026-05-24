/**
 * expenseSuggestions.js
 * 
 * Lightweight client-side suggestion engine for the Expenses module.
 * Analyzes historical expense data to suggest amounts and categories
 * using a frequency + recency + context scoring strategy.
 * 
 * Zero backend dependencies. Caches computed model in localStorage.
 */

const STORAGE_KEY = "unitrack_expense_suggestions";
const DEFAULT_AMOUNTS = [10, 20, 50, 100, 200, 500];
const MAX_SUGGESTIONS = 6;
const BUCKET_SIZE = 5; // Round amounts to nearest ₹5 for clustering

// Scoring weights
const FREQ_WEIGHT = 0.5;
const RECENCY_WEIGHT = 0.3;
const CONTEXT_WEIGHT = 0.2;

/**
 * Round an amount to the nearest bucket for clustering.
 * e.g. 47 → 45, 123 → 125, 8 → 10 (min bucket = 5)
 */
function bucketAmount(amount) {
  const bucketed = Math.round(amount / BUCKET_SIZE) * BUCKET_SIZE;
  return Math.max(BUCKET_SIZE, bucketed);
}

/**
 * Calculate days elapsed since a given date string.
 */
function daysSince(dateStr) {
  if (!dateStr) return 365; // treat missing date as very old
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return 365;
  const now = new Date();
  return Math.max(0, (now - then) / (1000 * 60 * 60 * 24));
}

/**
 * Build a suggestion model from raw expense + category data.
 * Returns { amountStats, categoryStats, lastBuilt }.
 * 
 * @param {Array} expenses - Array of expense objects from the API
 * @param {Array} categories - Array of category objects
 * @returns {Object} SuggestionModel
 */
export function buildSuggestionModel(expenses, categories) {
  if (!expenses || expenses.length === 0) {
    return { amountStats: {}, categoryStats: {}, amountCategoryMap: {}, lastBuilt: Date.now() };
  }

  // --- Amount statistics ---
  // Key: bucketed amount, Value: { count, lastDate, categoryIds: Set }
  const amountStats = {};

  // --- Category statistics ---
  // Key: categoryId (string), Value: { count, lastDate, name }
  const categoryStats = {};

  // --- Amount-Category pairs ---
  // Key: `${categoryId}:${bucketedAmount}`, Value: { count, lastDate }
  const amountCategoryMap = {};

  for (const exp of expenses) {
    const amount = exp.amount;
    if (!amount || amount <= 0) continue;

    const bucketed = bucketAmount(amount);
    const catId = String(exp.categoryId || "");
    const catName = exp.categoryName || "";
    const date = exp.date || "";

    // Amount stats
    if (!amountStats[bucketed]) {
      amountStats[bucketed] = { count: 0, lastDate: "", categoryIds: [] };
    }
    amountStats[bucketed].count += 1;
    if (date > amountStats[bucketed].lastDate) {
      amountStats[bucketed].lastDate = date;
    }
    if (catId && !amountStats[bucketed].categoryIds.includes(catId)) {
      amountStats[bucketed].categoryIds.push(catId);
    }

    // Category stats
    if (catId) {
      if (!categoryStats[catId]) {
        categoryStats[catId] = { count: 0, lastDate: "", name: catName };
      }
      categoryStats[catId].count += 1;
      if (catName) categoryStats[catId].name = catName;
      if (date > categoryStats[catId].lastDate) {
        categoryStats[catId].lastDate = date;
      }
    }

    // Amount-Category pair
    if (catId) {
      const pairKey = `${catId}:${bucketed}`;
      if (!amountCategoryMap[pairKey]) {
        amountCategoryMap[pairKey] = { count: 0, lastDate: "" };
      }
      amountCategoryMap[pairKey].count += 1;
      if (date > amountCategoryMap[pairKey].lastDate) {
        amountCategoryMap[pairKey].lastDate = date;
      }
    }
  }

  const model = { amountStats, categoryStats, amountCategoryMap, lastBuilt: Date.now() };

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  } catch (_) {
    // localStorage full or unavailable — silently ignore
  }

  return model;
}

/**
 * Load cached model from localStorage (if available).
 */
export function loadCachedModel() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

/**
 * Get suggested amounts, ranked by score.
 * If a category is selected, amounts used with that category get a context bonus.
 * 
 * @param {Object} model - SuggestionModel from buildSuggestionModel()
 * @param {string|number|null} selectedCategoryId - Currently selected category ID
 * @returns {number[]} Array of suggested amounts (max MAX_SUGGESTIONS)
 */
export function getSuggestedAmounts(model, selectedCategoryId = null) {
  if (!model || !model.amountStats || Object.keys(model.amountStats).length === 0) {
    return DEFAULT_AMOUNTS;
  }

  const stats = model.amountStats;
  const catId = selectedCategoryId ? String(selectedCategoryId) : null;

  // Find max count for normalization
  const maxCount = Math.max(1, ...Object.values(stats).map(s => s.count));

  const scored = Object.entries(stats).map(([amountStr, stat]) => {
    const amount = Number(amountStr);

    // Frequency: normalized 0–1
    const freqScore = stat.count / maxCount;

    // Recency: exponential decay over ~1 week
    const recencyScore = 1 / (1 + daysSince(stat.lastDate) / 7);

    // Context: bonus if this amount has been used with the selected category
    let contextScore = 0;
    if (catId) {
      const pairKey = `${catId}:${amountStr}`;
      if (model.amountCategoryMap[pairKey]) {
        contextScore = 1;
      } else if (stat.categoryIds && stat.categoryIds.includes(catId)) {
        contextScore = 0.5;
      }
    }

    const score = (FREQ_WEIGHT * freqScore) + (RECENCY_WEIGHT * recencyScore) + (CONTEXT_WEIGHT * contextScore);

    return { amount, score };
  });

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  const suggestions = scored.slice(0, MAX_SUGGESTIONS).map(s => s.amount);

  // If we have fewer than MAX_SUGGESTIONS, backfill with defaults that aren't already present
  if (suggestions.length < MAX_SUGGESTIONS) {
    for (const def of DEFAULT_AMOUNTS) {
      if (!suggestions.includes(def) && suggestions.length < MAX_SUGGESTIONS) {
        suggestions.push(def);
      }
    }
  }

  return suggestions;
}

/**
 * Get suggested categories, ranked by combined frequency + recency score.
 * 
 * @param {Object} model - SuggestionModel from buildSuggestionModel()
 * @param {Array} allCategories - Full list of category objects (for metadata)
 * @returns {{ id: string, name: string, score: number }[]} Ranked categories
 */
export function getSuggestedCategories(model, allCategories = []) {
  if (!model || !model.categoryStats || Object.keys(model.categoryStats).length === 0) {
    return [];
  }

  const stats = model.categoryStats;
  const maxCount = Math.max(1, ...Object.values(stats).map(s => s.count));

  const scored = Object.entries(stats).map(([catId, stat]) => {
    const freqScore = stat.count / maxCount;
    const recencyScore = 1 / (1 + daysSince(stat.lastDate) / 7);
    const score = (0.6 * freqScore) + (0.4 * recencyScore);

    // Get the name from the categories array (more reliable than stored name)
    const catObj = allCategories.find(c => String(c.id) === catId);
    const name = catObj?.name || stat.name || "Unknown";

    return { id: catId, name, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 4); // Top 4 categories
}
