// Prior report highlights (Report Writer "Prior" tab). The radiologist
// pastes a prior report from PACS; identifiers are removed here, in the
// browser, before anything is sent. GPT only picks sentence numbers for the
// highlighted original, so the original wording is never rewritten.
import { escapeHtml } from "./utils.js?v=20261120-prior-highlights";

export const PRIOR_KEY_PREFIX = "prior:";
export const PRIOR_TEXT_LIMIT = 24000;

// Header labels whose whole line is dropped ("HN: 1234", "Patient name - ...").
const IDENTIFIER_LABEL = new RegExp([
  "^\\s*(?:",
  [
    "patient(?:'s)?(?:\\s*name)?", "name", "pt\\.?\\s*name", "full\\s*name",
    "h\\.?\\s*n\\.?", "a\\.?\\s*n\\.?", "mrn", "medical\\s*record(?:\\s*(?:no\\.?|number))?",
    "accession(?:\\s*(?:no\\.?|number|#))?", "acc\\.?\\s*(?:no\\.?|#)?", "order\\s*(?:no\\.?|number|#)",
    "id", "patient\\s*id", "citizen\\s*id", "national\\s*id", "passport",
    "age", "sex", "gender", "age\\s*/\\s*sex", "dob", "d\\.o\\.b\\.?", "date\\s*of\\s*birth", "birth\\s*date",
    "phone", "tel\\.?", "telephone", "mobile", "address",
    "ward", "bed", "room", "department", "dept\\.?",
    "physician", "referring(?:\\s*(?:physician|doctor|dr\\.?))?", "requested\\s*by", "request(?:ing)?\\s*(?:physician|doctor)",
    "ordering(?:\\s*(?:physician|doctor))?", "attending(?:\\s*(?:physician|doctor))?", "clinician",
    "radiologist", "reported\\s*by", "report(?:ing)?\\s*(?:radiologist|doctor)", "dictated\\s*by", "typed\\s*by",
    "signed(?:\\s*by)?", "verified\\s*by", "approved\\s*by", "read\\s*by", "interpreted\\s*by", "resident", "staff",
    "electronically\\s*signed(?:\\s*by)?",
    "ชื่อ(?:\\s*-?\\s*สกุล)?", "ชื่อผู้ป่วย", "นามสกุล", "เลขที่?\\s*(?:ประจำตัว|บัตร)\\S*", "เพศ", "อายุ", "วันเกิด",
    "แพทย์(?:\\S*)?", "ผู้ส่ง(?:ตรวจ)?", "ผู้รายงาน", "ผู้อ่าน(?:ผล)?", "หอผู้ป่วย", "เตียง", "โทร\\.?(?:ศัพท์)?", "ที่อยู่"
  ].join("|"),
  ")\\s*[:：#=\\-]"
].join(""), "i");

