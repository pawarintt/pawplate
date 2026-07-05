const CONFIG = window.PAWPLATE_CONFIG || {};
const POCKETBASE_URL = CONFIG.pocketbaseUrl || window.location.origin;
const API = `${POCKETBASE_URL.replace(/\/$/, "")}/api/collections`;
const AUTH_KEY = "pawplate.auth";

const state = {
  mode: "builder",
  auth: null,
  oldReports: [],
  templates: [],
  selectedOldReport: null,
  selectedTemplate: null,
  templateDraftId: null
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
  builderView: document.getElementById("builderView"),
  writerView: document.getElementById("writerView"),
  oldSearchInput: document.getElementById("oldSearchInput"),
  oldModalityFilter: document.getElementById("oldModalityFilter"),
  oldTopicFilter: document.getElementById("oldTopicFilter"),
  oldBodyPartFilter: document.getElementById("oldBodyPartFilter"),
  oldTypeFilter: document.getElementById("oldTypeFilter"),
  oldDateFilter: document.getElementById("oldDateFilter"),
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
  templateBodyPartInput: document.getElementById("templateBodyPartInput"),
  templateKindRadios: [...document.querySelectorAll('input[name="templateKind"]')],
  templateTextEditor: document.getElementById("templateTextEditor"),
  templateSearchInput: document.getElementById("templateSearchInput"),
  templateModalityFilter: document.getElementById("templateModalityFilter"),
  templateTopicFilter: document.getElementById("templateTopicFilter"),
  templateBodyPartFilter: document.getElementById("templateBodyPartFilter"),
  templateTypeFilter: document.getElementById("templateTypeFilter"),
  templateList: document.getElementById("templateList"),
  reportTitleInput: document.getElementById("reportTitleInput"),
  reportModalityInput: document.getElementById("reportModalityInput"),
  reportTopicInput: document.getElementById("reportTopicInput"),
  reportBodyPartInput: document.getElementById("reportBodyPartInput"),
  reportKeywordInput: document.getElementById("reportKeywordInput"),
  reportTextEditor: document.getElementById("reportTextEditor"),
  copyReportBtn: document.getElementById("copyReportBtn"),
  saveReportBtn: document.getElementById("saveReportBtn"),
  contextMenu: document.getElementById("contextMenu")
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
  const clean = String(text || "").replace(/\s+/g, " ").trim();
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
  const response = await fetch("facets.json", { cache: "no-store" });
  const facets = response.ok ? await response.json() : { modalities: [], topics: [], bodyParts: [] };
  els.oldModalityFilter.innerHTML = optionList(facets.modalities || [], "All modalities");
  els.oldTopicFilter.innerHTML = optionList(facets.topics || [], "All topics");
  els.oldBodyPartFilter.innerHTML = optionList(facets.bodyParts || [], "All body parts");
  await loadTemplateFacets();
}

async function loadTemplateFacets() {
  const data = await pbList("templates", {
    page: 1,
    perPage: 500,
    sort: "modality,topic,bodyPart",
    fields: "modality,topic,bodyPart"
  });
  const keep = {
    modality: els.templateModalityFilter.value,
    topic: els.templateTopicFilter.value,
    bodyPart: els.templateBodyPartFilter.value
  };
  const modalities = [...new Set(data.items.map(item => item.modality).filter(Boolean))].sort();
  const topics = [...new Set(data.items.map(item => item.topic).filter(Boolean))].sort();
  const bodyParts = [...new Set(data.items.map(item => item.bodyPart).filter(Boolean))].sort();
  els.templateModalityFilter.innerHTML = optionList(modalities, "All modalities");
  els.templateTopicFilter.innerHTML = optionList(topics, "All topics");
  els.templateBodyPartFilter.innerHTML = optionList(bodyParts, "All body parts");
  if (modalities.includes(keep.modality)) els.templateModalityFilter.value = keep.modality;
  if (topics.includes(keep.topic)) els.templateTopicFilter.value = keep.topic;
  if (bodyParts.includes(keep.bodyPart)) els.templateBodyPartFilter.value = keep.bodyPart;
}

function showMode(mode) {
  state.mode = mode;
  els.builderModeBtn.classList.toggle("active", mode === "builder");
  els.writerModeBtn.classList.toggle("active", mode === "writer");
  els.builderView.classList.toggle("hidden", mode !== "builder");
  els.writerView.classList.toggle("hidden", mode !== "writer");
  if (mode === "writer") loadTemplates();
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
  return clauses.join(" && ");
}

