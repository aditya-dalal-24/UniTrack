import Tesseract, { createWorker } from "tesseract.js";

/**
 * timetableScannerService.js
 *
 * Offline, free timetable image parser using Tesseract.js spatial clustering.
 * Instead of reading text line-by-line, we use bounding box coordinates to
 * reconstruct the 2D grid structure of a timetable image.
 */

// ===================== CONSTANTS =====================

const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const DAY_ALIASES = {
  MONDAY: "MONDAY", TUESDAY: "TUESDAY", WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY", FRIDAY: "FRIDAY", SATURDAY: "SATURDAY", SUNDAY: "SUNDAY",
  MON: "MONDAY", TUE: "TUESDAY", TUES: "TUESDAY",
  WED: "WEDNESDAY", THU: "THURSDAY", THUR: "THURSDAY", THURS: "THURSDAY",
  FRI: "FRIDAY", SAT: "SATURDAY", SUN: "SUNDAY",
};

const SUBJECT_COLORS = [
  "#6366f1", "#f472b6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#f97316",
  "#a855f7", "#22d3ee", "#84cc16", "#e11d48", "#0ea5e9",
];

const BREAK_WORDS = ["BREAK", "LUNCH", "RECESS", "INTERVAL", "SHORT", "MINOR"];

const SKIP_WORDS = [
  "TIME", "DAY", "PERIOD", "SLOT", "DAYS", "SLOTS",
  "SEMESTER", "SECTION", "YEAR", "BATCH", "ROOM", "BUILDING",
  "EFFECTIVE", "PRINTED", "SCHOOL", "DEPARTMENT", "FACULTY",
  "TECHNOLOGY", "ENGINEERING", "SCIENCE", "UNIVERSITY",
  "ARCHITECTURE", "COMPUTER", "SESSION", "NO", "NO:",
  "B.TECH", "BTECH", "M.TECH", "MTECH", "ODD", "EVEN",
  "W.E.F", "W.E.F.", "TABLE", "TIMETABLE", "TIME-TABLE",
  "COURSE", "CODE", "NAME", "CONTACT", "MAILID", "MAIL",
  "HEAD", "COORDINATOR", "DIRECTORATE", "ACADEMICS",
  "DATA", "OF", "THE", "AND", "JAN", "JUNE", "JULY",
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
];

// Roman numerals pattern (used to filter header row noise)
const ROMAN_NUMERAL_RE = /^(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,2})$/;

// ===================== TIME UTILITIES =====================

const TIME_RANGE_RE = /(\d{1,2}[.:]\s*\d{2}\s*(?:AM|PM)?)\s*[-–—to]+\s*(\d{1,2}[.:]\s*\d{2}\s*(?:AM|PM)?)/i;
const SINGLE_TIME_RE = /^(\d{1,2})[.:](\d{2})\s*(AM|PM)?$/i;
const HOUR_ONLY_RE = /^(\d{1,2})\s*(AM|PM)$/i;
const BARE_TIME_RE = /\d{1,2}[.:]\d{2}/;

// Additional patterns for OCR-degraded time values
const CONCATENATED_TIME_RE = /^(\d{3,4})$/; // "0900", "1040"
const PERIOD_TIME_RE = /\d{1,2}\.\d{2}/; // "9.00", "10.40"
const TIME_WITH_TO_RE = /(\d{1,2}[.:]\d{2})\s*to\s*(\d{1,2}[.:]\d{2})/i;