// The same labels in the middle of a line, e.g. "Age: 54  Sex: F  HN 123456".
// HN/AN are case-sensitive so "an 8 mm nodule" is left alone.
const INLINE_IDENTIFIER = /\b(?:HN|AN|MRN|Acc(?:ession)?\.?(?:\s*(?:No\.?|#))?)\s*[:：#=]?\s*[\w/.-]*\d[\w/.-]*/g;
const INLINE_AGE = /\b(?:Age|DOB|Sex|Gender)\s*[:：=]\s*[^\s,;]+/gi;
// Names after a title: "Dr. Somchai Jaidee", "นพ.สมชาย ใจดี", "Mrs. Smith".
// Case-sensitive, so the "MR" modality is not a title.
const ENGLISH_TITLE_NAME = /\b(?:Dr|Doctor|Prof|Mr|Mrs|Ms|Miss)\.?\s+[A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*){0,2}/g;
const THAI_TITLE_NAME = /(?:(?:ผศ|รศ|ศ)\.\s*)?(?:นพ\.|พญ\.|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)\s*[\u0E00-\u0E7F]+(?:\s+[\u0E00-\u0E7F]+)?/g;
// ID, accession and phone numbers. Measurements and dates ("2023-03-01",
// "12 x 10 mm") are short or have separators, so they stay.
const LONG_NUMBER = /(?<![\d.\/-])(?:[A-Z]{1,4})?\d{7,}(?![\d.\/-])/g;
const PHONE = /(?<![\d.\/-])0\d{1,2}[- ]\d{3}[- ]\d{3,4}(?![\d.\/-])/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

// Returns { text, removed } where removed counts what was taken out.
export function cleanPriorText(raw) {
  let removed = 0;
  const lines = String(raw || "")
    .replace(/\r/g, "")
    .replace(/ /g, " ")
    .split("\n")
    .filter(line => {
      if (IDENTIFIER_LABEL.test(line)) {
        removed += 1;
        return false;
      }
      return true;
    })
    .map(line => {
      let clean = line;
      [INLINE_IDENTIFIER, INLINE_AGE, ENGLISH_TITLE_NAME, THAI_TITLE_NAME, EMAIL, PHONE, LONG_NUMBER].forEach(pattern => {
        clean = clean.replace(pattern, () => {
          removed += 1;
          return "[removed]";
        });
      });
      return clean.replace(/[ \t]+$/g, "");
    });
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, PRIOR_TEXT_LIMIT);
  return { text, removed };
}

// Splits the cleaned text into numbered sentences, keeping line breaks so the
// original layout can be shown again. A new sentence starts after ". " or
// "; " when the next word starts with a capital, digit or bracket, so "8.5 mm"
// and "e.g. the" stay whole.
export function priorSentences(text) {
  const sentences = [];
  String(text || "").split("\n").forEach((line, lineIndex) => {
    if (!line.trim()) {
      sentences.push({ n: 0, text: "", lineIndex, blank: true });
      return;
    }
    const parts = line.split(/(?<=[.;])\s+(?=[A-Z0-9(\-฀-๿])/).reduce((joined, part) => {
      // Keep list numbers ("1.", "a)") with the sentence that follows them.
      if (joined.length && /^\s*(?:\d{1,2}|[a-z])[.)]$/i.test(joined[joined.length - 1])) joined[joined.length - 1] += ` ${part}`;
      else joined.push(part);
      return joined;
    }, []);
    parts.forEach((part, partIndex) => {
      sentences.push({ n: 0, text: part, lineIndex, newLine: partIndex === 0 });
    });
  });
  let n = 0;
  sentences.forEach(sentence => {
    if (!sentence.blank && /[\p{L}\p{N}]/u.test(sentence.text)) sentence.n = ++n;
  });
  return sentences;
}

export const PRIOR_PROMPT = [
  "You help a radiologist read a patient's PRIOR radiology report(s) before comparing them with today's images.",
  "Prior reports are often written by others and can be long or poorly organized. Pull out what matters for the comparison.",
  "The input has numbered sentences like [12]. There may be several prior reports pasted together; use the exam names and dates in the text to tell them apart.",
  "",
  "Return:",
  "- keyFindings: every positive or important finding, most important first. Each is a short phrase in standard radiology terms with location, laterality and size when given (e.g. \"RUL nodule 8 mm\", \"Segment 7 hepatic cyst 1.2 cm\", \"s/p right nephrectomy\"). date: the exam date or exam name it came from if the text says so, else \"\". sentences: the numbers it came from.",
  "- toCheck: things to look at on today's images: measurements to compare, recommended follow-up, indeterminate or suspicious findings, lines/tubes/post-op changes. Short phrases. Empty if none.",
  "- changes: only when the same finding appears in more than one prior, how it changed, e.g. \"RUL nodule 8 → 11 mm (2023 → 2024)\". Empty otherwise.",
  "- keySentences: numbers of every sentence that states a positive or important finding, recommendation or measurement.",
  "- normalSentences: numbers of sentences that are only normal or negative statements (e.g. \"No pleural effusion.\").",
  "",
  "Rules:",
  "- Use only facts in the text. Never invent sizes, dates or findings. Keep important uncertainty short (\"possible\", \"indeterminate\").",
  "- Leave out normal findings, technique, and boilerplate from keyFindings.",
  "- If today's exam is given, put findings relevant to that body region first, but keep other important findings too.",
  "- If the prior is entirely normal, keyFindings is empty.",
  "- Never include names, HN, ID numbers or other identifiers; text marked [removed] was removed on purpose."
].join("\n");

export const PRIOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    keyFindings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          finding: { type: "string" },
          date: { type: "string" },
          sentences: { type: "array", items: { type: "integer" } }
        },
        required: ["finding", "date", "sentences"]
      }
    },
    toCheck: { type: "array", items: { type: "string" } },
    changes: { type: "array", items: { type: "string" } },
    keySentences: { type: "array", items: { type: "integer" } },
    normalSentences: { type: "array", items: { type: "integer" } }
  },
  required: ["keyFindings", "toCheck", "changes", "keySentences", "normalSentences"]
};

export function priorInput(text, examTitle) {
  const numbered = priorSentences(text)
    .filter(sentence => sentence.n)
    .map(sentence => `[${sentence.n}] ${sentence.text.trim()}`)
    .join("\n");
  return `Today's exam: ${String(examTitle || "").trim() || "(not given)"}\n\nPrior report(s):\n${numbered}`;
}

