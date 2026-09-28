import Tesseract from 'tesseract.js';

/**
 * OCRResult captures what was read from the portal screenshot.
 *
 * IMPORTANT semantic distinction:
 *   attended     = portal attended (EXCLUDES duty leave)
 *   dl           = duty leave count from portal
 *   effectiveAttended (derived, NOT stored) = attended + dl
 *
 * This maps directly to the university portal layout:
 *   Delivered / Attended / Absent / DL / Percentage
 */
export interface OCRResult {
  code: string;
  name: string;
  delivered: number;
  attended: number;  // portal attended ?? does NOT include DL
  dl: number;        // duty leave from portal
  dataAsOf: string | null;
  confidence: number;
  needsReview: boolean; // true when OCR cannot be trusted; user must verify manually
  /** Debug: raw label&rarr;value associations extracted before validation */
  _debug?: OCRDebugInfo;
}

export interface OCRDebugInfo {
  rawLabelMatches: { label: string; value: number; x: number; y: number }[];
  validationErrors: string[];
}

interface TesseractWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TesseractLine {
  words?: TesseractWord[];
}

interface TesseractParagraph {
  lines?: TesseractLine[];
}

interface TesseractBlock {
  paragraphs?: TesseractParagraph[];
}

// ---------------------------------------------------------------------------
// Label synonyms - university portals use varying terminology
// ---------------------------------------------------------------------------
type LabelKind = 'delivered' | 'attended' | 'absent' | 'dl' | 'percentage';

const LABEL_MAP: Record<string, LabelKind> = {
  // Delivered / held
  delivered:  'delivered',
  total:      'delivered',
  held:       'delivered',
  classes:    'delivered',
  // Attended / present
  attended:   'attended',
  present:    'attended',
  // Absent
  absent:     'absent',
  missed:     'absent',
  // Duty Leave
  dl:         'dl',
  duty:       'dl',
  leave:      'dl',
  // Percentage
  percentage: 'percentage',
  percent:    'percentage',
  attendance: 'percentage',
};

function classifyLabel(word: string): LabelKind | null {
  const n = word.toLowerCase().replace(/[^a-z]/g, '');
  return LABEL_MAP[n]?? null;
}

// ---------------------------------------------------------------------------
// Number extraction - strict guards
// ---------------------------------------------------------------------------
function isDateLike(text: string): boolean {
  if (/\d{2,4}[-/.]\d{2}[-/.]\d{2,4}/.test(text)) return true;
  if (/\d{1,2}:\d{2}/.test(text)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) return true;
  return false;
}

function isYearLike(text: string): boolean {
  return /\b20[0-9]{2}\b/.test(text);
}

/** Extract a valid attendance integer, or null. */
function extractInt(text: string): number | null {
  const t = text.trim();
  if (!t || isDateLike(t) || isYearLike(t)) return null;
  if (!/^\d+$/.test(t)) return null;          // must be purely numeric
  if (t.length > 3) return null;              // > 3 digits = not an attendance count
  const val = parseInt(t, 10);
  if (val < 0 || val > 999) return null;
  return val;
}