function looksLikeTime(text) {
  if (!text || !text.trim()) return false;
  const t = text.trim();
  if (TIME_RANGE_RE.test(t)) return true;
  if (BARE_TIME_RE.test(t)) return true;
  if (HOUR_ONLY_RE.test(t)) return true;
  if (PERIOD_TIME_RE.test(t)) return true;
  if (TIME_WITH_TO_RE.test(t)) return true;
  // Concatenated time like "0900" or "1040" (4 digits, first 2 <= 23, last 2 <= 59)
  const concatMatch = t.match(CONCATENATED_TIME_RE);
  if (concatMatch) {
    const num = concatMatch[1];
    const h = parseInt(num.substring(0, num.length - 2), 10);
    const m = parseInt(num.substring(num.length - 2), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return true;
  }
  return false;
}

function normalizeTime(raw) {
  if (!raw) return "";
  let t = raw.toUpperCase().replace(/\./g, ":").trim();
  const isPm = t.includes("PM");
  const isAm = t.includes("AM");
  t = t.replace(/[A-Z\s]/g, "");

  const parts = t.split(":");
  if (!parts.length || !parts[0]) return "";

  let h = parseInt(parts[0], 10);
  let m = parts.length > 1 && parts[1] ? parseInt(parts[1], 10) : 0;
  if (isNaN(h)) return "";
  if (isNaN(m)) m = 0;

  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  // Heuristic: bare hours 1-6 are likely PM in a college timetable
  if (!isPm && !isAm && h >= 1 && h <= 6) h += 12;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addOneHour(time) {
  try {
    const [h, m] = time.split(":").map(Number);
    return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

// ===================== DAY UTILITIES =====================

/**
 * Edit distance (Levenshtein) for fuzzy matching OCR-degraded day names.
 */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function resolveDay(text) {
  if (!text) return null;
  const cleaned = text.toUpperCase().replace(/[^A-Z]/g, "");
  if (!cleaned || cleaned.length < 3) return null;

  // Exact match first
  if (DAY_ALIASES[cleaned]) return DAY_ALIASES[cleaned];

  // Starts-with match (e.g., "MONDAY:" → "MONDAY")
  for (const [alias, day] of Object.entries(DAY_ALIASES)) {
    if (alias.length >= 3 && cleaned.startsWith(alias)) return day;
  }

  // Fuzzy match: allow up to 1 edit for short names (3-4 chars), 2 for longer
  // This catches OCR errors like "MCN"→"MON", "THLU"→"THU", "WEDL"→"WED"
  if (cleaned.length >= 3 && cleaned.length <= 10) {
    let bestDay = null;
    let bestDist = Infinity;
    for (const [alias, day] of Object.entries(DAY_ALIASES)) {
      if (alias.length < 3) continue;
      const maxDist = alias.length <= 4 ? 1 : 2;
      const dist = editDistance(cleaned, alias);
      if (dist <= maxDist && dist < bestDist) {
        bestDist = dist;
        bestDay = day;
      }
    }
    if (bestDay) return bestDay;
  }

  return null;
}

// ===================== FIELD EXTRACTION =====================

const COURSE_CODE_RE = /(?:^|\s)([A-Z]{2,5}[\s-]?\d{2,4}[A-Z]?|\d{2,4}[A-Z]{2,5}\d{2,4}[A-Z]?)(?:\s|$)/i;
const ROOM_RE = /(?:Room|Rm|Lab|LH|Hall|Venue|Class)[\s.:_-]*([A-Z]?\d{1,4}[A-Z]?)/i;
const PROF_RE = /(?:Prof\.?|Dr\.?|Lecturer|Faculty|Instructor)[:\s]+([A-Za-z .]+)/i;
const GROUP_RE = /(?:^|\s)((?:G\d+){1,}|Batch\s*[A-Z0-9]+|Group\s*[-:]?\s*[A-Z0-9]+|Section\s*[-:]?\s*[A-Z0-9]+|D\d)(?:\s|$)/i;

function extractFields(cellText) {
  let courseCode = null;
  let roomNumber = null;
  let professor = null;
  let groupInfo = null;
  let subjectName = cellText.trim();

  // Course code
  const ccMatch = subjectName.match(COURSE_CODE_RE);
  if (ccMatch) courseCode = ccMatch[1].trim();

  // Room
  const rmMatch = subjectName.match(ROOM_RE);
  if (rmMatch) {
    roomNumber = rmMatch[0].trim();
    subjectName = subjectName.replace(rmMatch[0], " ").trim();
  }

  // Professor
  const prMatch = subjectName.match(PROF_RE);
  if (prMatch) {
    professor = prMatch[0].trim();
    subjectName = subjectName.replace(prMatch[0], " ").trim();
  }

  // Group
  const grMatch = subjectName.match(GROUP_RE);
  if (grMatch) {
    groupInfo = grMatch[1].trim();
    subjectName = subjectName.replace(grMatch[0], " ").trim();
  }

  // Clean up subject name: remove lone room-like numbers if room wasn't explicitly found
  subjectName = subjectName.replace(/\s{2,}/g, " ").trim();

  return { subjectName, courseCode, roomNumber, professor, groupInfo };
}

// ===================== SPATIAL CLUSTERING =====================

/**
 * Given the raw Tesseract word list, reconstruct a grid of cells.
 * Each word has: { text, bbox: { x0, y0, x1, y1 } }
 */
function buildGridFromWords(words) {
  // 1. Classify every word as a Day anchor, Time anchor, or Content word
  const dayAnchors = []; // { day: "MONDAY", x: center_x, y: center_y, bbox }
  const timeAnchors = []; // { timeText: "9:00", y: center_y, bbox }
  const contentWords = []; // { text, cx, cy, bbox }

  for (const w of words) {
    const text = w.text.trim();
    if (!text || text.length < 1) continue;

    const cx = (w.bbox.x0 + w.bbox.x1) / 2;
    const cy = (w.bbox.y0 + w.bbox.y1) / 2;

    // Skip Roman numerals (header row noise like I, II, III, IV...)
    if (ROMAN_NUMERAL_RE.test(text.toUpperCase())) continue;

    const day = resolveDay(text);
    if (day && text.replace(/[^A-Za-z]/g, "").length >= 3) {
      dayAnchors.push({ day, x: cx, y: cy, bbox: w.bbox });
      continue;
    }

    if (looksLikeTime(text)) {
      timeAnchors.push({ timeText: text, y: cy, x: cx, bbox: w.bbox });
      continue;
    }

    contentWords.push({ text, cx, cy, bbox: w.bbox });
  }

  console.log("[TimetableScanner] Day anchors:", dayAnchors.map(d => `${d.day} (x=${d.x.toFixed(0)}, y=${d.y.toFixed(0)})`));
  console.log("[TimetableScanner] Time anchors (raw):", timeAnchors.map(t => `${t.timeText} (x=${t.x.toFixed(0)}, y=${t.y.toFixed(0)})`));
  console.log("[TimetableScanner] Content words:", contentWords.length);

  if (dayAnchors.length === 0 || timeAnchors.length === 0) {
    throw new Error(
      "Could not identify Day headers or Time slots in this image. " +
      "Please ensure the timetable has clear day names (Mon–Sun) and time values (e.g. 9:00, 10:30)."
    );
  }

  // 2. Determine layout orientation.
  // Layout A: Days as columns (horizontal), Times as rows (vertical) — most common.
  // Layout B: Days as rows (vertical), Times as columns (horizontal).
  // Heuristic: if day anchors vary more in X than in Y, they're column headers (Layout A).
  const dayXSpread = Math.max(...dayAnchors.map(d => d.x)) - Math.min(...dayAnchors.map(d => d.x));
  const dayYSpread = Math.max(...dayAnchors.map(d => d.y)) - Math.min(...dayAnchors.map(d => d.y));
  const isLayoutA = dayXSpread >= dayYSpread;

  console.log(`[TimetableScanner] Layout: ${isLayoutA ? "A (days=columns)" : "B (days=rows)"}`);

  // 3. Merge nearby time anchors — critical for headers like "9:00 – 9:50"
  //    where OCR produces two anchors at nearly the same position.
  const timeCoordKey = isLayoutA ? "y" : "x";
  const mergedTimeAnchors = mergeNearbyAnchors(timeAnchors, timeCoordKey, "timeText");
  console.log("[TimetableScanner] Time anchors (merged):", mergedTimeAnchors.map(t => `${t.timeText} (${timeCoordKey}=${t[timeCoordKey].toFixed(0)})`));

  // 4. Build sorted Day and Time axis boundaries
  let dayBands, timeBands;

  if (isLayoutA) {
    dayBands = buildBands(dayAnchors, "x", "day");
    timeBands = buildBands(mergedTimeAnchors, "y", "timeText");
  } else {
    dayBands = buildBands(dayAnchors, "y", "day");
    timeBands = buildBands(mergedTimeAnchors, "x", "timeText");
  }

  console.log("[TimetableScanner] Day bands:", dayBands.map(b => `${b.label}: ${b.min.toFixed(0)}–${b.max.toFixed(0)}`));
  console.log("[TimetableScanner] Time bands:", timeBands.map(b => `${b.label}: ${b.min.toFixed(0)}–${b.max.toFixed(0)}`));

  // 5. Map content words into grid cells
  const cellMap = {}; // "DAY|TIME" -> [words...]

  for (const cw of contentWords) {
    const dayCoord = isLayoutA ? cw.cx : cw.cy;
    const timeCoord = isLayoutA ? cw.cy : cw.cx;

    const dayBand = findBand(dayBands, dayCoord);
    const timeBand = findBand(timeBands, timeCoord);

    if (dayBand && timeBand) {
      const key = `${dayBand.label}|${timeBand.label}`;
      if (!cellMap[key]) cellMap[key] = [];
      cellMap[key].push(cw);
    }
  }

  return { cellMap, dayBands, timeBands, isLayoutA };
}

/**
 * Build sorted, non-overlapping bands from anchor points along a single axis.
 * Each band covers the space from midpoint-to-previous to midpoint-to-next.
 */
function buildBands(anchors, coordKey, labelKey) {
  // Deduplicate by label — keep the first occurrence
  const seen = new Set();
  const unique = [];
  for (const a of anchors) {
    if (!seen.has(a[labelKey])) {
      seen.add(a[labelKey]);
      unique.push(a);
    }
  }

  // Sort by coordinate
  unique.sort((a, b) => a[coordKey] - b[coordKey]);

  const bands = [];
  for (let i = 0; i < unique.length; i++) {
    const center = unique[i][coordKey];
    const prev = i > 0 ? unique[i - 1][coordKey] : center - 200;
    const next = i < unique.length - 1 ? unique[i + 1][coordKey] : center + 200;

    bands.push({
      label: unique[i][labelKey],
      center,
      min: (prev + center) / 2,
      max: (center + next) / 2,
    });
  }

  // Extend first and last bands generously
  if (bands.length > 0) {
    bands[0].min = 0;
    bands[bands.length - 1].max = 999999;
  }

  return bands;
}

/**
 * Merge time anchors that are close together on the same axis.
 * This handles header cells like "9:00 – 9:50" where OCR produces
 * two separate time anchors at nearly the same position.
 * The merged anchor gets a combined label like "9:00 – 9:50".
 */
function mergeNearbyAnchors(anchors, coordKey, labelKey, threshold = 80) {
  if (!anchors.length) return anchors;

  // Sort by coordinate
  const sorted = [...anchors].sort((a, b) => a[coordKey] - b[coordKey]);
  const merged = [];
  let group = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i][coordKey] - group[group.length - 1][coordKey];
    if (gap < threshold) {
      group.push(sorted[i]);
    } else {
      merged.push(mergeGroup(group, coordKey, labelKey));
      group = [sorted[i]];
    }
  }
  merged.push(mergeGroup(group, coordKey, labelKey));

  return merged;
}

function mergeGroup(group, coordKey, labelKey) {
  if (group.length === 1) return group[0];

  // Average position
  const avgCoord = group.reduce((sum, a) => sum + a[coordKey], 0) / group.length;
  const avgX = group.reduce((sum, a) => sum + a.x, 0) / group.length;
  const avgY = group.reduce((sum, a) => sum + a.y, 0) / group.length;

  // Combine labels: pick the first and last time to make a range
  const labels = group.map(a => a[labelKey]);
  const combinedLabel = labels.length > 1 ? `${labels[0]} – ${labels[labels.length - 1]}` : labels[0];

  return {
    ...group[0],
    [labelKey]: combinedLabel,
    [coordKey]: avgCoord,
    x: avgX,
    y: avgY,
  };
}

function findBand(bands, coord) {
  for (const b of bands) {
    if (coord >= b.min && coord < b.max) return b;
  }
  return null;
}

// ===================== SLOT BUILDER =====================

function buildSlotsFromCellMap(cellMap, timeBands) {
  const colorMap = {};
  let colorIdx = 0;
  const slots = [];

  for (const [key, words] of Object.entries(cellMap)) {
    const [day, timeText] = key.split("|");

    // Sort words by their position: left-to-right, top-to-bottom
    words.sort((a, b) => {
      const rowDiff = a.cy - b.cy;
      if (Math.abs(rowDiff) > 8) return rowDiff;
      return a.cx - b.cx;
    });

    const cellText = words.map(w => w.text).join(" ");

    // Skip empty / noise cells
    if (!cellText.trim()) continue;
    const upper = cellText.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (upper.length < 2) continue;

    // Skip pure time/day cells
    if (resolveDay(cellText)) continue;
    if (looksLikeTime(cellText) && cellText.replace(/[\d.:\-–\s AMPMampm]/g, "").length === 0) continue;

    // Skip header / metadata words
    const cellWords = cellText.toUpperCase().split(/\s+/);
    const meaningfulWords = cellWords.filter(w => !SKIP_WORDS.includes(w) && w.length > 1);
    if (meaningfulWords.length === 0) continue;

    // Check if it's a break
    const isBreak = BREAK_WORDS.some(bw => cellText.toUpperCase().includes(bw));

    // Parse time
    let startTime = "";
    let endTime = "";
    const rangeMatch = timeText.match(TIME_RANGE_RE);
    if (rangeMatch) {
      startTime = normalizeTime(rangeMatch[1]);
      endTime = normalizeTime(rangeMatch[2]);
    } else if (timeText.includes("-") || timeText.includes("–")) {
      const parts = timeText.split(/[-–]/);
      startTime = normalizeTime(parts[0]);
      if (parts.length > 1) endTime = normalizeTime(parts[1]);
    } else {
      startTime = normalizeTime(timeText);
    }
    if (!endTime && startTime) endTime = addOneHour(startTime);

    // Extract fields from cell text
    const fields = extractFields(cellText);

    // Assign color
    const colorKey = (fields.subjectName || cellText).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!colorMap[colorKey]) {
      colorMap[colorKey] = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
      colorIdx++;
    }

    slots.push({
      dayOfWeek: day,
      startTime,
      endTime,
      subjectName: fields.subjectName || cellText,
      subjectFullName: null,
      courseCode: fields.courseCode,
      professor: fields.professor,
      roomNumber: fields.roomNumber,
      groupInfo: fields.groupInfo,
      color: colorMap[colorKey],
      isBreak,
    });
  }

  return slots;
}

// ===================== DEDUPLICATION =====================

function deduplicateSlots(slots) {
  const seen = new Set();
  return slots.filter(s => {
    const subKey = s.isBreak
      ? `break-${Math.random()}`
      : (s.subjectName || "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    const key = `${s.dayOfWeek}|${s.startTime}|${subKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ===================== LEGEND EXTRACTION =====================

/**
 * Scan all content words for legend patterns like "DAA - Design and Analysis of Algorithms"
 * These are typically found below the main timetable grid.
 */
function extractLegendFromWords(words) {
  const subjectLegend = {};
  const LEGEND_RE = /^\s*\(?([A-Z0-9][A-Z0-9\-]{1,15})\)?\s*[-–=:]\s*(.+)$/i;

  // Group words into lines by Y proximity
  const lines = groupWordsIntoLines(words);

  for (const lineWords of lines) {
    const lineText = lineWords.map(w => w.text).join(" ");
    const match = lineText.match(LEGEND_RE);
    if (match) {
      const abbr = match[1].toUpperCase().trim();
      const fullName = match[2].trim();
      if (!resolveDay(abbr) && fullName.length > abbr.length) {
        subjectLegend[abbr] = fullName;
      }
    }
  }

  return subjectLegend;
}

function groupWordsIntoLines(words, threshold = 10) {
  if (!words.length) return [];
  const sorted = [...words].sort((a, b) => a.cy - b.cy);
  const lines = [];
  let currentLine = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].cy - sorted[i - 1].cy) < threshold) {
      currentLine.push(sorted[i]);
    } else {
      currentLine.sort((a, b) => a.cx - b.cx);
      lines.push(currentLine);
      currentLine = [sorted[i]];
    }
  }
  if (currentLine.length) {
    currentLine.sort((a, b) => a.cx - b.cx);
    lines.push(currentLine);
  }

  return lines;
}

// ===================== APPLY LEGEND =====================

function applyLegend(slots, legend) {
  if (!Object.keys(legend).length) return;
  for (const slot of slots) {
    if (!slot.subjectName) continue;
    const upper = slot.subjectName.toUpperCase().trim();
    // Check if the subject name itself is an abbreviation in the legend
    if (legend[upper]) {
      slot.subjectFullName = legend[upper];
    }
    // Also check the course code
    if (slot.courseCode && legend[slot.courseCode.toUpperCase()]) {
      slot.subjectFullName = legend[slot.courseCode.toUpperCase()];
    }
  }
}

// ===================== IMAGE PREPROCESSING =====================

/**
 * Loads an image from a data URL into an HTMLImageElement.
 */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Full preprocessing pipeline for blurry / low-contrast / camera-captured images.
 * Steps:
 *  1. Upscale small images (< 1800px wide) for better OCR
 *  2. Convert to grayscale
 *  3. Contrast stretch (histogram normalization)
 *  4. Unsharp mask sharpening
 *  5. (Optional) Adaptive binarization — only for blurry camera photos
 *
 * @param {string} dataUrl - image data URL
 * @param {boolean} binarize - whether to apply adaptive binarization (default false)
 * @returns {Promise<string>} processed image data URL
 */
async function preprocessImage(dataUrl, binarize = false) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Step 1: Upscale small images for better OCR accuracy
  const MIN_WIDTH = 1800;
  let scale = 1;
  if (img.width < MIN_WIDTH) {
    scale = Math.min(MIN_WIDTH / img.width, 3); // cap at 3x
  }
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  // Use high-quality image smoothing for upscale
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let pixels = imageData.data;

  // Step 2: Convert to grayscale (luminance formula)
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }

  // Step 3: Contrast stretch (histogram normalization)
  let minVal = 255, maxVal = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] < minVal) minVal = pixels[i];
    if (pixels[i] > maxVal) maxVal = pixels[i];
  }
  const range = maxVal - minVal || 1;
  if (range < 200) {
    for (let i = 0; i < pixels.length; i += 4) {
      const stretched = Math.round(((pixels[i] - minVal) / range) * 255);
      pixels[i] = stretched;
      pixels[i + 1] = stretched;
      pixels[i + 2] = stretched;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Step 4: Unsharp mask sharpening
  const blurRadius = 1;
  const sharpenAmount = 0.6;
  const blurredData = applyBoxBlur(ctx, canvas.width, canvas.height, blurRadius);
  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const sharpened = Math.round(pixels[i] + (pixels[i] - blurredData[i]) * sharpenAmount);
    const clamped = Math.max(0, Math.min(255, sharpened));
    pixels[i] = clamped;
    pixels[i + 1] = clamped;
    pixels[i + 2] = clamped;
  }

  // Step 5: Adaptive binarization (only for blurry camera photos)
  if (binarize) {
    const blockSize = 31;
    const C = 10;
    const w = canvas.width;
    const h = canvas.height;

    const integral = new Float64Array(w * h);
    for (let y = 0; y < h; y++) {
      let rowSum = 0;
      for (let x = 0; x < w; x++) {
        rowSum += pixels[(y * w + x) * 4];
        integral[y * w + x] = rowSum + (y > 0 ? integral[(y - 1) * w + x] : 0);
      }
    }

    const halfBlock = Math.floor(blockSize / 2);
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - halfBlock - 1);
        const y1 = Math.max(0, y - halfBlock - 1);
        const x2 = Math.min(w - 1, x + halfBlock);
        const y2 = Math.min(h - 1, y + halfBlock);

        const area = (x2 - x1) * (y2 - y1) || 1;
        const sum = integral[y2 * w + x2]
          - (x1 > 0 ? integral[y2 * w + x1] : 0)
          - (y1 > 0 ? integral[y1 * w + x2] : 0)
          + (x1 > 0 && y1 > 0 ? integral[y1 * w + x1] : 0);

        const localMean = sum / area;
        const idx = (y * w + x) * 4;
        const val = pixels[idx] > (localMean - C) ? 255 : 0;

        output[idx] = val;
        output[idx + 1] = val;
        output[idx + 2] = val;
        output[idx + 3] = 255;
      }
    }

    const finalImageData = new ImageData(output, w, h);
    ctx.putImageData(finalImageData, 0, 0);
  } else {
    ctx.putImageData(imageData, 0, 0);
  }

  console.log(`[TimetableScanner] Preprocessed: ${img.width}x${img.height} → ${canvas.width}x${canvas.height} (${scale.toFixed(1)}x upscale, binarize=${binarize})`);

  return canvas.toDataURL("image/png");
}