async function loadOldReports() {
  const query = els.oldSearchInput.value.trim();
  const data = await pbList("old_reports", {
    page: 1,
    perPage: 80,
    sort: "-created",
    filter: oldReportFilter(),
    fields: "id,title,modality,topic,bodyPart,kind,keywords,report,sourceType,sourceDate"
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
        <span class="result-title">${highlight(item.title || "Untitled", query)}</span>
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
  els.oldPreviewText.textContent = report.report || "";
  renderOldReports();
}

function blankTemplate() {
  state.templateDraftId = null;
  els.templateTitleInput.value = "";
  els.templateModalityInput.value = "";
  els.templateTopicInput.value = "";
  els.templateBodyPartInput.value = "";
  setTemplateKind("normal");
  els.templateTextEditor.value = "";
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
  els.templateTextEditor.value = report.report || "";
}

function templateData() {
  return {
    title: els.templateTitleInput.value.trim() || "Untitled template",
    modality: els.templateModalityInput.value.trim(),
    topic: els.templateTopicInput.value.trim(),
    bodyPart: els.templateBodyPartInput.value.trim(),
    kind: getTemplateKind(),
    report: els.templateTextEditor.value,
    keywords: `${els.templateTitleInput.value} ${els.templateTopicInput.value} ${els.templateBodyPartInput.value} ${getTemplateKind()}`,
    sourceType: "personal-template"
  };
}

async function saveTemplate() {
  const data = templateData();
  if (!data.report.trim()) return;
  if (state.templateDraftId) {
    await pbUpdate("templates", state.templateDraftId, data);
  } else {
    const created = await pbCreate("templates", data);
    state.templateDraftId = created.id;
  }
  await loadTemplateFacets();
  await loadTemplates();
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
    fields: "id,title,modality,topic,bodyPart,kind,keywords,report"
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
    report: els.templateTextEditor.value
  };
  state.selectedTemplate = source;
  els.reportTitleInput.value = source.title || "Untitled report";
  els.reportModalityInput.value = source.modality || "";
  els.reportTopicInput.value = source.topic || "";
  els.reportBodyPartInput.value = source.bodyPart || "";
  els.reportKeywordInput.value = source.kind || "";
  els.reportTextEditor.value = source.report || "";
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
  els.templateTextEditor.value = template.report || "";
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
    report: els.reportTextEditor.value,
    keywords: `${els.reportTitleInput.value} ${els.reportTopicInput.value} ${els.reportBodyPartInput.value} ${els.reportKeywordInput.value}`,
    sourceType: "final-report",
    sourceDate: new Date().toISOString()
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
    await actions[Number(button.dataset.actionIndex)].run();
  };
}

function hideContextMenu() {
  if (!els.contextMenu) return;
  els.contextMenu.classList.add("hidden");
}

async function saveFullReport() {
  const data = reportData();
  if (!data.report.trim()) return;
  await pbCreate("old_reports", data);
  els.oldSearchInput.value = data.title;
  state.selectedOldReport = null;
  await loadOldReports();
  showMode("builder");
}

function debounce(fn, ms = 250) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

els.builderModeBtn.addEventListener("click", () => showMode("builder"));
els.writerModeBtn.addEventListener("click", () => showMode("writer"));
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
  showContextMenu(event.clientX, event.clientY, [
    { label: "Use as template", run: () => { selectOldReport(id); useOldReportAsTemplate(); } },
    { label: "Delete old report", danger: true, run: async () => {
      if (!confirm("Delete this old report?")) return;
      await pbDelete("old_reports", id);
      if (state.selectedOldReport?.id === id) state.selectedOldReport = null;
      await loadOldReports();
    }}
  ]);
});
els.useOldReportBtn.addEventListener("click", useOldReportAsTemplate);
els.newTemplateBtn.addEventListener("click", blankTemplate);
els.saveTemplateBtn.addEventListener("click", saveTemplate);
els.useTemplateBtn.addEventListener("click", () => useTemplateForReport());
els.templateSearchInput.addEventListener("input", debounce(loadTemplates));
[
  els.oldModalityFilter,
  els.oldTopicFilter,
  els.oldBodyPartFilter,
  els.oldTypeFilter,
  els.oldDateFilter
].forEach(element => element.addEventListener("input", debounce(() => {
  state.selectedOldReport = null;
  loadOldReports();
})));
[
  els.templateModalityFilter,
  els.templateTopicFilter,
  els.templateBodyPartFilter,
  els.templateTypeFilter
].forEach(element => element.addEventListener("input", debounce(loadTemplates)));
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
    }}
  ]);
});
els.contextMenu?.addEventListener("click", event => event.stopPropagation());
document.addEventListener("click", hideContextMenu);
els.copyReportBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.reportTextEditor.value);
});
els.saveReportBtn.addEventListener("click", saveFullReport);
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
  blankTemplate();
  await loadFacets();
  await loadOldReports();
  await loadTemplates();
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