/** Extract a valid percentage value, or null. */
function extractPct(text: string): number | null {
  const t = text.trim();
  const m = t.match(/^(\d{1,3}(?:\.\d{1,2})-)%-$/)?? t.match(/(\d{1,3}(?:\.\d{1,2})-)%/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return (v >= 0 && v <= 100) ? v : null;
}

// ---------------------------------------------------------------------------
// Spatial helpers
// ---------------------------------------------------------------------------
function cx(w: TesseractWord): number { return (w.bbox.x0 + w.bbox.x1) / 2; }
function cy(w: TesseractWord): number { return (w.bbox.y0 + w.bbox.y1) / 2; }

/**
 * Given a label word, find the associated numeric value.
 *
 * THE CRITICAL FIX:
 * The Chalkpad mobile layout is "Label : Value" on the SAME ROW.
 * The next label+value pair is on the next row directly below.
 *
 * Old bug: "Attended : 14" + "Absent : 8" ?? the distance from the
 * "Attended" label to "8" (next row, short word) was LESS than to "14"
 * (same row but further right) because Euclidean distance penalized
 * the horizontal gap to 14 less than expected.
 *
 * Fix: Same-row candidates (|dy| <= 1.5 * rowHeight, wx > lx) are
 * collected separately and ALWAYS win over below-row candidates.
 * Below-row is only used as a last resort when no same-row number exists.
 *
 * Also: colon/dash tokens between label and value are explicitly skipped.
 */
function findNearestNumber(
  label: TesseractWord,
  words: TesseractWord[],
  kind: 'int' | 'pct',
  maxDist = 500,
): { word: TesseractWord; value: number } | null {
  const lx = cx(label);
  const ly = cy(label);
  const rowH = Math.max(label.bbox.y1 - label.bbox.y0, 16);

  let sameRowBest: { word: TesseractWord; value: number; dist: number } | null = null;
  let belowBest:   { word: TesseractWord; value: number; dist: number } | null = null;

  for (const w of words) {
    if (w === label) continue;

    // Skip colon / punctuation-only tokens (e.g. ":" between "Attended" and "14")
    if (/^[:\-\u2013\u2014|.]+$/.test(w.text.trim())) continue;

    const wx = cx(w);
    const wy = cy(w);
    const dy = wy - ly;
    const dx = wx - lx;

    const val = kind === 'int' ? extractInt(w.text) : extractPct(w.text);
    if (val === null) continue;

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) continue;

    // Same-row: within 1.5 row-heights vertically, and to the RIGHT of the label
    const onSameRow    = Math.abs(dy) <= rowH * 1.5 && dx > 0;
    // Below-row: strictly below, within narrow horizontal band
    const directlyBelow = dy > rowH * 1.5 && dy <= maxDist * 0.8 && Math.abs(dx) <= 120;

    if (onSameRow) {
      if (!sameRowBest || dist < sameRowBest.dist) {
        sameRowBest = { word: w, value: val, dist };
      }
    } else if (directlyBelow) {
      if (!belowBest || dist < belowBest.dist) {
        belowBest = { word: w, value: val, dist };
      }
    }
  }

  // Same-row ALWAYS wins over below-row
  const best = sameRowBest?? belowBest;
  return best ? { word: best.word, value: best.value } : null;
}

