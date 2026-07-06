const CONFIG = window.PAWPLATE_CONFIG || {};
const POCKETBASE_URL = CONFIG.pocketbaseUrl || window.location.origin;
const API = `${POCKETBASE_URL.replace(/\/$/, "")}/api/collections`;
const AUTH_KEY = "pawplate.auth";
const PALETTE_KEY_PREFIX = "pawplate.palette.";
const THEME_KEY_PREFIX = "pawplate.theme.";
const DEFAULT_PALETTE = {
  text: ["#2b2526", "#8f4d57", "#7f5f3b", "#52654d"],
  highlight: ["#fff0a8", "#ffd4dc", "#dcefc8", "#efe2c3", "#d9edf0"]
};
const PROOFING_PATTERNS = [
  { pattern: /\bteh\b/gi, label: "teh", suggestion: "the" },
  { pattern: /\badn\b/gi, label: "adn", suggestion: "and" },
  { pattern: /\brecieved\b/gi, label: "recieved", suggestion: "received" },
  { pattern: /\bseperate\b/gi, label: "seperate", suggestion: "separate" },
  { pattern: /\boccured\b/gi, label: "occured", suggestion: "occurred" },
  { pattern: /\bassesment\b/gi, label: "assesment", suggestion: "assessment" },
  { pattern: /\bpersistance\b/gi, label: "persistance", suggestion: "persistence" },
  { pattern: /\bno evidences\b/gi, label: "no evidences", suggestion: "no evidence" },
  { pattern: /\bno significant abnormalities\b/gi, label: "no significant abnormality" },
  { pattern: /\bthere are no evidence\b/gi, label: "there are no evidence", suggestion: "there is no evidence" }
];

const state = {
  mode: "builder",
  auth: null,
  oldReports: [],
  oldFacetRecords: [],
  templateFacetRecords: [],
  templates: [],
  selectedOldReport: null,
  selectedTemplate: null,
  templateDraftId: null,
  workLogReports: []
};

const els = {
  loginView: document.getElementById("loginView"),
  loginForm: document.getElementById("loginForm"),
  loginEmailInput: document.getElementById("loginEmailInput"),
  loginPasswordInput: document.getElementById("loginPasswordInput"),
  loginError: document.getElementById("loginError"),
  appShell: document.getElementById("appShell"),
  logoutBtn: document.getElementById("logoutBtn"),
  builderModeBtn: document.getElementById("builderModeBtn"),
  writerModeBtn: document.getElementById("writerModeBtn"),
  worklogModeBtn: document.getElementById("worklogModeBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  builderView: document.getElementById("builderView"),
  writerView: document.getElementById("writerView"),
  worklogView: document.getElementById("worklogView"),
  oldSearchInput: document.getElementById("oldSearchInput"),
  oldModalityFilter: document.getElementById("oldModalityFilter"),
  oldTopicFilter: document.getElementById("oldTopicFilter"),
  oldBodyPartFilter: document.getElementById("oldBodyPartFilter"),
  oldTypeFilter: document.getElementById("oldTypeFilter"),
  oldDateFilter: document.getElementById("oldDateFilter"),
  oldInterestingFilter: document.getElementById("oldInterestingFilter"),
  oldReportList: document.getElementById("oldReportList"),
  oldPreviewTitle: document.getElementById("oldPreviewTitle"),
  oldPreviewText: document.getElementById("oldPreviewText"),
  useOldReportBtn: document.getElementById("useOldReportBtn"),
  newTemplateBtn: document.getElementById("newTemplateBtn"),
  saveTemplateBtn: document.getElementById("saveTemplateBtn"),
  useTemplateBtn: document.getElementById("useTemplateBtn"),
  templateTitleInput: document.getElementById("templateTitleInput"),
  templateModalityInput: document.getElementById("templateModalityInput"),
  templateTopicInput: document.getElementById("templateTopicInput"),
  templateTopicOptions: document.getElementById("templateTopicOptions"),
  templateBodyPartInput: document.getElementById("templateBodyPartInput"),
  templateBodyPartOptions: document.getElementById("templateBodyPartOptions"),
  templateKindRadios: [...document.querySelectorAll('input[name="templateKind"]')],
  templateTextEditor: document.getElementById("templateTextEditor"),
  templateProofing: document.getElementById("templateProofing"),
  templateSearchInput: document.getElementById("templateSearchInput"),
  templateModalityFilter: document.getElementById("templateModalityFilter"),
  templateTopicFilter: document.getElementById("templateTopicFilter"),
  templateBodyPartFilter: document.getElementById("templateBodyPartFilter"),
  templateTypeFilter: document.getElementById("templateTypeFilter"),
  templateList: document.getElementById("templateList"),
  reportTitleInput: document.getElementById("reportTitleInput"),
  reportModalityInput: document.getElementById("reportModalityInput"),
  reportTopicInput: document.getElementById("reportTopicInput"),
  reportTopicOptions: document.getElementById("reportTopicOptions"),
  reportBodyPartInput: document.getElementById("reportBodyPartInput"),
  reportBodyPartOptions: document.getElementById("reportBodyPartOptions"),
  reportKeywordInput: document.getElementById("reportKeywordInput"),
  reportNoteInput: document.getElementById("reportNoteInput"),
  reportInterestingInput: document.getElementById("reportInterestingInput"),
  reportTextEditor: document.getElementById("reportTextEditor"),
  reportProofing: document.getElementById("reportProofing"),
  copyReportBtn: document.getElementById("copyReportBtn"),
  saveReportBtn: document.getElementById("saveReportBtn"),
  worklogSearchInput: document.getElementById("worklogSearchInput"),
  worklogSummary: document.getElementById("worklogSummary"),
  worklogHeatmap: document.getElementById("worklogHeatmap"),
  worklogList: document.getElementById("worklogList"),
  interestingSearchInput: document.getElementById("interestingSearchInput"),
  interestingList: document.getElementById("interestingList"),
  contextMenu: document.getElementById("contextMenu"),
  toastStack: document.getElementById("toastStack")
};

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeFilter(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

function plainText(value) {
  const raw = String(value || "");
  if (!isHtml(raw)) return raw;
  const div = document.createElement("div");
  div.innerHTML = raw;
  return div.textContent || "";
}

function reportHtml(value) {
  const raw = String(value || "");
  return isHtml(raw) ? raw : escapeHtml(raw);
}

function getEditorHtml(editor) {
  return editor.innerHTML.trim();
}

function getEditorText(editor) {
  return editor.innerText.trim();
}

function setEditorHtml(editor, value) {
  editor.innerHTML = reportHtml(value);
  updateProofing(editor);
}

function editorTextNodeRanges(editor, matcher) {
  const ranges = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.nodeValue || "";
    matcher.lastIndex = 0;
    let match;
    while ((match = matcher.exec(text))) {
      const range = new Range();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      ranges.push(range);
    }
  }
  return ranges;
}

function proofingIssues(editor) {
  const text = editor.innerText || "";
  return PROOFING_PATTERNS.flatMap(item => {
    const matches = [...text.matchAll(new RegExp(item.pattern.source, item.pattern.flags))];
    return matches.map(match => ({
      label: match[0],
      suggestion: item.suggestion || item.label
    }));
  });
}

function updateProofing(editor) {
  if (!editor) return;
  const panel = editor === els.templateTextEditor ? els.templateProofing : els.reportProofing;
  if (window.CSS?.highlights) {
    const ranges = PROOFING_PATTERNS.flatMap(item => editorTextNodeRanges(editor, new RegExp(item.pattern.source, item.pattern.flags)));
    if (ranges.length) {
      CSS.highlights.set(`pawplate-${editor.id}`, new Highlight(...ranges));
    } else {
      CSS.highlights.delete(`pawplate-${editor.id}`);
    }
  }
  if (!panel) return;
  const issues = proofingIssues(editor);
  if (!issues.length) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }
  const unique = [...new Map(issues.map(issue => [issue.label.toLowerCase(), issue])).values()].slice(0, 6);
  panel.classList.remove("hidden");
  panel.innerHTML = unique.map(issue => (
    `<button type="button" title="Suggested: ${escapeHtml(issue.suggestion)}">${escapeHtml(issue.label)} -> ${escapeHtml(issue.suggestion)}</button>`
  )).join("");
}