/**
 * Simple box blur for unsharp mask. Returns the blurred pixel array.
 */
function applyBoxBlur(ctx, width, height, radius) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });

  // Copy current canvas
  tempCtx.drawImage(ctx.canvas, 0, 0);
  const srcData = tempCtx.getImageData(0, 0, width, height);
  const src = srcData.data;
  const dst = new Uint8ClampedArray(src.length);

  const kernelSize = radius * 2 + 1;
  const kernelArea = kernelSize * kernelSize;

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let kx = -radius; kx <= radius; kx++) {
        const sx = Math.max(0, Math.min(width - 1, x + kx));
        sum += src[(y * width + sx) * 4];
      }
      dst[(y * width + x) * 4] = sum / kernelSize;
    }
  }

  // Vertical pass
  const final = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ky = -radius; ky <= radius; ky++) {
        const sy = Math.max(0, Math.min(height - 1, y + ky));
        sum += dst[(sy * width + x) * 4];
      }
      final[(y * width + x) * 4] = sum / kernelSize;
      final[(y * width + x) * 4 + 1] = final[(y * width + x) * 4];
      final[(y * width + x) * 4 + 2] = final[(y * width + x) * 4];
      final[(y * width + x) * 4 + 3] = 255;
    }
  }

  return final;
}