// ---------------------------------------------------------------------------
// Subject matching
// ---------------------------------------------------------------------------
const normStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function matchSubject(
  word: TesseractWord,
  expectedSubjects: { code: string; name: string }[],
): { code: string; name: string } | null {
  const t = normStr(word.text);
  if (!t || t.length < 2) return null;
  for (const sub of expectedSubjects) {
    if (normStr(sub.code) === t) return sub;
    if (normStr(sub.name) === t) return sub;
    if (normStr(sub.code).length >= 2 && t.includes(normStr(sub.code))) return sub;
    if (t.length >= 4 && normStr(sub.name).includes(t)) return sub;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core parser - label-anchored, spatially-aware
// ---------------------------------------------------------------------------

interface SubjectAnchor {
  subject: { code: string; name: string };
  word: TesseractWord;
}

function parseBlocks(
  blocks: TesseractBlock[],
  expectedSubjects?: { code: string; name: string }[],
): OCRResult[] {
  if (!blocks) return [];

  // 1. Flatten all words
  const allWords: TesseractWord[] = [];
  blocks.forEach((block) => {
    block.paragraphs?.forEach((para) => {
      para.lines?.forEach((line) => {
        line.words?.forEach((word) => { allWords.push(word); });
      });
    });
  });

  allWords.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

  if (allWords.length === 0) return [];

  // 2. Find subject anchors
  const anchors: SubjectAnchor[] = [];
  if (expectedSubjects && expectedSubjects.length > 0) {
    for (const word of allWords) {
      const sub = matchSubject(word, expectedSubjects);
      if (sub && !anchors.find(a => a.subject.code === sub.code)) {
        anchors.push({ word, subject: sub });
      }
    }
  }

  if (anchors.length === 0) return [];

  // 3. Define per-subject regions (vertically bounded)
  const results: OCRResult[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const { word: anchor, subject } = anchors[i];
    const anchorTop = anchor.bbox.y0;
    const nextTop   = i + 1 < anchors.length ? anchors[i + 1].word.bbox.y0 : anchorTop + 600;

    const regionWords = allWords.filter(w =>
      w.bbox.y0 >= anchorTop && w.bbox.y0 < nextTop
    );

    // 4. Find label&rarr;value associations within the region
    const debugInfo: OCRDebugInfo = {
      rawLabelMatches: [],
      validationErrors: [],
    };

    const fieldValues: Partial<Record<LabelKind, { value: number; conf: number }>> = {};

    for (const word of regionWords) {
      const kind = classifyLabel(word.text);
      if (!kind) continue;

      const numKind = kind === 'percentage' ? 'pct' : 'int';
      const found   = findNearestNumber(word, regionWords, numKind);
      if (!found) continue;

      debugInfo.rawLabelMatches.push({
        label: word.text,
        value: found.value,
        x: Math.round(cx(found.word)),
        y: Math.round(cy(found.word)),
      });

      const existing = fieldValues[kind];
      if (!existing || found.word.confidence > existing.conf) {
        fieldValues[kind] = { value: found.value, conf: found.word.confidence };
      }
    }

    // 5. Validate
    const delivered = fieldValues['delivered']?.value?? null;
    const attended  = fieldValues['attended']?.value?? null;
    const dl        = fieldValues['dl']?.value?? 0;
    const absent    = fieldValues['absent']?.value?? null;
    const pct       = fieldValues['percentage']?.value?? null;

    const errors: string[] = [];
    let needsReview = false;

    if (delivered === null) { errors.push('delivered not found'); needsReview = true; }
    if (attended  === null) { errors.push('attended not found');  needsReview = true; }

    if (delivered !== null && attended !== null) {
      if (attended > delivered) {
        errors.push(`attended(${attended}) > delivered(${delivered})`);
        needsReview = true;
      }
      if (dl > 0 && (attended + dl) > delivered) {
        errors.push(`attended+dl(${attended+dl}) > delivered(${delivered})`);
        needsReview = true;
      }
      if (absent !== null) {
        const sum = attended + absent + dl;
        if (Math.abs(sum - delivered) > 1) {
          errors.push(`attended+absent+dl(${sum}) != delivered(${delivered})`);
          // soft warning only - portal may have rounding
        }
      }
      if (pct !== null && delivered > 0) {
        const eff = attended + dl;
        const computed = (eff / delivered) * 100;
        if (Math.abs(computed - pct) > 2.0) {
          errors.push(`pct mismatch: computed ${computed.toFixed(2)}% vs OCR ${pct.toFixed(2)}%`);
          needsReview = true;
        }
      }
    }

    debugInfo.validationErrors = errors;
    console.debug('[OCR]', subject.code, {
      delivered, attended, dl, absent, pct,
      labelMatches: debugInfo.rawLabelMatches,
      errors,
    });

    if (delivered === null || attended === null) {
      results.push({
        code: subject.code, name: subject.name,
        delivered: 0, attended: 0, dl: 0,
        dataAsOf: null, confidence: 0,
        needsReview: true, _debug: debugInfo,
      });
      continue;
    }

    const confs = Object.values(fieldValues).map(f => f!.conf);
    const avgConf = confs.length > 0 ? confs.reduce((s, c) => s + c, 0) / confs.length : 50;

    results.push({
      code: subject.code, name: subject.name,
      delivered,
      attended,   // portal attended ?? portal excludes DL
      dl,
      dataAsOf: null,
      confidence: needsReview ? Math.min(avgConf, 50) : avgConf,
      needsReview,
      _debug: debugInfo,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const scanChalkpad = async (
  image: File | Blob | string,
  onProgress: (m: { status: string; progress: number }) => void,
  expectedSubjects?: { code: string; name: string }[],
): Promise<OCRResult[]> => {
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: m => onProgress(m),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ret = await worker.recognize(image, {}, { blocks: true } as any);
  await worker.terminate();

  if (ret.data.blocks) {
    return parseBlocks(ret.data.blocks, expectedSubjects);
  }

  return [];
};