function valuesFrom(records, field) {
  return [...new Set(records.map(item => item[field]).filter(Boolean))].sort();
}

function matching(records, filters) {
  return records.filter(item => (
    (!filters.modality || item.modality === filters.modality) &&
    (!filters.topic || item.topic === filters.topic)
  ));
}

function setDatalist(datalist, values) {
  datalist.innerHTML = values.map(value => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function updateEditorDatalists(prefix) {
  const records = prefix === "template" ? state.templateFacetRecords : state.oldFacetRecords;
  const modality = els[`${prefix}ModalityInput`]?.value || "";
  const topicInput = els[`${prefix}TopicInput`];
  const bodyInput = els[`${prefix}BodyPartInput`];
  const topicRecords = modality ? records.filter(item => item.modality === modality) : records;
  const topicValues = valuesFrom(topicRecords, "topic");
  const bodyRecords = matching(records, { modality, topic: topicInput.value });
  const bodyValues = valuesFrom(bodyRecords, "bodyPart");
  setDatalist(els[`${prefix}TopicOptions`], topicValues);
  setDatalist(els[`${prefix}BodyPartOptions`], bodyValues);
  if (topicInput.value && !topicValues.includes(topicInput.value)) topicInput.value = "";
  if (bodyInput.value && !bodyValues.includes(bodyInput.value)) bodyInput.value = "";
}

function setSelectOptions(select, values, allLabel, keepValue) {
  select.innerHTML = optionList(values, allLabel);
  if (values.includes(keepValue)) select.value = keepValue;
}

function updateFilterOptions(scope, changed = "") {
  const records = scope === "old" ? state.oldFacetRecords : state.templateFacetRecords;
  const modalityFilter = els[`${scope}ModalityFilter`];
  const topicFilter = els[`${scope}TopicFilter`];
  const bodyFilter = els[`${scope}BodyPartFilter`];
  if (changed === "modality") {
    topicFilter.value = "";
    bodyFilter.value = "";
  }
  if (changed === "topic") bodyFilter.value = "";
  const modality = modalityFilter.value;
  const topic = topicFilter.value;
  const topicRecords = modality ? records.filter(item => item.modality === modality) : records;
  const bodyRecords = matching(records, { modality, topic });
  setSelectOptions(modalityFilter, valuesFrom(records, "modality"), "All modalities", modality);
  setSelectOptions(topicFilter, valuesFrom(topicRecords, "topic"), "All topics", topic);
  setSelectOptions(bodyFilter, valuesFrom(bodyRecords, "bodyPart"), "All body parts", bodyFilter.value);
}

function readAuth() {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    if (auth?.token) return auth;
  } catch {
    // Broken auth cache should not block sign-in.
  }
  return null;
}

function setAuth(auth) {
  state.auth = auth;
  if (auth?.token) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
  els.loginView.classList.toggle("hidden", Boolean(auth?.token));
  els.appShell.classList.toggle("hidden", !auth?.token);
}

function paletteKey() {
  return `${PALETTE_KEY_PREFIX}${state.auth?.user?.id || "anonymous"}`;
}

function themeKey() {
  return `${THEME_KEY_PREFIX}${state.auth?.user?.id || "anonymous"}`;
}

function readTheme() {
  const saved = localStorage.getItem(themeKey());
  return saved === "dark" ? "dark" : "light";
}

function applyTheme(theme = readTheme()) {
  document.body.dataset.theme = theme;
  if (els.themeToggleBtn) els.themeToggleBtn.textContent = theme === "dark" ? "Light" : "Dark";
}

function toggleTheme() {
  const next = document.body.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(themeKey(), next);
  applyTheme(next);
}

function readPalette() {
  try {
    const saved = JSON.parse(localStorage.getItem(paletteKey()) || "null");
    if (Array.isArray(saved?.text) && Array.isArray(saved?.highlight)) {
      return {
        text: [...DEFAULT_PALETTE.text].map((color, index) => saved.text[index] || color),
        highlight: [...DEFAULT_PALETTE.highlight].map((color, index) => saved.highlight[index] || color)
      };
    }
  } catch {
    // Ignore broken palette cache.
  }
  return structuredClone(DEFAULT_PALETTE);
}

function savePalette(palette) {
  localStorage.setItem(paletteKey(), JSON.stringify(palette));
}

function applyPalette() {
  const palette = readPalette();
  document.querySelectorAll(".format-toolbar").forEach(toolbar => {
    toolbar.querySelectorAll(".color-swatch").forEach((button, index) => {
      const color = palette.text[index] || DEFAULT_PALETTE.text[index] || "#2b2526";
      button.dataset.value = color;
      button.style.backgroundColor = color;
    });
    toolbar.querySelectorAll(".highlight-swatch").forEach((button, index) => {
      const color = palette.highlight[index] || DEFAULT_PALETTE.highlight[index] || "#fff0a8";
      button.dataset.value = color;
      button.style.backgroundColor = color;
    });
  });
}

function customizeSwatch(button) {
  const isHighlight = button.classList.contains("highlight-swatch");
  const groupKey = isHighlight ? "highlight" : "text";
  const swatches = [...button.closest(".format-group").querySelectorAll(isHighlight ? ".highlight-swatch" : ".color-swatch")];
  const index = swatches.indexOf(button);
  if (index < 0) return;
  const input = document.createElement("input");
  input.type = "color";
  input.value = button.dataset.value || (isHighlight ? "#fff0a8" : "#2b2526");
  input.addEventListener("input", () => {
    const palette = readPalette();
    palette[groupKey][index] = input.value;
    savePalette(palette);
    applyPalette();
  });
  input.click();
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    ...(state.auth?.token ? { Authorization: state.auth.token } : {})
  };
}

