// Report name suggestions from the impression, offered when a report is
// saved. Runs locally; report text never leaves the browser.
import { impressionLines } from "./template-combine.js?v=20261022-report-name";

const MAX_PHRASE = 70;
const LEADING_FILLER = [
  /^(?:the\s+)?(?:findings?|appearances?|features?|imaging findings?)\s+(?:are|is)\s+/i,
  /^(?:there\s+(?:is|are)\s+)/i,
  /^(?:most\s+|more\s+)?(?:likely|probably|possibly)\s+(?:to\s+be\s+|representing\s+)?/i,
  /^(?:highly\s+|most\s+)?(?:consistent|compatible)\s+with\s+/i,
  /^(?:highly\s+|most\s+)?suggestive\s+of\s+/i,
  /^in\s+keeping\s+with\s+/i,
  /^(?:an?)\s+(?=\S)/i
];

// "1. Findings are most likely consistent with acute appendicitis, without
// perforation." -> "Acute appendicitis"
export function impressionPhrase(text) {
  let phrase = String(text || "").trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const before = phrase;
    LEADING_FILLER.forEach(pattern => { phrase = phrase.replace(pattern, ""); });
    if (phrase === before) break;
  }
  phrase = phrase.split(/(?<=\S)\.\s+(?=[A-Z])/)[0];
  phrase = phrase.replace(/[\s.;:,]+$/, "");
  if (phrase.length > MAX_PHRASE) {
    const clause = phrase.slice(0, MAX_PHRASE + 1).match(/^(.{15,}?)[,;(]/);
    if (clause) phrase = clause[1];
    else phrase = phrase.slice(0, MAX_PHRASE + 1).replace(/\s+\S*$/, "");
    phrase = phrase.replace(/[\s,;:(-]+$/, "");
  }
  return phrase ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : "";
}

function sameName(left, right) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

// Best first. The current title (from the template) leads when it names the
// exam, so the suggestions read "CT Brain - Acute left MCA infarct".
export function suggestReportNames(html, currentTitle = "") {
  const phrases = impressionLines(html).map(impressionPhrase).filter(Boolean);
  if (!phrases.length) return [];
  // A title saved earlier as "Exam - impression" keeps only its exam part.
  const exam = String(currentTitle || "").split(" - ")[0].trim();
  const hasExam = exam && !/^untitled/i.test(exam) && !phrases.some(phrase => sameName(exam, phrase));
  const lead = phrases[0];
  const pair = phrases.length > 1 ? `${mainClause(lead)}, ${lowerFirst(mainClause(phrases[1]))}` : "";
  const names = [
    hasExam ? `${exam} - ${lead}` : "",
    hasExam && pair ? `${exam} - ${pair}` : "",
    lead,
    pair
  ].filter(Boolean);
  return names.filter((name, index) => names.findIndex(other => sameName(other, name)) === index).map(name => name.slice(0, 300));
}

// "Acute infarct, with hemorrhagic transformation" -> "Acute infarct", so two
// impressions still fit in one name.
function mainClause(phrase) {
  return phrase.split(/\s*[,;]\s*/)[0];
}

// Keep "MCA infarct" as is, but "Old infarct" -> "old infarct".
function lowerFirst(phrase) {
  return /^[A-Z][a-z]/.test(phrase) ? phrase.charAt(0).toLowerCase() + phrase.slice(1) : phrase;
}

// No need to ask again when the title already names the main impression.
export function titleCoversImpression(title, html) {
  const lead = impressionLines(html).map(impressionPhrase).find(Boolean);
  return Boolean(lead) && String(title || "").toLowerCase().includes(lead.toLowerCase());
}
