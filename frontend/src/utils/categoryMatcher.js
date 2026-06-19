/**
 * categoryMatcher.js
 *
 * Maps AI-predicted category names to the user's actual expense categories
 * using fuzzy matching and keyword-based fallback.
 */

/**
 * Keyword → category mapping for common Indian student expenses.
 * Keys are lowercased keywords that might appear in merchant names or AI predictions.
 */
const KEYWORD_MAP = {
  // Food & Beverages
  "food": "Food & Beverages",
  "restaurant": "Food & Beverages",
  "cafe": "Food & Beverages",
  "coffee": "Food & Beverages",
  "tea": "Food & Beverages",
  "mess": "Food & Beverages",
  "canteen": "Food & Beverages",
  "dhaba": "Food & Beverages",
  "tiffin": "Food & Beverages",
  "biryani": "Food & Beverages",
  "pizza": "Food & Beverages",
  "burger": "Food & Beverages",
  "domino": "Food & Beverages",
  "zomato": "Food & Beverages",
  "swiggy": "Food & Beverages",
  "mcdonald": "Food & Beverages",
  "kfc": "Food & Beverages",
  "subway": "Food & Beverages",
  "starbucks": "Food & Beverages",
  "chaayos": "Food & Beverages",
  "juice": "Food & Beverages",
  "bakery": "Food & Beverages",
  "sweet": "Food & Beverages",
  "snack": "Food & Beverages",
  "beverages": "Food & Beverages",
  "dine": "Food & Beverages",
  "eat": "Food & Beverages",
  "groceries": "Groceries",
  "grocery": "Groceries",
  "supermarket": "Groceries",
  "bigbasket": "Groceries",
  "blinkit": "Groceries",
  "dmart": "Groceries",

  // Transportation
  "transport": "Transportation",
  "bus": "Transportation",
  "auto": "Transportation",
  "rickshaw": "Transportation",
  "uber": "Transportation",
  "ola": "Transportation",
  "rapido": "Transportation",
  "metro": "Transportation",
  "train": "Transportation",
  "railway": "Transportation",
  "petrol": "Transportation",
  "diesel": "Transportation",
  "fuel": "Transportation",
  "parking": "Transportation",
  "toll": "Transportation",
  "cab": "Transportation",
  "taxi": "Transportation",

  // Books & Stationery
  "book": "Books & Stationery",
  "stationery": "Books & Stationery",
  "pen": "Books & Stationery",
  "notebook": "Books & Stationery",
  "xerox": "Books & Stationery",
  "photocopy": "Books & Stationery",
  "print": "Books & Stationery",
  "academic": "Books & Stationery",
  "textbook": "Books & Stationery",

  // Shopping
  "shopping": "Shopping",
  "amazon": "Shopping",
  "flipkart": "Shopping",
  "myntra": "Shopping",
  "clothes": "Shopping",
  "fashion": "Shopping",
  "electronics": "Shopping",
  "gadget": "Shopping",

  // Entertainment
  "entertainment": "Entertainment",
  "movie": "Entertainment",
  "cinema": "Entertainment",
  "pvr": "Entertainment",
  "inox": "Entertainment",
  "netflix": "Entertainment",
  "spotify": "Entertainment",
  "game": "Entertainment",

  // Medical
  "medical": "Medical",
  "pharmacy": "Medical",
  "medicine": "Medical",
  "doctor": "Medical",
  "hospital": "Medical",
  "clinic": "Medical",
  "apollo": "Medical",
};

/**
 * Normalize a string for comparison — lowercase, trimmed, common variations collapsed.
 */
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[&]/g, "and")
    .replace(/\s+/g, " ");
}

/**
 * Simple similarity score between two strings (0–1).
 * Uses longest common subsequence ratio.
 */
function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (!na || !nb) return 0;

  // Check containment
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Simple token overlap
  const tokensA = new Set(na.split(" "));
  const tokensB = new Set(nb.split(" "));
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }
  const total = Math.max(tokensA.size, tokensB.size);
  return total > 0 ? overlap / total : 0;
}

/**
 * Match an AI-predicted category to the user's actual categories.
 *
 * @param {string} predictedCategory — the category name from AI (e.g. "Food & Beverages")
 * @param {string|null} merchantName — the merchant name for keyword fallback
 * @param {Array<{id: number, name: string}>} userCategories — user's expense categories
 * @returns {{ categoryId: number|null, categoryName: string, matchConfidence: string }}
 */
export function matchCategory(predictedCategory, merchantName, userCategories) {
  if (!userCategories || userCategories.length === 0) {
    return { categoryId: null, categoryName: predictedCategory || "Other", matchConfidence: "LOW" };
  }

  // Strategy 1: Direct fuzzy match against user categories
  let bestMatch = null;
  let bestScore = 0;

  for (const cat of userCategories) {
    const score = similarity(predictedCategory, cat.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  if (bestScore >= 0.7) {
    return {
      categoryId: bestMatch.id,
      categoryName: bestMatch.name,
      matchConfidence: bestScore >= 0.9 ? "HIGH" : "MEDIUM",
    };
  }

  // Strategy 2: Keyword-based matching from predicted category or merchant name
  const searchTexts = [
    normalize(predictedCategory),
    normalize(merchantName),
  ].filter(Boolean);

  for (const text of searchTexts) {
    for (const [keyword, mappedCategory] of Object.entries(KEYWORD_MAP)) {
      if (text.includes(keyword)) {
        // Find user category matching the mapped category
        const userCat = userCategories.find(
          (c) => similarity(c.name, mappedCategory) >= 0.7
        );
        if (userCat) {
          return {
            categoryId: userCat.id,
            categoryName: userCat.name,
            matchConfidence: "MEDIUM",
          };
        }
      }
    }
  }

  // Strategy 3: Return best partial match if score is reasonable
  if (bestScore >= 0.4 && bestMatch) {
    return {
      categoryId: bestMatch.id,
      categoryName: bestMatch.name,
      matchConfidence: "LOW",
    };
  }

  // Fallback: return the first category or null
  return {
    categoryId: userCategories[0]?.id || null,
    categoryName: predictedCategory || "Other",
    matchConfidence: "LOW",
  };
}