// ===================== PUBLIC API =====================

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Main entry point: scan a timetable image file using Tesseract.js spatial clustering.
 *
 * @param {File} file — the image file to scan
 * @param {function} [onProgress] — optional progress callback (0-100)
 * @returns {Promise<TimetablePreviewResponse>} — same shape as backend response
 */
export async function scanTimetableImage(file, onProgress) {
  // Validate file
  const maxSize = 15 * 1024 * 1024; // 15MB
  if (file.size > maxSize) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 15MB.`);
  }

  const rawImageUrl = await fileToDataUrl(file);

  // Multi-pass OCR strategy:
  // Pass 0: Raw image (no preprocessing) — best for clean digital screenshots
  // Pass 1: Grayscale + sharpen — for slightly degraded images
  // Pass 2: Full binarization — for blurry camera photos
  // We stop as soon as we find enough day+time anchors.

  const passes = [
    { name: "raw", url: rawImageUrl, preprocess: false },
    { name: "clean", binarize: false },
    { name: "binarized", binarize: true },
  ];

  let bestWords = [];
  let bestDayCount = 0;
  let bestTimeCount = 0;
  const progressPerPass = 30; // each pass gets ~30% of the progress bar

  for (let p = 0; p < passes.length; p++) {
    const pass = passes[p];
    const pStart = p * progressPerPass;

    let imageUrl;
    if (pass.url) {
      // Raw pass — use original image directly
      imageUrl = pass.url;
      console.log(`[TimetableScanner] Pass ${p} (${pass.name}): using raw image...`);
    } else {
      // Preprocessed pass
      console.log(`[TimetableScanner] Pass ${p} (${pass.name}): preprocessing...`);
      if (onProgress) onProgress(pStart + 2);
      imageUrl = await preprocessImage(rawImageUrl, pass.binarize);
    }

    if (onProgress) onProgress(pStart + 5);
    console.log(`[TimetableScanner] Pass ${p} (${pass.name}): running Tesseract...`);
    const words = await runOCR(imageUrl, onProgress, pStart + 5, pStart + progressPerPass);

    // Count anchors
    let dayCount = 0, timeCount = 0;
    for (const w of words) {
      if (resolveDay(w.text) && w.text.replace(/[^A-Za-z]/g, "").length >= 3) dayCount++;
      if (looksLikeTime(w.text)) timeCount++;
    }

    // Debug: log ALL words so we can see what Tesseract reads
    console.log(`[TimetableScanner] Pass ${p} (${pass.name}) results: ${words.length} words, ${dayCount} days, ${timeCount} times`);
    console.log(`[TimetableScanner] Pass ${p} ALL words:`, words.map(w => `"${w.text}" (conf=${w.confidence.toFixed(0)}, x=${w.cx.toFixed(0)}, y=${w.cy.toFixed(0)})`));

    // Keep the best result
    if ((dayCount + timeCount) > (bestDayCount + bestTimeCount)) {
      bestWords = words;
      bestDayCount = dayCount;
      bestTimeCount = timeCount;
      console.log(`[TimetableScanner] Pass ${p} (${pass.name}) is the new best.`);
    }

    // If we found enough anchors, stop early
    if (bestDayCount >= 3 && bestTimeCount >= 3) {
      console.log(`[TimetableScanner] Sufficient anchors found. Skipping remaining passes.`);
      break;
    }
  }

  if (onProgress) onProgress(92);

  if (bestDayCount === 0 || bestTimeCount === 0) {
    // Last resort: dump what we found for debugging
    console.error("[TimetableScanner] FAILED — no day or time anchors found in any pass.");
    console.error("[TimetableScanner] All words from best pass:", bestWords.map(w => w.text));
    throw new Error(
      "Could not identify Day headers or Time slots in this image. " +
      "Please ensure the timetable has clear day names (Mon–Sun) and time values (e.g. 9:00, 10:30). " +
      "Check the browser console (F12) for detailed OCR debug output."
    );
  }

  // Extract legend before grid building
  const legend = extractLegendFromWords(bestWords);
  console.log("[TimetableScanner] Legend:", legend);

  // Build grid
  const { cellMap, dayBands, timeBands } = buildGridFromWords(bestWords);

  // Build slots from cells
  let slots = buildSlotsFromCellMap(cellMap, timeBands);

  // Apply legend to expand abbreviations
  applyLegend(slots, legend);

  // Deduplicate
  slots = deduplicateSlots(slots);

  // Sort by day order then start time
  slots.sort((a, b) => {
    const dayDiff = DAYS_ORDER.indexOf(a.dayOfWeek) - DAYS_ORDER.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return (a.startTime || "").localeCompare(b.startTime || "");
  });

  if (slots.length === 0) {
    throw new Error(
      "Could not extract any timetable entries from the grid. " +
      "Ensure the image contains recognizable day names (Mon-Sat) and time slots."
    );
  }

  // Build response matching backend TimetablePreviewResponse
  const detectedDays = [...new Set(slots.map(s => s.dayOfWeek))];
  const detectedTimes = [...new Set(timeBands.map(b => b.label))];
  const allGroups = new Set();
  for (const s of slots) {
    if (s.groupInfo) {
      const gMatches = s.groupInfo.match(/[A-Z]\d+/g);
      if (gMatches) gMatches.forEach(g => allGroups.add(g));
      else allGroups.add(s.groupInfo);
    }
  }

  if (onProgress) onProgress(100);
  console.log(`[TimetableScanner] Extracted ${slots.length} slots across ${detectedDays.length} days`);

  return {
    slots,
    detectedDays,
    detectedTimes,
    availableGroups: [...allGroups].sort(),
  };
}

/**
 * Helper: Run Tesseract OCR on a processed image URL using v7 API.
 * Returns normalized word array.
 */
async function runOCR(imageUrl, onProgress, progressStart, progressEnd) {
  // Use createWorker from v7 to request explicit output formats
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        const mapped = progressStart + Math.round((m.progress || 0) * (progressEnd - progressStart));
        onProgress(mapped);
      }
    },
  });

  // Pass output: { blocks: true } as the 3rd argument to extract words in v7
  const result = await worker.recognize(imageUrl, {}, { blocks: true });
  await worker.terminate();

  const ocrWords = [];
  if (result.data.blocks) {
    result.data.blocks.forEach(block => {
      block.paragraphs?.forEach(para => {
        para.lines?.forEach(line => {
          line.words?.forEach(w => ocrWords.push(w));
        });
      });
    });
  }

  console.log(`[TimetableScanner] Tesseract raw: ${ocrWords.length} words, full text preview:`, result.data.text?.substring(0, 500));

  // Very low confidence threshold — we rely on spatial clustering
  // and fuzzy matching to handle noisy words, so let more through
  return ocrWords
    .filter(w => w.text && w.text.trim().length > 0 && w.confidence > 5)
    .map(w => ({
      text: w.text.trim(),
      confidence: w.confidence,
      bbox: w.bbox,
      cx: (w.bbox.x0 + w.bbox.x1) / 2,
      cy: (w.bbox.y0 + w.bbox.y1) / 2,
    }));
}