async function login(identity, password) {
  const response = await fetch(`${API}/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity, password })
  });
  if (!response.ok) throw new Error("Sign in failed. Check the email and password.");
  const auth = await response.json();
  setAuth({ token: auth.token, user: auth.record });
  await loadApp();
}

function logout() {
  setAuth(null);
  state.oldReports = [];
  state.templates = [];
  state.workLogReports = [];
  state.selectedOldReport = null;
  state.selectedTemplate = null;
  els.loginPasswordInput.value = "";
  els.loginError.textContent = "";
  els.loginEmailInput.focus();
}

function highlight(value, query) {
  const escaped = escapeHtml(value);
  const terms = String(query || "").trim().split(/\s+/).filter(Boolean).map(escapeRegex);
  if (!terms.length) return escaped;
  return escaped.replace(new RegExp(`(${terms.join("|")})`, "gi"), "<mark>$1</mark>");
}

function snippet(text, query) {
  const clean = plainText(text).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const q = String(query || "").trim().toLowerCase();
  if (!q) return clean.slice(0, 210);
  const index = clean.toLowerCase().indexOf(q);
  const start = Math.max(0, index < 0 ? 0 : index - 80);
  const end = Math.min(clean.length, (index < 0 ? 0 : index) + q.length + 150);
  return `${start ? "... " : ""}${clean.slice(start, end)}${end < clean.length ? " ..." : ""}`;
}

async function pbList(collection, params = {}) {
  const response = await fetch(`${API}/${collection}/records?${new URLSearchParams(params)}`, {
    headers: authHeaders()
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function pbCreate(collection, data) {
  const response = await fetch(`${API}/${collection}/records`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function pbUpdate(collection, id, data) {
  const response = await fetch(`${API}/${collection}/records/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function pbDelete(collection, id) {
  const response = await fetch(`${API}/${collection}/records/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!response.ok) throw new Error(await response.text());
}

function optionList(values, allLabel) {
  return [`<option value="">${allLabel}</option>`]
    .concat(values.filter(Boolean).map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
    .join("");
}

async function loadFacets() {
  state.oldFacetRecords = [];
  for (let page = 1; page < 80; page += 1) {
    const data = await pbList("old_reports", {
      page,
      perPage: 500,
      fields: "modality,topic,bodyPart"
    });
    state.oldFacetRecords.push(...data.items);
    if (page >= data.totalPages) break;
  }
  updateFilterOptions("old");
  updateEditorDatalists("report");
  await loadTemplateFacets();
}

async function loadTemplateFacets() {
  const data = await pbList("templates", {
    page: 1,
    perPage: 500,
    sort: "modality,topic,bodyPart",
    fields: "modality,topic,bodyPart"
  });
  state.templateFacetRecords = data.items;
  updateFilterOptions("template");
  updateEditorDatalists("template");
}

function showMode(mode) {
  state.mode = mode;
  els.builderModeBtn.classList.toggle("active", mode === "builder");
  els.writerModeBtn.classList.toggle("active", mode === "writer");
  els.worklogModeBtn.classList.toggle("active", mode === "worklog");
  els.builderView.classList.toggle("hidden", mode !== "builder");
  els.writerView.classList.toggle("hidden", mode !== "writer");
  els.worklogView.classList.toggle("hidden", mode !== "worklog");
  if (mode === "writer") loadTemplates();
  if (mode === "worklog") loadWorkLog();
}

function oldReportFilter() {
  const clauses = [];
  const query = els.oldSearchInput.value.trim();
  if (query) {
    const q = escapeFilter(query);
    clauses.push(`(title~"${q}" || report~"${q}" || keywords~"${q}" || bodyPart~"${q}" || topic~"${q}" || modality~"${q}")`);
  }
  if (els.oldModalityFilter.value) clauses.push(`modality="${escapeFilter(els.oldModalityFilter.value)}"`);
  if (els.oldTopicFilter.value) clauses.push(`topic="${escapeFilter(els.oldTopicFilter.value)}"`);
  if (els.oldBodyPartFilter.value) clauses.push(`bodyPart="${escapeFilter(els.oldBodyPartFilter.value)}"`);
  if (els.oldTypeFilter.value) clauses.push(`kind="${escapeFilter(els.oldTypeFilter.value)}"`);
  if (els.oldDateFilter.value.trim()) clauses.push(`sourceDate~"${escapeFilter(els.oldDateFilter.value.trim())}"`);
  if (els.oldInterestingFilter.checked) clauses.push("isInteresting=true");
  return clauses.join(" && ");
}

async function loadOldReports() {
  const query = els.oldSearchInput.value.trim();
  const data = await pbList("old_reports", {
    page: 1,
    perPage: 80,
    sort: "-created",
    filter: oldReportFilter(),
    fields: "id,title,modality,topic,bodyPart,kind,keywords,report,sourceType,sourceDate,note,isInteresting,owner"
  });
  state.oldReports = data.items;
  renderOldReports(query);
  if (!state.selectedOldReport && data.items.length) selectOldReport(data.items[0].id);
}

function renderOldReports(query = els.oldSearchInput.value.trim()) {
  if (!state.oldReports.length) {
    els.oldReportList.innerHTML = `<div class="empty">Search old reports from the Excel corpus. Saved full reports will appear here too.</div>`;
    return;
  }
  els.oldReportList.innerHTML = state.oldReports.map((item, index) => `
    <button class="result-item ${state.selectedOldReport?.id === item.id ? "active" : ""}" data-old-id="${item.id}" type="button">
      <span class="result-no">${index + 1}.</span>
      <span>
        <span class="result-title">${highlight(item.title || "Untitled", query)}${item.isInteresting ? '<span class="interesting-badge">Interesting</span>' : ""}</span>
        <span class="result-meta">${escapeHtml(item.modality || "Modality")} / ${escapeHtml(item.topic || "Topic")} / ${escapeHtml(item.bodyPart || "Body part")}</span>
        <span class="result-snippet">${highlight(snippet(item.report, query), query)}</span>
      </span>
    </button>
  `).join("");
}

function selectOldReport(id) {
  const report = state.oldReports.find(item => item.id === id);
  if (!report) return;
  state.selectedOldReport = report;
  els.oldPreviewTitle.textContent = report.title || "Untitled";
  els.oldPreviewText.innerHTML = reportHtml(report.report);
  renderOldReports();
}

function blankTemplate() {
  state.templateDraftId = null;
  els.templateTitleInput.value = "";
  els.templateModalityInput.value = "";
  els.templateTopicInput.value = "";
  els.templateBodyPartInput.value = "";
  setTemplateKind("normal");
  setEditorHtml(els.templateTextEditor, "");
}

function setTemplateKind(kind) {
  els.templateKindRadios.forEach(radio => {
    radio.checked = radio.value === kind;
  });
}

function getTemplateKind() {
  return els.templateKindRadios.find(radio => radio.checked)?.value || "normal";
}

function useOldReportAsTemplate() {
  if (!state.selectedOldReport) return;
  const report = state.selectedOldReport;
  state.templateDraftId = null;
  els.templateTitleInput.value = report.title || "";
  els.templateModalityInput.value = report.modality || "";
  els.templateTopicInput.value = report.topic || "";
  els.templateBodyPartInput.value = report.bodyPart || "";
  setTemplateKind(report.kind === "reference-template" ? "normal" : "disease");
  setEditorHtml(els.templateTextEditor, report.report || "");
  updateEditorDatalists("template");
}

function templateData() {
  return {
    title: els.templateTitleInput.value.trim() || "Untitled template",
    modality: els.templateModalityInput.value.trim(),
    topic: els.templateTopicInput.value.trim(),
    bodyPart: els.templateBodyPartInput.value.trim(),
    kind: getTemplateKind(),
    report: getEditorHtml(els.templateTextEditor),
    keywords: `${els.templateTitleInput.value} ${els.templateTopicInput.value} ${els.templateBodyPartInput.value} ${getTemplateKind()}`,
    sourceType: "personal-template",
    owner: state.auth?.user?.id || ""
  };
}

async function saveTemplate() {
  const data = templateData();
  if (!getEditorText(els.templateTextEditor)) {
    showToast("Nothing to save", "Write a template first.", "info");
    return false;
  }
  if (state.templateDraftId) {
    await pbUpdate("templates", state.templateDraftId, data);
  } else {
    const created = await pbCreate("templates", data);
    state.templateDraftId = created.id;
  }
  await loadTemplateFacets();
  await loadTemplates();
  showToast("Template saved", data.title);
  return true;
}

function templateFilter() {
  const clauses = [];
  const query = els.templateSearchInput.value.trim();
  if (query) {
    const q = escapeFilter(query);
    clauses.push(`(title~"${q}" || report~"${q}" || keywords~"${q}" || bodyPart~"${q}" || topic~"${q}" || modality~"${q}")`);
  }
  if (els.templateModalityFilter.value) clauses.push(`modality="${escapeFilter(els.templateModalityFilter.value)}"`);
  if (els.templateTopicFilter.value) clauses.push(`topic="${escapeFilter(els.templateTopicFilter.value)}"`);
  if (els.templateBodyPartFilter.value) clauses.push(`bodyPart="${escapeFilter(els.templateBodyPartFilter.value)}"`);
  if (els.templateTypeFilter.value) clauses.push(`kind="${escapeFilter(els.templateTypeFilter.value)}"`);
  return clauses.join(" && ");
}

async function loadTemplates() {
  const query = els.templateSearchInput.value.trim();
  const data = await pbList("templates", {
    page: 1,
    perPage: 80,
    sort: "-updated",
    filter: templateFilter(),
    fields: "id,title,modality,topic,bodyPart,kind,keywords,report,owner"
  });
  state.templates = data.items;
  renderTemplates(query);
}

function renderTemplates(query = els.templateSearchInput.value.trim()) {
  if (!state.templates.length) {
    els.templateList.innerHTML = `<div class="empty">No personal templates yet. Build one in Template Builder first.</div>`;
    return;
  }
  els.templateList.innerHTML = state.templates.map((item, index) => `
    <button class="result-item ${state.selectedTemplate?.id === item.id ? "active" : ""}" data-template-id="${item.id}" type="button">
      <span class="result-no">${index + 1}.</span>
      <span>
        <span class="result-title">${highlight(item.title || "Untitled", query)}</span>
        <span class="result-meta">${escapeHtml(item.modality || "Modality")} / ${escapeHtml(item.topic || "Topic")} / ${escapeHtml(item.bodyPart || "Body part")} / ${escapeHtml(item.kind || "template")}</span>
      </span>
    </button>
  `).join("");
}

function useTemplateForReport(template = null) {
  const source = template || {
    title: els.templateTitleInput.value,
    modality: els.templateModalityInput.value,
    topic: els.templateTopicInput.value,
    bodyPart: els.templateBodyPartInput.value,
    kind: getTemplateKind(),
    report: getEditorHtml(els.templateTextEditor)
  };
  state.selectedTemplate = source;
  els.reportTitleInput.value = source.title || "Untitled report";
  els.reportModalityInput.value = source.modality || "";
  els.reportTopicInput.value = source.topic || "";
  els.reportBodyPartInput.value = source.bodyPart || "";
  els.reportKeywordInput.value = source.kind || "";
  els.reportNoteInput.value = "";
  els.reportInterestingInput.checked = false;
  setEditorHtml(els.reportTextEditor, source.report || "");
  updateEditorDatalists("report");
  showMode("writer");
  renderTemplates();
}

function selectTemplate(id) {
  const template = state.templates.find(item => item.id === id);
  if (!template) return;
  useTemplateForReport(template);
}

function editTemplate(id) {
  const template = state.templates.find(item => item.id === id);
  if (!template) return;
  state.templateDraftId = template.id;
  els.templateTitleInput.value = template.title || "";
  els.templateModalityInput.value = template.modality || "";
  els.templateTopicInput.value = template.topic || "";
  els.templateBodyPartInput.value = template.bodyPart || "";
  setTemplateKind(template.kind || "normal");
  setEditorHtml(els.templateTextEditor, template.report || "");
  updateEditorDatalists("template");
  showMode("builder");
  els.templateTextEditor.focus();
}

function reportData() {
  return {
    title: els.reportTitleInput.value.trim() || "Untitled report",
    modality: els.reportModalityInput.value.trim(),
    topic: els.reportTopicInput.value.trim(),
    bodyPart: els.reportBodyPartInput.value.trim(),
    kind: "final-report",
    report: getEditorHtml(els.reportTextEditor),
    keywords: `${els.reportTitleInput.value} ${els.reportTopicInput.value} ${els.reportBodyPartInput.value} ${els.reportKeywordInput.value} ${els.reportNoteInput.value}`,
    sourceType: "final-report",
    sourceDate: new Date().toISOString(),
    note: els.reportNoteInput.value.trim(),
    isInteresting: els.reportInterestingInput.checked,
    owner: state.auth?.user?.id || ""
  };
}

function showContextMenu(x, y, actions) {
  if (!els.contextMenu) return;
  els.contextMenu.innerHTML = actions.map((action, index) => (
    `<button class="${action.danger ? "danger" : ""}" data-action-index="${index}" type="button">${escapeHtml(action.label)}</button>`
  )).join("");
  els.contextMenu.style.left = `${x}px`;
  els.contextMenu.style.top = `${y}px`;
  els.contextMenu.classList.remove("hidden");
  els.contextMenu.onclick = async event => {
    const button = event.target.closest("[data-action-index]");
    if (!button) return;
    els.contextMenu.classList.add("hidden");
    try {
      await actions[Number(button.dataset.actionIndex)].run();
    } catch (error) {
      showToast("Action failed", error.message || "Please try again.", "error");
    }
  };
}

function hideContextMenu() {
  if (!els.contextMenu) return;
  els.contextMenu.classList.add("hidden");
}

function showToast(title, message = "", type = "success") {
  if (!els.toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div><strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ""}</div>`;
  els.toastStack.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add("leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 2600);
}

async function withButtonFeedback(button, busyLabel, action, doneLabel = null) {
  const original = button?.textContent;
  try {
    if (button) {
      button.disabled = true;
      button.classList.add("is-busy");
      button.textContent = busyLabel;
    }
    const result = await action();
    if (button) {
      button.classList.remove("is-busy");
      if (result !== false) {
        button.classList.add("is-done");
        if (doneLabel) button.textContent = doneLabel;
      }
      window.setTimeout(() => {
        button.classList.remove("is-done");
        button.disabled = false;
        button.textContent = original;
      }, 850);
    }
    return result;
  } catch (error) {
    if (button) {
      button.classList.remove("is-busy", "is-done");
      button.disabled = false;
      button.textContent = original;
    }
    showToast("Action failed", error.message || "Please try again.", "error");
    return false;
  }
}

async function saveFullReport() {
  const data = reportData();
  if (!getEditorText(els.reportTextEditor)) {
    showToast("Nothing to save", "Type a report first.", "info");
    return false;
  }
  await pbCreate("old_reports", data);
  els.oldSearchInput.value = data.title;
  state.selectedOldReport = null;
  await loadOldReports();
  await loadWorkLog();
  showToast("Report saved", data.isInteresting ? "Saved and marked as interesting." : "Added to Old Reports and Work Log.");
  showMode("builder");
  return true;
}

function savedDate(report) {
  const value = report.sourceDate || report.created;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function reportMatchesQuery(report, query) {
  if (!query) return true;
  const haystack = [
    report.title,
    report.modality,
    report.topic,
    report.bodyPart,
    report.keywords,
    report.note,
    plainText(report.report)
  ].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).every(term => haystack.includes(term));
}

async function loadWorkLog() {
  const data = await pbList("old_reports", {
    page: 1,
    perPage: 500,
    sort: "-created",
    filter: 'sourceType="final-report"',
    fields: "id,title,modality,topic,bodyPart,keywords,report,sourceDate,created,note,isInteresting,owner"
  });
  state.workLogReports = data.items;
  renderWorkLog();
  renderInterestingCases();
}

function renderWorkLog() {
  const query = els.worklogSearchInput.value.trim();
  const reports = state.workLogReports.filter(report => reportMatchesQuery(report, query));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = new Map();
  for (const report of state.workLogReports) {
    const date = savedDate(report);
    if (!date) continue;
    counts.set(dateKey(date), (counts.get(dateKey(date)) || 0) + 1);
  }
  const todayCount = counts.get(dateKey(today)) || 0;
  const interestingCount = state.workLogReports.filter(report => report.isInteresting).length;
  const activeDays = counts.size;
  els.worklogSummary.innerHTML = [
    ["Total reports", state.workLogReports.length],
    ["Saved today", todayCount],
    ["Active days", activeDays],
    ["Interesting", interestingCount]
  ].map(([label, value]) => `<div class="summary-card"><strong>${value}</strong><span>${label}</span></div>`).join("");

  const days = [];
  for (let offset = 90; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const count = counts.get(dateKey(date)) || 0;
    const level = count >= 4 ? 4 : count;
    days.push(`<div class="heat-day level-${level}" title="${dateKey(date)}: ${count} report${count === 1 ? "" : "s"}"></div>`);
  }
  els.worklogHeatmap.innerHTML = days.join("");

  if (!reports.length) {
    els.worklogList.innerHTML = `<div class="empty">Saved reports will build your personal work log here.</div>`;
    return;
  }
  els.worklogList.innerHTML = reports.map((report, index) => {
    const date = savedDate(report);
    return `
      <button class="result-item" data-worklog-id="${report.id}" type="button">
        <span class="result-no">${index + 1}.</span>
        <span>
          <span class="result-title">${highlight(report.title || "Untitled", query)}${report.isInteresting ? '<span class="interesting-badge">Interesting</span>' : ""}</span>
          <span class="result-meta">${escapeHtml(date ? dateKey(date) : "No date")} / ${escapeHtml(report.modality || "Modality")} / ${escapeHtml(report.topic || "Topic")} / ${escapeHtml(report.bodyPart || "Body part")}</span>
          ${report.note ? `<span class="result-snippet">${highlight(report.note, query)}</span>` : ""}
        </span>
      </button>
    `;
  }).join("");
}

function renderInterestingCases() {
  const query = els.interestingSearchInput.value.trim();
  const reports = state.workLogReports
    .filter(report => report.isInteresting)
    .filter(report => reportMatchesQuery(report, query));
  if (!reports.length) {
    els.interestingList.innerHTML = `<div class="empty">Mark a saved report as interesting to keep it here for quick lookup.</div>`;
    return;
  }
  els.interestingList.innerHTML = reports.map((report, index) => `
    <button class="result-item" data-interesting-id="${report.id}" type="button">
      <span class="result-no">${index + 1}.</span>
      <span>
        <span class="result-title">${highlight(report.title || "Untitled", query)}</span>
        <span class="result-meta">${escapeHtml(report.modality || "Modality")} / ${escapeHtml(report.topic || "Topic")} / ${escapeHtml(report.bodyPart || "Body part")}</span>
        ${report.note ? `<span class="result-snippet">${highlight(report.note, query)}</span>` : ""}
      </span>
    </button>
  `).join("");
}

function openSavedReport(id) {
  const report = state.workLogReports.find(item => item.id === id);
  if (!report) return;
  els.reportTitleInput.value = report.title || "";
  els.reportModalityInput.value = report.modality || "";
  els.reportTopicInput.value = report.topic || "";
  els.reportBodyPartInput.value = report.bodyPart || "";
  els.reportKeywordInput.value = report.keywords || "";
  els.reportNoteInput.value = report.note || "";
  els.reportInterestingInput.checked = Boolean(report.isInteresting);
  setEditorHtml(els.reportTextEditor, report.report || "");
  showMode("writer");
}

function debounce(fn, ms = 250) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

function runFormatCommand(button) {
  const toolbar = button.closest(".format-toolbar");
  const editor = document.getElementById(toolbar.dataset.editorTarget);
  if (!editor) return;
  editor.focus();
  document.execCommand(button.dataset.command, false, button.dataset.value || null);
}

els.builderModeBtn.addEventListener("click", () => showMode("builder"));
els.writerModeBtn.addEventListener("click", () => showMode("writer"));
els.worklogModeBtn.addEventListener("click", () => showMode("worklog"));
els.themeToggleBtn.addEventListener("click", toggleTheme);
els.oldSearchInput.addEventListener("input", debounce(() => {
  state.selectedOldReport = null;
  loadOldReports();
}));
els.oldReportList.addEventListener("click", event => {
  const button = event.target.closest("[data-old-id]");
  if (button) selectOldReport(button.dataset.oldId);
});
els.oldReportList.addEventListener("contextmenu", event => {
  const button = event.target.closest("[data-old-id]");
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.oldId;
  const report = state.oldReports.find(item => item.id === id);
  const actions = [
    { label: "Use as template", run: () => { selectOldReport(id); useOldReportAsTemplate(); } }
  ];
  if (report?.owner === state.auth?.user?.id) {
    actions.push({ label: report.isInteresting ? "Remove interesting" : "Save as interesting", run: async () => {
      await pbUpdate("old_reports", id, { isInteresting: !report.isInteresting });
      await loadOldReports();
      await loadWorkLog();
      showToast(report.isInteresting ? "Removed from interesting" : "Saved as interesting", report.title || "Saved report");
    }});
    actions.push({ label: "Delete saved report", danger: true, run: async () => {
      if (!confirm("Delete this old report?")) return;
      await pbDelete("old_reports", id);
      if (state.selectedOldReport?.id === id) state.selectedOldReport = null;
      await loadOldReports();
      await loadWorkLog();
      showToast("Saved report deleted", report.title || "Old report");
    }});
  }
  showContextMenu(event.clientX, event.clientY, actions);
});
els.useOldReportBtn.addEventListener("click", useOldReportAsTemplate);
els.newTemplateBtn.addEventListener("click", blankTemplate);
els.saveTemplateBtn.addEventListener("click", () => {
  withButtonFeedback(els.saveTemplateBtn, "Saving...", saveTemplate, "Saved");
});
els.useTemplateBtn.addEventListener("click", () => useTemplateForReport());
els.templateSearchInput.addEventListener("input", debounce(loadTemplates));
[
  els.oldModalityFilter,
  els.oldTopicFilter,
  els.oldBodyPartFilter,
  els.oldTypeFilter,
  els.oldDateFilter,
  els.oldInterestingFilter
].forEach(element => element.addEventListener("input", debounce(() => {
  if (element === els.oldModalityFilter) updateFilterOptions("old", "modality");
  if (element === els.oldTopicFilter) updateFilterOptions("old", "topic");
  state.selectedOldReport = null;
  loadOldReports();
})));
[
  els.templateModalityFilter,
  els.templateTopicFilter,
  els.templateBodyPartFilter,
  els.templateTypeFilter
].forEach(element => element.addEventListener("input", debounce(() => {
  if (element === els.templateModalityFilter) updateFilterOptions("template", "modality");
  if (element === els.templateTopicFilter) updateFilterOptions("template", "topic");
  loadTemplates();
})));
[
  els.templateModalityInput,
  els.templateTopicInput
].forEach(element => element.addEventListener("input", () => updateEditorDatalists("template")));
[
  els.reportModalityInput,
  els.reportTopicInput
].forEach(element => element.addEventListener("input", () => updateEditorDatalists("report")));
document.querySelectorAll(".format-toolbar").forEach(toolbar => {
  toolbar.addEventListener("click", event => {
    const button = event.target.closest("[data-command]");
    if (button) runFormatCommand(button);
  });
  toolbar.addEventListener("contextmenu", event => {
    const button = event.target.closest(".color-swatch, .highlight-swatch");
    if (!button) return;
    event.preventDefault();
    customizeSwatch(button);
  });
});
[els.templateTextEditor, els.reportTextEditor].forEach(editor => {
  editor.addEventListener("input", debounce(() => updateProofing(editor), 120));
  editor.addEventListener("blur", () => updateProofing(editor));
});
els.templateList.addEventListener("click", event => {
  const button = event.target.closest("[data-template-id]");
  if (button) selectTemplate(button.dataset.templateId);
});
els.templateList.addEventListener("contextmenu", event => {
  const button = event.target.closest("[data-template-id]");
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.templateId;
  showContextMenu(event.clientX, event.clientY, [
    { label: "Edit template", run: () => editTemplate(id) },
    { label: "Use for report", run: () => selectTemplate(id) },
    { label: "Delete template", danger: true, run: async () => {
      if (!confirm("Delete this template?")) return;
      await pbDelete("templates", id);
      if (state.selectedTemplate?.id === id) state.selectedTemplate = null;
      await loadTemplateFacets();
      await loadTemplates();
      showToast("Template deleted");
    }}
  ]);
});
els.contextMenu?.addEventListener("click", event => event.stopPropagation());
document.addEventListener("click", hideContextMenu);
els.copyReportBtn.addEventListener("click", () => {
  withButtonFeedback(els.copyReportBtn, "Copying...", async () => {
    await navigator.clipboard.writeText(getEditorText(els.reportTextEditor));
    showToast("Copied", "Plain text is ready to paste.");
  }, "Copied");
});
els.saveReportBtn.addEventListener("click", () => {
  withButtonFeedback(els.saveReportBtn, "Saving...", saveFullReport, "Saved");
});
els.worklogSearchInput.addEventListener("input", debounce(renderWorkLog));
els.interestingSearchInput.addEventListener("input", debounce(renderInterestingCases));
els.worklogList.addEventListener("click", event => {
  const button = event.target.closest("[data-worklog-id]");
  if (button) openSavedReport(button.dataset.worklogId);
});
els.interestingList.addEventListener("click", event => {
  const button = event.target.closest("[data-interesting-id]");
  if (button) openSavedReport(button.dataset.interestingId);
});
els.worklogList.addEventListener("contextmenu", event => {
  const button = event.target.closest("[data-worklog-id]");
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.worklogId;
  const report = state.workLogReports.find(item => item.id === id);
  showContextMenu(event.clientX, event.clientY, [
    { label: "Open report", run: () => openSavedReport(id) },
    { label: report?.isInteresting ? "Remove interesting" : "Save as interesting", run: async () => {
      await pbUpdate("old_reports", id, { isInteresting: !report?.isInteresting });
      await loadWorkLog();
      await loadOldReports();
      showToast(report?.isInteresting ? "Removed from interesting" : "Saved as interesting", report?.title || "Saved report");
    }},
    { label: "Delete saved report", danger: true, run: async () => {
      if (!confirm("Delete this saved report?")) return;
      await pbDelete("old_reports", id);
      await loadWorkLog();
      await loadOldReports();
      showToast("Saved report deleted", report?.title || "Report");
    }}
  ]);
});
els.interestingList.addEventListener("contextmenu", event => {
  const button = event.target.closest("[data-interesting-id]");
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.interestingId;
  showContextMenu(event.clientX, event.clientY, [
    { label: "Open report", run: () => openSavedReport(id) },
    { label: "Remove interesting", run: async () => {
      await pbUpdate("old_reports", id, { isInteresting: false });
      await loadWorkLog();
      await loadOldReports();
      showToast("Removed from interesting");
    }}
  ]);
});
els.loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.loginError.textContent = "";
  try {
    await login(els.loginEmailInput.value.trim(), els.loginPasswordInput.value);
  } catch (error) {
    els.loginError.textContent = error.message;
  }
});
els.logoutBtn.addEventListener("click", logout);

async function loadApp() {
  applyTheme();
  applyPalette();
  blankTemplate();
  await loadFacets();
  await loadOldReports();
  await loadTemplates();
  await loadWorkLog();
}

async function init() {
  const auth = readAuth();
  setAuth(auth);
  if (!auth?.token) {
    els.loginEmailInput.focus();
    return;
  }
  try {
    await loadApp();
  } catch (error) {
    logout();
    els.loginError.textContent = "Please sign in again.";
    console.error(error);
  }
}

init();
