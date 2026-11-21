// Search for Pawlet notes: matches note titles and text (Thai and English),
// same rules as the Work Log search. Every search word must appear as plain
// text; English words of 4+ letters also match a word that starts one typo
// away (two for 9+ letters). Thai has no spaces, so it matches as plain text.

import { normalizeSearchText, prefixWithin, typoAllowance } from "./report-search.js?v=20261121-glass-motion";

const WORD_RE = /[\p{L}\p{N}]+/gu;

export function searchTerms(query) {
  return [...new Set(normalizeSearchText(query).trim().split(" ").filter(Boolean))];
}

function noteBody(note) {
  const alts = (note.images || []).map(image => image?.alt || "").filter(Boolean).join(" ");
  return [note.text || "", alts].filter(Boolean).join("\n");
}

// Returns matches best first: [{ note, exact, inTitle, snippet }].
export function searchPawletNotes(notes, query) {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const results = [];
  for (const note of notes || []) {
    const title = normalizeSearchText(note.title);
    const body = normalizeSearchText(noteBody(note));
    const hay = `${title}\n${body}`;
    let words = null;
    let exact = true;
    let matched = true;
    for (const term of terms) {
      if (hay.includes(term)) continue;
      const k = typoAllowance(term);
      if (k) {
        if (!words) words = new Set(hay.match(WORD_RE) || []);
        let near = false;
        for (const word of words) {
          if (prefixWithin(term, word, k)) {
            near = true;
            break;
          }
        }
        if (near) {
          exact = false;
          continue;
        }
      }
      matched = false;
      break;
    }
    if (!matched) continue;
    const inTitle = terms.some(term => title.includes(term));
    results.push({ note, exact, inTitle, snippet: snippetFor(noteBody(note), terms) });
  }
  return results.sort((a, b) =>
    (b.exact - a.exact) ||
    (b.inTitle - a.inTitle) ||
    (a.note.y - b.note.y) ||
    (a.note.x - b.note.x));
}

// A short line of the note around the first match, or its first line.
export function snippetFor(text, terms) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const lower = flat.toLowerCase();
  let at = -1;
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index >= 0 && (at < 0 || index < at)) at = index;
  }
  if (at < 0) return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat;
  const start = Math.max(0, at - 30);
  const end = Math.min(flat.length, at + 70);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}

// Escaped HTML of `text` with each search word wrapped in <mark>.
export function markTerms(text, terms, escapeHtml) {
  const value = String(text || "");
  const lower = value.toLowerCase();
  const ranges = [];
  for (const term of terms) {
    let from = 0;
    while (term && from < lower.length) {
      const index = lower.indexOf(term, from);
      if (index < 0) break;
      ranges.push([index, index + term.length]);
      from = index + term.length;
    }
  }
  if (!ranges.length) return escapeHtml(value);
  ranges.sort((a, b) => a[0] - b[0]);
  let html = "";
  let pos = 0;
  for (const [start, end] of ranges) {
    if (end <= pos) continue;
    const from = Math.max(start, pos);
    html += escapeHtml(value.slice(pos, from)) + `<mark>${escapeHtml(value.slice(from, end))}</mark>`;
    pos = end;
  }
  return html + escapeHtml(value.slice(pos));
}
