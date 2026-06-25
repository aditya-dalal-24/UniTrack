import Tesseract from "tesseract.js";

/**
 * receiptScannerService.js
 *
 * Offline, free receipt parser using Tesseract.js (Local OCR).
 * Extracts raw text from images and applies heuristic regex parsing to find
 * the merchant, total amount, and date.
 */

/**
 * Parse raw OCR text to find receipt details.
 */
function parseReceiptText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2); // Ignore empty or tiny noise lines

  // 1. Find Merchant (usually the first substantial line)
  // Skip lines that are just numbers or dates or generic headers like "TAX INVOICE"
  let merchant = null;
  const skipKeywords = ["tax invoice", "cash memo", "bill", "receipt", "welcome"];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isSkip = skipKeywords.some((k) => lower.includes(k));
    const isJustNumbers = /^[\d\W]+$/.test(line); // e.g. "12/05/2023", "12345"
    if (!isSkip && !isJustNumbers && line.length > 3) {
      merchant = line;
      break;
    }
  }

  // 2. Find Date
  let date = null;
  const dateRegexes = [
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/, // dd/mm/yyyy or mm/dd/yyyy
    /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/, // yyyy-mm-dd
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/i // 12 Jan 2023
  ];

  for (const line of lines) {
    for (const regex of dateRegexes) {
      const match = line.match(regex);
      if (match) {
        // Try to format as YYYY-MM-DD for the date picker
        if (regex === dateRegexes[1]) {
          // already yyyy-mm-dd
          date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else if (regex === dateRegexes[0]) {
          let year = match[3];
          if (year.length === 2) year = "20" + year;
          // Assume DD/MM/YYYY for India
          date = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
        break;
      }
    }
    if (date) break;
  }

  // 3. Find Amount (Closest to the bottom)
  let bottomMostTotalAmount = null;
  let bottomMostFallbackAmount = null;
  
  // Strong indicators of the final total of the bill
  const totalKeywords = ["total", "net", "payable", "grand", "gross", "gros", "due", "pay", "tot", "amt", "amount"];
  
  // Indicators of line items or headers that we should deprioritize
  const itemKeywords = ["qty", "rate", "rate/qty", "item", "price", "discount", "gst%"];

  // Regex for numbers with optional decimals: 123.45, 1,234.5, 740.000
  const numberRegex = /(?:rs\.?\s*|₹\s*)?(?:[1-9]\d{0,2}(?:,\d{3})+|\d+)(?:\.\d{1,3})?/gi;

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Extract all numbers from the line
    const matches = line.match(numberRegex);
    if (matches) {
      for (const match of matches) {
        // Clean the number string
        const cleanStr = match.replace(/[^\d.]/g, '');
        if (cleanStr) {
          const val = parseFloat(cleanStr);
          
          const hasDecimal = cleanStr.includes('.') || match.includes('.');
          const isTotalLine = totalKeywords.some(k => lower.includes(k));
          const isItemLine = itemKeywords.some(k => lower.includes(k));
          const hasCurrency = /(?:rs|₹)/i.test(match);
          const isYear = val >= 1990 && val <= 2050 && !hasDecimal;
          
          // Filter out obvious noise (>100,000 or exact years)
          if (val > 0 && val < 100000 && !isYear) {
            // We prioritize total lines that are NOT header/item lines
            if (isTotalLine && !isItemLine) {
              bottomMostTotalAmount = val;
            } else if (isTotalLine || hasDecimal || hasCurrency) {
              bottomMostFallbackAmount = val;
            }
          }
        }
      }
    }
  }
  
  const amount = bottomMostTotalAmount !== null ? bottomMostTotalAmount : (bottomMostFallbackAmount !== null ? bottomMostFallbackAmount : null);

  // Set confidence based on heuristics
  let confidence = "LOW";
  if (merchant && amount && date) confidence = "HIGH";
  else if (merchant && amount) confidence = "MEDIUM";

  return {
    amount: amount ? Math.round(amount * 100) / 100 : null,
    merchant: merchant ? merchant.substring(0, 50) : null, // Limit length
    suggestedCategory: null, // OCR can't reliably guess this, let categoryMatcher handle it via merchant name
    date: date || new Date().toISOString().split("T")[0],
    time: null,
    gstAmount: null,
    billNumber: null,
    items: [],
    confidence,
    fieldConfidence: {
      amount: amount ? "HIGH" : "LOW",
      merchant: merchant ? "HIGH" : "LOW",
      category: "LOW",
      date: date ? "HIGH" : "LOW",
    },
  };
}

/**
 * Convert a File object to a Data URL (which Tesseract can use)
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Main entry point: scan a receipt image file using Local OCR (Tesseract).
 *
 * @param {File} file — the image file to scan
 * @param {AbortSignal} [signal] — optional abort signal for cancellation
 * @returns {Promise<ReceiptData>}
 */
export async function scanReceipt(file, signal) {
  // Validate file
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`);
  }

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Use JPG, PNG, or WebP.`);
  }

  try {
    const imageUrl = await fileToDataUrl(file);
    
    // Tesseract handles the image processing directly in browser WebWorkers
    const result = await Tesseract.recognize(
      imageUrl,
      'eng',
      { 
        logger: m => console.log("OCR Progress:", m),
      }
    );
    
    // Check abort signal
    if (signal && signal.aborted) {
      throw new Error("Scan aborted by user");
    }
    
    const parsedData = parseReceiptText(result.data.text);
    return parsedData;
    
  } catch (err) {
    console.error("OCR Error:", err);
    throw new Error("Failed to scan receipt image. Please ensure the image is clear.");
  }
}

/**
 * Check if the service is ready/configured.
 * For offline OCR, it is always configured.
 */
export function isConfigured() {
  return true;
}