const cleanList = (items, max = 300) => (Array.isArray(items) ? items : [])
  .map(item => String(item || "").replace(/\s+/g, " ").trim().slice(0, max))
  .filter(Boolean)
  .slice(0, 40);

const cleanNumbers = (items, last) => [...new Set((Array.isArray(items) ? items : [])
  .map(Number)
  .filter(n => Number.isInteger(n) && n >= 1 && n <= last))];

// Keeps only well-formed parts of the answer (also used for saved values).
export function normalizePriorResult(output, text) {
  if (!output || typeof output !== "object") return null;
  const last = priorSentences(text).reduce((max, sentence) => Math.max(max, sentence.n), 0);
  const keyFindings = (Array.isArray(output.keyFindings) ? output.keyFindings : [])
    .map(item => ({
      finding: String(item?.finding || "").replace(/\s+/g, " ").trim().slice(0, 300),
      date: String(item?.date || "").replace(/\s+/g, " ").trim().slice(0, 80),
      sentences: cleanNumbers(item?.sentences, last)
    }))
    .filter(item => item.finding)
    .slice(0, 40);
  const keySentences = cleanNumbers(output.keySentences, last);
  keyFindings.forEach(item => item.sentences.forEach(n => {
    if (!keySentences.includes(n)) keySentences.push(n);
  }));
  return {
    keyFindings,
    toCheck: cleanList(output.toCheck),
    changes: cleanList(output.changes),
    keySentences,
    normalSentences: cleanNumbers(output.normalSentences, last).filter(n => !keySentences.includes(n))
  };
}

// The cleaned original with key sentences marked and normal ones faded.
export function priorOriginalHtml(text, result) {
  const key = new Set(result?.keySentences || []);
  const normal = new Set(result?.normalSentences || []);
  let html = "";
  let lineOpen = false;
  priorSentences(text).forEach(sentence => {
    if (sentence.blank) {
      if (lineOpen) html += "</p>";
      html += '<p class="prior-blank"></p>';
      lineOpen = false;
      return;
    }
    if (sentence.newLine) {
      if (lineOpen) html += "</p>";
      html += "<p>";
      lineOpen = true;
    } else {
      html += " ";
    }
    const body = escapeHtml(sentence.text).replace(/\[removed\]/g, '<span class="prior-removed" title="Removed before sending">[removed]</span>');
    const kind = key.has(sentence.n) ? "prior-key" : normal.has(sentence.n) ? "prior-normal" : "";
    html += sentence.n
      ? `<span class="prior-sentence ${kind}" data-prior-sentence="${sentence.n}">${body}</span>`
      : body;
  });
  if (lineOpen) html += "</p>";
  return html;
}

function listHtml(items, render) {
  return `<ul>${items.map(render).join("")}</ul>`;
}

// Summary sections shown above the original.
export function priorSummaryHtml(result) {
  if (!result) return "";
  const sections = [];
  sections.push(`<section class="prior-section prior-findings">
    <h3>Key findings</h3>
    ${result.keyFindings.length
      ? listHtml(result.keyFindings, item => `<li class="prior-finding" data-prior-jump="${item.sentences.join(",")}" title="Show in the prior">${escapeHtml(item.finding)}${item.date ? ` <span class="prior-date">${escapeHtml(item.date)}</span>` : ""}</li>`)
      : '<p class="prior-none">No positive findings. The prior reads as normal.</p>'}
  </section>`);
  if (result.toCheck.length) {
    sections.push(`<section class="prior-section prior-check">
      <h3>Check today</h3>
      ${listHtml(result.toCheck, item => `<li>${escapeHtml(item)}</li>`)}
    </section>`);
  }
  if (result.changes.length) {
    sections.push(`<section class="prior-section prior-changes">
      <h3>Changes between priors</h3>
      ${listHtml(result.changes, item => `<li>${escapeHtml(item)}</li>`)}
    </section>`);
  }
  return sections.join("");
}

export function priorSettingsValue(prior) {
  return {
    version: 1,
    text: String(prior.text || "").slice(0, PRIOR_TEXT_LIMIT),
    result: prior.result || null,
    removed: Number(prior.removed) || 0,
    highlightedAt: prior.highlightedAt || ""
  };
}

export function priorFromValue(value) {
  const text = String(value?.text || "").slice(0, PRIOR_TEXT_LIMIT);
  if (!text.trim()) return null;
  return {
    text,
    result: normalizePriorResult(value.result, text),
    removed: Number(value.removed) || 0,
    highlightedAt: String(value.highlightedAt || "").slice(0, 40)
  };
}
