// In-memory search index over every saved report, for the Work Log search box.
// Lives only in memory (reports are patient data and are never cached to disk).
//
// Matching per search word, like ripgrep: a plain substring of the report text
// is an exact match. Words of 4+ letters also match report words that start
// with something a typo away (1 edit, 2 for words of 9+ letters), so
// "mucocel" or "mucocle" still finds "mucocele". Every word must match.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

// Cheap HTML-to-text for indexing thousands of reports (no DOM parsing).
export function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, code) => {
      if (code[0] === "#") {
        const num = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(num) ? String.fromCodePoint(num) : " ";
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    });
}

export function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

const WORD_RE = /[\p{L}\p{N}]+/gu;

export function createReportIndex() {
  return { entries: new Map(), vocab: new Map() };
}

export function indexSize(index) {
  return index.entries.size;
}

export function indexedReports(index) {
  return Array.from(index.entries.values(), entry => entry.report);
}

export function getIndexedReport(index, id) {
  return index.entries.get(id)?.report || null;
}

// Adds or replaces one report. `text` is everything searchable about it.
export function upsertReport(index, report, text) {
  removeReport(index, report.id);
  const hay = normalizeSearchText(text);
  const words = new Set(hay.match(WORD_RE) || []);
  index.entries.set(report.id, { report, hay, words });
  for (const word of words) {
    let ids = index.vocab.get(word);
    if (!ids) index.vocab.set(word, ids = new Set());
    ids.add(report.id);
  }
}

export function removeReport(index, id) {
  const entry = index.entries.get(id);
  if (!entry) return;
  for (const word of entry.words) {
    const ids = index.vocab.get(word);
    if (!ids) continue;
    ids.delete(id);
    if (!ids.size) index.vocab.delete(word);
  }
  index.entries.delete(id);
}

export function typoAllowance(term) {
  if (term.length < 4 || !/^[\p{L}\p{N}]+$/u.test(term)) return 0;
  return term.length >= 9 ? 2 : 1;
}

// True when some prefix of `word` is within `k` edits of `term`
// (insert, delete, substitute, or swap two neighbouring letters).
const rows = [new Int32Array(64), new Int32Array(64), new Int32Array(64)];
export function prefixWithin(term, word, k) {
  const m = term.length;
  if (word.length < m - k) return false;
  const n = Math.min(word.length, m + k);
  if (n + 1 > rows[0].length) return false;
  let prev2 = rows[0];
  let prev = rows[1];
  let cur = rows[2];
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    cur[0] = i;
    let rowMin = i;
    const t = term.charCodeAt(i - 1);
    for (let j = 1; j <= n; j += 1) {
      const w = word.charCodeAt(j - 1);
      let value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (t === w ? 0 : 1));
      if (i > 1 && j > 1 && t === word.charCodeAt(j - 2) && term.charCodeAt(i - 2) === w) {
        value = Math.min(value, prev2[j - 2] + 1);
      }
      cur[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > k) return false;
    const spare = prev2;
    prev2 = prev;
    prev = cur;
    cur = spare;
  }
  for (let j = 0; j <= n; j += 1) if (prev[j] <= k) return true;
  return false;
}

// Returns { results: [{ report, exact }], terms, fuzzyWords }. `results` are
// in index order; the caller sorts. `extraText(id)` adds text kept outside the
// index (personal notes), matched as substrings only.
export function searchReports(index, query, { extraText } = {}) {
  const terms = [...new Set(normalizeSearchText(query).trim().split(" ").filter(Boolean))];
  if (!terms.length) return { results: [], terms, fuzzyWords: [] };
  const fuzzyWords = [];
  const perTerm = terms.map(term => {
    const k = typoAllowance(term);
    const fuzzy = new Set();
    if (k) {
      for (const [word, ids] of index.vocab) {
        if (word.includes(term) || !prefixWithin(term, word, k)) continue;
        fuzzyWords.push(word);
        for (const id of ids) fuzzy.add(id);
      }
    }
    return { term, fuzzy };
  });
  const results = [];
  for (const [id, entry] of index.entries) {
    let exact = true;
    let extra = null;
    let matched = true;
    for (const { term, fuzzy } of perTerm) {
      if (entry.hay.includes(term)) continue;
      if (extraText) {
        if (extra === null) extra = normalizeSearchText(extraText(id));
        if (extra && extra.includes(term)) continue;
      }
      if (fuzzy.has(id)) {
        exact = false;
        continue;
      }
      matched = false;
      break;
    }
    if (matched) results.push({ report: entry.report, exact });
  }
  return { results, terms, fuzzyWords };
}
