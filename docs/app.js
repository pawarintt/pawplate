const CONFIG = window.PAWPLATE_CONFIG || {};
const POCKETBASE_URL = CONFIG.pocketbaseUrl || window.location.origin;
const API = `${POCKETBASE_URL.replace(/\/$/, "")}/api/collections`;
const AUTH_KEY = "pawplate.auth";
const PALETTE_KEY_PREFIX = "pawplate.palette.";
const THEME_KEY_PREFIX = "pawplate.theme.";
const PERSONAL_DICTIONARY_KEY_PREFIX = "pawplate.dictionary.";
const SPELLCHECK_DICTIONARY_URL = "https://cdn.jsdelivr.net/npm/typo-js@1.3.2/dictionaries/en_US";
const TIPTAP_VERSION = "2.11.7";
const TIPTAP_CDN = "https://esm.sh";
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
const PROOFING_WORDS = new Set(`
a about above absent acute after again age air airway airways all also an and another anterior appear appears are area artery assessment associated at axial
be bilateral body bone bowel brain but by can cancer cardiac case central change changes chest chronic clear cm collection common comparison contrast could ct cta cyst
date decreased defect demonstrates diameter diffuse dilated disease doctor effusion enhancement enlarged evidence exam examination finding findings focal follow for from
gallbladder great has have heart hepatic history hn if in increased inferior is kidney large left lesion line liver lower lung lungs lymph mass may mediastinal mild mm
moderate mri muscle neck new no node nodules non normal noted of old on or organ other pain partial patient per pleural pneumonia position post previous prior process
pulmonary report right seen severe significant size small soft stable study suspicious there this to today upper urinary vascular vein vessels visualized was were with
without within xray
abdomen abdominal abscess accessory acetabulum adenopathy adrenal adnexa aneurysm angiogram appendicitis appendix atelectasis bladder bronchiectasis calculus calcification
carcinoma catheter cavitary cerebellar cerebral cervical cholecystitis clavicle colitis colon compression consolidation contusion cortical cystic diverticulitis duodenum
edema embolism emphysema epidural esophagus extremity femoral femur fibrosis fracture frontal gastrointestinal glioma hematoma hemorrhage hydronephrosis infarct infection
ischemia jejunum joint lacunar lumbar malignancy metastasis metastatic musculoskeletal nodule obstruction occipital opacification pancreas pancreatic parietal patella
pelvis perfusion pericardial peritoneal phlegmon pneumothorax portal prostate radiology renal sacral scapula sclerosis sigmoid spleen splenic sternum stent stone subdural
temporal thoracic thrombus thyroid tibia tumor ultrasound ureter vertebral
`.trim().split(/\s+/));
const PROOFING_ABBREVIATIONS = new Set("ct mri us pa ap lat cta cxr gb cbd cva ckd copd mpa rv lv cm mm hn llq rlq rml lll rul rll lul iv s p".split(/\s+/));
const SNIPPET_SCHEMAS = {
  tirads: {
    label: "TI-RADS",
    modalities: {
      ultrasound: {
        label: "Ultrasound",
        findings: {
          thyroidNodule: {
            label: "Thyroid nodule",
            fields: [
              { key: "side", label: "Side", type: "select", options: ["right", "left", "isthmic"] },
              { key: "region", label: "Region", type: "select", options: ["upper pole", "mid pole", "lower pole", "interpolar region"] },
              { key: "size", label: "Size", type: "text", placeholder: "1.4 x 1.2 x 2.0 cm" },
              { key: "composition", label: "Composition", type: "select", options: ["solid", "predominantly solid", "mixed cystic and solid", "spongiform", "cystic"] },
              { key: "echogenicity", label: "Echogenicity", type: "select", options: ["hypoechoic", "isoechoic", "hyperechoic", "very hypoechoic", "anechoic"] },
              { key: "shape", label: "Shape", type: "select", options: ["wider-than-tall", "taller-than-wide"] },
              { key: "margin", label: "Margin", type: "select", options: ["smooth", "ill-defined", "lobulated", "irregular", "extrathyroidal extension"] },
              { key: "foci", label: "Echogenic foci", type: "select", options: ["none", "comet-tail artifacts", "macrocalcifications", "peripheral rim calcifications", "punctate echogenic foci"] }
            ]
          }
        }
      }
    }
  },
  birads: {
    label: "BI-RADS",
    modalities: {
      mammography: {
        label: "Mammography",
        findings: {
          mass: {
            label: "Mass",
            fields: [
              { key: "breast", label: "Breast", type: "select", options: ["right breast", "left breast"] },
              { key: "location", label: "Location", type: "text", placeholder: "upper outer quadrant" },
              { key: "size", label: "Size", type: "text", placeholder: "1.2 cm" },
              { key: "shape", label: "Shape", type: "select", options: ["oval", "round", "irregular"] },
              { key: "margin", label: "Margin", type: "select", options: ["circumscribed", "obscured", "microlobulated", "indistinct", "spiculated"] },
              { key: "density", label: "Density", type: "select", options: ["high density", "equal density", "low density", "fat-containing"] },
              { key: "associated", label: "Associated", type: "text", placeholder: "no associated suspicious calcifications" }
            ]
          },
          calcification: {
            label: "Calcification",
            fields: [
              { key: "breast", label: "Breast", type: "select", options: ["right breast", "left breast"] },
              { key: "location", label: "Location", type: "text", placeholder: "upper outer quadrant" },
              { key: "morphology", label: "Morphology", type: "select", options: ["amorphous", "coarse heterogeneous", "fine pleomorphic", "fine linear", "fine-linear branching", "round", "rim", "dystrophic"] },
              { key: "distribution", label: "Distribution", type: "select", options: ["diffuse", "regional", "grouped", "linear", "segmental"] }
            ]
          }
        }
      },
      ultrasound: {
        label: "Ultrasound",
        findings: {
          mass: {
            label: "Mass",
            fields: [
              { key: "breast", label: "Breast", type: "select", options: ["right breast", "left breast"] },
              { key: "clock", label: "Clock", type: "text", placeholder: "10 o'clock" },
              { key: "distance", label: "Distance", type: "text", placeholder: "3 cm from the nipple" },
              { key: "depth", label: "Depth", type: "select", options: ["anterior depth", "middle depth", "posterior depth", "subareolar region"] },
              { key: "size", label: "Size", type: "text", placeholder: "0.8 x 0.5 x 0.4 cm" },
              { key: "shape", label: "Shape", type: "select", options: ["oval", "round", "irregular"] },
              { key: "orientation", label: "Orientation", type: "select", options: ["parallel", "not parallel"] },
              { key: "margin", label: "Margin", type: "select", options: ["circumscribed", "indistinct", "angular", "microlobulated", "spiculated"] },
              { key: "echo", label: "Echo pattern", type: "select", options: ["anechoic", "hyperechoic", "complex cystic and solid", "hypoechoic", "isoechoic", "heterogeneous"] },
              { key: "posterior", label: "Posterior", type: "select", options: ["no posterior features", "posterior enhancement", "posterior shadowing", "combined posterior pattern"] },
              { key: "vascularity", label: "Vascularity", type: "select", options: ["no internal vascularity", "internal vascularity", "peripheral vascularity"] }
            ]
          }
        }
      }
    }
  }
};
const SNIPPET_DEFAULTS = { system: "tirads", modality: "ultrasound", finding: "thyroidNodule", values: {} };
const TEMPLATE_TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "normal", label: "Normal" },
  { value: "disease", label: "Disease" }
];

const state = {
  mode: "builder",
  auth: null,
  oldReports: [],
  oldFacetRecords: [],
  templateFacetRecords: [],
  templates: [],
  guidelines: [],
  writerGuidelines: [],
  selectedOldReport: null,
  selectedTemplate: null,
  selectedGuideline: null,
  selectedWriterGuideline: null,
  selectedWorklogReport: null,
  templateDraftId: null,
  guidelineDraftId: null,
  reportDraftId: null,
  reportDraftSourceDate: "",
  referenceTab: "templates",
  worklogMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  worklogSelectedDate: "",
  workLogReports: [],
  dictionary: null,
  dictionaryReady: false,
  personalDictionary: new Set(),
  userSettingsId: "",
  guidelineFileToken: "",
  guidelineFileTokenExpiresAt: 0,
  snippet: structuredClone(SNIPPET_DEFAULTS),
  snippetItems: [],
  tiptapReady: false,
  editorUpdateTimers: new WeakMap()
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
  guidelineModeBtn: document.getElementById("guidelineModeBtn"),
  worklogModeBtn: document.getElementById("worklogModeBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  builderView: document.getElementById("builderView"),
  writerView: document.getElementById("writerView"),
  guidelineView: document.getElementById("guidelineView"),
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
  templateModeBadge: document.getElementById("templateModeBadge"),
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
  templateModalityRadios: document.getElementById("templateModalityRadios"),
  templateTopicFilter: document.getElementById("templateTopicFilter"),
  templateBodyPartFilter: document.getElementById("templateBodyPartFilter"),
  templateTypeFilter: document.getElementById("templateTypeFilter"),
  templateTypeRadios: document.getElementById("templateTypeRadios"),
  templateList: document.getElementById("templateList"),
  writerGuidelineSearchInput: document.getElementById("writerGuidelineSearchInput"),
  writerGuidelineList: document.getElementById("writerGuidelineList"),
  writerGuidelineTitle: document.getElementById("writerGuidelineTitle"),
  writerGuidelinePreview: document.getElementById("writerGuidelinePreview"),
  openGuidelineBuilderBtn: document.getElementById("openGuidelineBuilderBtn"),
  snippetSystemSelect: document.getElementById("snippetSystemSelect"),
  snippetSystemRadios: document.getElementById("snippetSystemRadios"),
  snippetModalitySelect: document.getElementById("snippetModalitySelect"),
  snippetModalityRadios: document.getElementById("snippetModalityRadios"),
  snippetFindingSelect: document.getElementById("snippetFindingSelect"),
  snippetFindingRadios: document.getElementById("snippetFindingRadios"),
  snippetFields: document.getElementById("snippetFields"),
  snippetPreviewText: document.getElementById("snippetPreviewText"),
  snippetFindingList: document.getElementById("snippetFindingList"),
  addSnippetFindingBtn: document.getElementById("addSnippetFindingBtn"),
  clearSnippetFindingsBtn: document.getElementById("clearSnippetFindingsBtn"),
  copySnippetBtn: document.getElementById("copySnippetBtn"),
  insertSnippetBtn: document.getElementById("insertSnippetBtn"),
  resetSnippetBtn: document.getElementById("resetSnippetBtn"),
  guidelineModeBadge: document.getElementById("guidelineModeBadge"),
  newGuidelineBtn: document.getElementById("newGuidelineBtn"),
  insertGuidelineImageBtn: document.getElementById("insertGuidelineImageBtn"),
  saveGuidelineBtn: document.getElementById("saveGuidelineBtn"),
  guidelineTitleInput: document.getElementById("guidelineTitleInput"),
  guidelineModalityInput: document.getElementById("guidelineModalityInput"),
  guidelineTopicInput: document.getElementById("guidelineTopicInput"),
  guidelineBodyPartInput: document.getElementById("guidelineBodyPartInput"),
  guidelineTagsInput: document.getElementById("guidelineTagsInput"),
  guidelineMarkdownInput: document.getElementById("guidelineMarkdownInput"),
  guidelineImageInput: document.getElementById("guidelineImageInput"),
  guidelineSearchInput: document.getElementById("guidelineSearchInput"),
  guidelineList: document.getElementById("guidelineList"),
  guidelinePreviewTitle: document.getElementById("guidelinePreviewTitle"),
  guidelinePreview: document.getElementById("guidelinePreview"),
  reportTitleInput: document.getElementById("reportTitleInput"),
  reportModalityInput: document.getElementById("reportModalityInput"),
  reportTopicInput: document.getElementById("reportTopicInput"),
  reportTopicOptions: document.getElementById("reportTopicOptions"),
  reportBodyPartInput: document.getElementById("reportBodyPartInput"),
  reportBodyPartOptions: document.getElementById("reportBodyPartOptions"),
  reportKeywordInput: document.getElementById("reportKeywordInput"),
  reportNoteInput: document.getElementById("reportNoteInput"),
  reportInterestingInput: document.getElementById("reportInterestingInput"),
  reportModeBadge: document.getElementById("reportModeBadge"),
  reportTextEditor: document.getElementById("reportTextEditor"),
  reportProofing: document.getElementById("reportProofing"),
  newReportBtn: document.getElementById("newReportBtn"),
  copyReportBtn: document.getElementById("copyReportBtn"),
  saveReportBtn: document.getElementById("saveReportBtn"),
  worklogSearchInput: document.getElementById("worklogSearchInput"),
  reviewVisibleReportsBtn: document.getElementById("reviewVisibleReportsBtn"),
  worklogSummary: document.getElementById("worklogSummary"),
  worklogHeatmap: document.getElementById("worklogHeatmap"),
  worklogList: document.getElementById("worklogList"),
  interestingSearchInput: document.getElementById("interestingSearchInput"),
  interestingList: document.getElementById("interestingList"),
  worklogPreviewTitle: document.getElementById("worklogPreviewTitle"),
  worklogPreviewMeta: document.getElementById("worklogPreviewMeta"),
  worklogPreviewText: document.getElementById("worklogPreviewText"),
  editWorklogReportBtn: document.getElementById("editWorklogReportBtn"),
  closeWorklogPreviewBtn: document.getElementById("closeWorklogPreviewBtn"),
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
  if (isHtml(raw)) return raw;
  return escapeHtml(raw)
    .replace(/\t/g, "&#9;")
    .replace(/ {2,}/g, spaces => "&nbsp;".repeat(spaces.length))
    .replace(/\n/g, "<br>");
}

function protectedFileUrl(url) {
  const value = String(url || "").trim();
  if (!state.guidelineFileToken) return value;
  try {
    const parsed = new URL(value, window.location.href);
    const protectedBase = `${POCKETBASE_URL.replace(/\/$/, "")}/api/files/guidelines/`;
    if (!parsed.href.startsWith(protectedBase)) return value;
    parsed.searchParams.set("token", state.guidelineFileToken);
    return parsed.href;
  } catch {
    return value;
  }
}

function safeMarkdownUrl(url) {
  const value = String(url || "").trim();
  if (/^(https?:|blob:)/i.test(value)) return value;
  return "";
}

function sanitizeGuidelineHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, style, iframe, object, embed, form").forEach(node => node.remove());
  template.content.querySelectorAll("*").forEach(node => {
    [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) node.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && !safeMarkdownUrl(attribute.value)) node.removeAttribute(attribute.name);
      if (name === "src" && node.hasAttribute(attribute.name)) node.setAttribute(attribute.name, protectedFileUrl(attribute.value));
    });
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    if (node.tagName === "IMG") {
      node.setAttribute("loading", "lazy");
    }
  });
  return template.innerHTML;
}

function fallbackMarkdown(markdown) {
  let html = escapeHtml(markdown)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const safe = safeMarkdownUrl(src);
      return safe ? `<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}">` : "";
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safe = safeMarkdownUrl(href);
      return safe ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    })
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
  html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
  return html;
}

function renderMarkdown(markdown) {
  const raw = String(markdown || "");
  if (window.marked?.parse) {
    try {
      return sanitizeGuidelineHtml(window.marked.parse(raw, { breaks: true, gfm: true }));
    } catch {
      return sanitizeGuidelineHtml(fallbackMarkdown(raw));
    }
  }
  return sanitizeGuidelineHtml(fallbackMarkdown(raw));
}

function getEditorHtml(editor) {
  if (editor?.__pawplateEditor) return editor.__pawplateEditor.getHTML().trim();
  const clone = editor.cloneNode(true);
  clone.querySelectorAll(".proofing-underline").forEach(node => node.replaceWith(document.createTextNode(node.textContent || "")));
  return clone.innerHTML.trim();
}

function getEditorText(editor) {
  if (editor?.__pawplateEditor) {
    try {
      return editor.__pawplateEditor.getText({ blockSeparator: "\n" }).replace(/\u00a0/g, " ");
    } catch {
      return editor.__pawplateEditor.getText().replace(/\u00a0/g, " ");
    }
  }
  return editor.innerText.replace(/\u00a0/g, " ");
}

function setEditorHtml(editor, value) {
  const html = reportHtml(value);
  if (editor?.__pawplateEditor) {
    editor.__pawplateEditor.commands.setContent(html, false, { preserveWhitespace: "full" });
  } else {
    editor.innerHTML = html;
  }
  updateProofing(editor);
}

function focusEditor(editor) {
  if (editor?.__pawplateEditor) {
    editor.__pawplateEditor.commands.focus();
    return;
  }
  editor?.focus();
}

function renderChoiceChips(container, choices, activeValue, group, className = "choice-chip") {
  if (!container) return;
  container.innerHTML = choices.map(choice => `
    <button class="${className} ${choice.value === activeValue ? "active" : ""}" type="button" data-choice-group="${escapeHtml(group)}" data-choice-value="${escapeHtml(choice.value)}">
      ${escapeHtml(choice.label)}
    </button>
  `).join("");
}

function choicesFromSelect(select) {
  return [...(select?.options || [])].map(option => ({ value: option.value, label: option.textContent || option.value }));
}

function showReferenceTab(tab) {
  state.referenceTab = tab;
  document.querySelectorAll("[data-reference-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.referenceTab === tab);
  });
  document.querySelectorAll("[data-reference-panel]").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.referencePanel === tab);
  });
}

function currentSnippetSchema() {
  const system = SNIPPET_SCHEMAS[state.snippet.system] || SNIPPET_SCHEMAS.tirads;
  const modality = system.modalities[state.snippet.modality] || Object.values(system.modalities)[0];
  const finding = modality.findings[state.snippet.finding] || Object.values(modality.findings)[0];
  return { system, modality, finding };
}

function optionLabel(value) {
  return String(value || "").replace(/([A-Z])/g, " $1").replace(/^./, char => char.toUpperCase());
}

function snippetValue(key) {
  return String(state.snippet.values[key] || "").trim();
}

function setSnippetDefaults() {
  const { finding } = currentSnippetSchema();
  const nextValues = {};
  for (const field of finding.fields) {
    nextValues[field.key] = state.snippet.values[field.key] || (field.type === "select" ? field.options[0] : "");
  }
  state.snippet.values = nextValues;
}

function sentenceCase(value) {
  const text = String(value || "").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

function indefiniteArticle(phrase) {
  const words = String(phrase || "").trim().split(/\s+/);
  const word = words.find(item => /^[a-z]/i.test(item)) || "";
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function joinPhrase(parts, separator = " ") {
  return parts.filter(Boolean).join(separator).replace(/\s+/g, " ").trim();
}

function tiradsScore(values) {
  const scoreMap = {
    composition: { cystic: 0, spongiform: 0, "mixed cystic and solid": 1, "predominantly solid": 2, solid: 2 },
    echogenicity: { anechoic: 0, hyperechoic: 1, isoechoic: 1, hypoechoic: 2, "very hypoechoic": 3 },
    shape: { "wider-than-tall": 0, "taller-than-wide": 3 },
    margin: { smooth: 0, "ill-defined": 0, lobulated: 2, irregular: 2, "extrathyroidal extension": 3 },
    foci: { none: 0, "comet-tail artifacts": 0, macrocalcifications: 1, "peripheral rim calcifications": 2, "punctate echogenic foci": 3 }
  };
  const total = Object.entries(scoreMap).reduce((sum, [key, map]) => sum + (map[values[key]] ?? 0), 0);
  const category = total >= 7 ? "TR5" : total >= 4 ? "TR4" : total >= 3 ? "TR3" : total >= 2 ? "TR2" : "TR1";
  return { total, category };
}

function buildSnippetText() {
  const { system, modality, finding } = currentSnippetSchema();
  const values = state.snippet.values;
  if (system === SNIPPET_SCHEMAS.tirads) {
    const score = tiradsScore(values);
    const size = snippetValue("size");
    const location = joinPhrase([values.side === "isthmic" ? "isthmus" : `${values.side} thyroid lobe`, values.region ? `at the ${values.region}` : ""], " ");
    const descriptors = joinPhrase([values.composition, values.echogenicity, values.shape, values.margin, values.foci !== "none" ? `with ${values.foci}` : ""], ", ");
    return sentenceCase(joinPhrase([size ? `A ${size}` : "A", descriptors, "nodule", location ? `is seen in the ${location}` : "is seen"]) + `. ${score.category} (${score.total} points).`);
  }
  if (system === SNIPPET_SCHEMAS.birads && modality.label === "Mammography" && finding.label === "Mass") {
    const descriptor = joinPhrase([values.shape, values.margin, values.density, "mass"]);
    const size = snippetValue("size");
    const lesion = joinPhrase([size ? `${size}` : "", descriptor]);
    const location = joinPhrase([values.breast, snippetValue("location") ? `at the ${snippetValue("location")}` : ""], " ");
    const associated = snippetValue("associated");
    return sentenceCase(joinPhrase([`There is ${size ? "a" : indefiniteArticle(descriptor)}`, lesion, location ? `in the ${location}` : "", associated ? `, with ${associated}` : ""]) + ".");
  }
  if (system === SNIPPET_SCHEMAS.birads && modality.label === "Mammography" && finding.label === "Calcification") {
    const location = joinPhrase([values.breast, snippetValue("location") ? `at the ${snippetValue("location")}` : ""], " ");
    return sentenceCase(joinPhrase([values.distribution, values.morphology, "calcifications are seen", location ? `in the ${location}` : ""]) + ".");
  }
  if (system === SNIPPET_SCHEMAS.birads && modality.label === "Ultrasound" && finding.label === "Mass") {
    const location = joinPhrase([
      values.breast,
      snippetValue("clock") ? `at ${snippetValue("clock")}` : "",
      snippetValue("distance"),
      values.depth
    ], ", ");
    const descriptor = joinPhrase([values.shape, values.orientation, values.margin, values.echo, "mass"]);
    const size = snippetValue("size");
    const lesion = joinPhrase([size ? `${size}` : "", descriptor]);
    const posterior = values.posterior && values.posterior !== "no posterior features" ? ` with ${values.posterior}` : "";
    const vascularity = values.vascularity ? ` and ${values.vascularity}` : "";
    return sentenceCase(joinPhrase([`There is ${size ? "a" : indefiniteArticle(descriptor)}`, lesion, location ? `in the ${location}` : ""]) + `${posterior}${vascularity}.`);
  }
  return "";
}

function combinedSnippetText() {
  return state.snippetItems.length ? state.snippetItems.map(item => item.text).join("\n") : buildSnippetText();
}

function renderSnippetGenerator() {
  if (!els.snippetSystemSelect) return;
  els.snippetSystemSelect.innerHTML = Object.entries(SNIPPET_SCHEMAS)
    .map(([value, schema]) => `<option value="${value}">${escapeHtml(schema.label)}</option>`)
    .join("");
  els.snippetSystemSelect.value = state.snippet.system;
  renderChoiceChips(
    els.snippetSystemRadios,
    Object.entries(SNIPPET_SCHEMAS).map(([value, schema]) => ({ value, label: schema.label })),
    state.snippet.system,
    "snippet-system"
  );
  const system = SNIPPET_SCHEMAS[state.snippet.system] || SNIPPET_SCHEMAS.tirads;
  if (!system.modalities[state.snippet.modality]) state.snippet.modality = Object.keys(system.modalities)[0];
  els.snippetModalitySelect.innerHTML = Object.entries(system.modalities)
    .map(([value, schema]) => `<option value="${value}">${escapeHtml(schema.label)}</option>`)
    .join("");
  els.snippetModalitySelect.value = state.snippet.modality;
  renderChoiceChips(
    els.snippetModalityRadios,
    Object.entries(system.modalities).map(([value, schema]) => ({ value, label: schema.label })),
    state.snippet.modality,
    "snippet-modality"
  );
  const modality = system.modalities[state.snippet.modality];
  if (!modality.findings[state.snippet.finding]) state.snippet.finding = Object.keys(modality.findings)[0];
  els.snippetFindingSelect.innerHTML = Object.entries(modality.findings)
    .map(([value, schema]) => `<option value="${value}">${escapeHtml(schema.label)}</option>`)
    .join("");
  els.snippetFindingSelect.value = state.snippet.finding;
  renderChoiceChips(
    els.snippetFindingRadios,
    Object.entries(modality.findings).map(([value, schema]) => ({ value, label: schema.label })),
    state.snippet.finding,
    "snippet-finding"
  );
  setSnippetDefaults();
  const { finding } = currentSnippetSchema();
  els.snippetFields.innerHTML = finding.fields.map(field => {
    const value = state.snippet.values[field.key] || "";
    if (field.type === "select") {
      return `
        <label class="snippet-field">
          <span>${escapeHtml(field.label)}</span>
          <div class="lexicon-chips">
            ${field.options.map(option => `
              <button class="choice-chip lexicon-chip ${option === value ? "active" : ""}" type="button" data-snippet-field="${escapeHtml(field.key)}" data-snippet-value="${escapeHtml(option)}">
                ${escapeHtml(optionLabel(option))}
              </button>
            `).join("")}
          </div>
        </label>
      `;
    }
    return `
      <label class="snippet-field">
        <span>${escapeHtml(field.label)}</span>
        <input data-snippet-field="${escapeHtml(field.key)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || "")}">
      </label>
    `;
  }).join("");
  const snippet = buildSnippetText();
  els.snippetPreviewText.textContent = snippet || "Pick lexicons to generate a sentence.";
  renderSnippetFindingList();
}

function renderSnippetFindingList() {
  if (!els.snippetFindingList) return;
  if (!state.snippetItems.length) {
    els.snippetFindingList.innerHTML = `<div class="empty mini-empty">Add findings here when there are multiple masses/nodules.</div>`;
    return;
  }
  els.snippetFindingList.innerHTML = state.snippetItems.map((item, index) => `
    <div class="snippet-finding-item">
      <span>${index + 1}.</span>
      <p>${escapeHtml(item.text)}</p>
      <button type="button" data-remove-snippet-item="${index}" aria-label="Remove finding">Remove</button>
    </div>
  `).join("");
}

function insertReportText(text) {
  const value = String(text || "").trim();
  if (!value) return;
  const editor = els.reportTextEditor;
  const tiptap = editor.__pawplateEditor;
  if (tiptap) {
    tiptap.chain().focus().insertContent(`${escapeHtml(value)}<p></p>`).run();
    updateProofing(editor, { fallback: false });
    return;
  }
  editor.focus();
  document.execCommand("insertText", false, `${value}\n`);
  updateProofing(editor);
}

function updateReportModeBadge() {
  if (!els.reportModeBadge) return;
  const editing = Boolean(state.reportDraftId);
  els.reportModeBadge.textContent = editing ? "Editing saved report" : "New report";
  els.reportModeBadge.classList.toggle("editing", editing);
}

function updateTemplateModeBadge() {
  if (!els.templateModeBadge) return;
  const editing = Boolean(state.templateDraftId);
  els.templateModeBadge.textContent = editing ? "Editing template" : "New template";
  els.templateModeBadge.classList.toggle("editing", editing);
}

function updateGuidelineModeBadge() {
  if (!els.guidelineModeBadge) return;
  const editing = Boolean(state.guidelineDraftId);
  els.guidelineModeBadge.textContent = editing ? "Editing guideline" : "New guideline";
  els.guidelineModeBadge.classList.toggle("editing", editing);
}

function resetTemplateDraft() {
  state.templateDraftId = null;
  updateTemplateModeBadge();
}

function resetGuidelineDraft() {
  state.guidelineDraftId = null;
  updateGuidelineModeBadge();
}

function resetReportDraft() {
  state.reportDraftId = null;
  state.reportDraftSourceDate = "";
  updateReportModeBadge();
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

function normalizeDictionaryWord(word) {
  return String(word || "")
    .replace(/^'+|'+$/g, "")
    .toLowerCase();
}

function isPersonalDictionaryWord(word) {
  const clean = normalizeDictionaryWord(word);
  return Boolean(clean) && state.personalDictionary.has(clean);
}

function isSuspiciousWord(word) {
  const clean = word.replace(/^'+|'+$/g, "");
  if (clean.length < 4) return false;
  if (/^\d/.test(clean)) return false;
  if (/^[A-Z]{2,}$/.test(clean)) return false;
  const lower = clean.toLowerCase();
  if (state.personalDictionary.has(lower)) return false;
  if (PROOFING_WORDS.has(lower) || PROOFING_ABBREVIATIONS.has(lower)) return false;
  if (/^[a-z]+(?:'[a-z]+)?$/.test(clean) && lower.length <= 5 && /^(cm|mm|ml|sec|min)s?$/.test(lower)) return false;
  if (/[A-Z][a-z]*[A-Z][a-z]/.test(clean)) return true;
  if (state.dictionary) return !state.dictionary.check(clean) && !state.dictionary.check(lower);
  if (!/[aeiou]/i.test(clean) && clean.length >= 5) return true;
  if (/(.)\1\1/i.test(clean)) return true;
  if (/[jqxz]{2,}/i.test(clean)) return true;
  if (clean.length >= 7 && !PROOFING_WORDS.has(lower)) return true;
  return clean.length >= 5 && !PROOFING_WORDS.has(lower) && !PROOFING_ABBREVIATIONS.has(lower) && /[bcdfghjklmnpqrstvwxyz]{4,}/i.test(clean);
}

function collectProofingMatches(editor) {
  const matches = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.nodeValue || "";
    for (const item of PROOFING_PATTERNS) {
      const regex = new RegExp(item.pattern.source, item.pattern.flags);
      let match;
      while ((match = regex.exec(text))) {
        matches.push({
          node,
          start: match.index,
          end: match.index + match[0].length,
          label: match[0],
          suggestion: item.suggestion || item.label,
          kind: "pattern"
        });
      }
    }
    const wordRegex = /\b[A-Za-z][A-Za-z']{2,}\b/g;
    let wordMatch;
    while ((wordMatch = wordRegex.exec(text))) {
      const word = wordMatch[0];
      if (!isSuspiciousWord(word)) continue;
      matches.push({
        node,
        start: wordMatch.index,
        end: wordMatch.index + word.length,
        label: word,
        suggestion: "check spelling",
        kind: "word"
      });
    }
  }
  return matches;
}

function proofingIssues(editor) {
  return collectProofingMatches(editor).map(match => ({
    label: match.label,
    suggestion: match.suggestion,
    kind: match.kind
  }));
}

function wordAtPoint(editor, x, y) {
  const position = document.caretPositionFromPoint?.(x, y);
  let node = position?.offsetNode;
  let offset = position?.offset;
  if (!node && document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    node = range?.startContainer;
    offset = range?.startOffset;
  }
  if (!node) return null;
  if (node.nodeType !== Node.TEXT_NODE) {
    node = node.childNodes?.[Math.max(0, Math.min(offset || 0, node.childNodes.length - 1))] || node;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    offset = Math.min(node.nodeValue?.length || 0, offset || 0);
  }
  if (!editor.contains(node)) return null;
  const text = node.nodeValue || "";
  const safeOffset = Math.max(0, Math.min(offset || 0, text.length));
  const wordRegex = /[A-Za-z][A-Za-z']{2,}/g;
  let match;
  while ((match = wordRegex.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (safeOffset >= start && safeOffset <= end) {
      return { word: match[0], node, start, end };
    }
  }
  return null;
}

function textOffsetForPoint(root, targetNode, targetOffset) {
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node === targetNode) return offset + targetOffset;
    offset += node.nodeValue?.length || 0;
  }
  return offset;
}

function pointForTextOffset(root, targetOffset) {
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.nodeValue?.length || 0;
    if (offset + length >= targetOffset) {
      return { node, offset: Math.max(0, targetOffset - offset) };
    }
    offset += length;
  }
  return { node: root, offset: root.childNodes.length };
}

function saveEditorSelection(editor) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
  return {
    start: textOffsetForPoint(editor, range.startContainer, range.startOffset),
    end: textOffsetForPoint(editor, range.endContainer, range.endOffset),
    collapsed: range.collapsed
  };
}

function restoreEditorSelection(editor, saved) {
  if (!saved) return;
  const selection = window.getSelection();
  if (!selection) return;
  const start = pointForTextOffset(editor, saved.start);
  const end = pointForTextOffset(editor, saved.collapsed ? saved.start : saved.end);
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function clearProofingFallback(editor) {
  const savedSelection = saveEditorSelection(editor);
  editor.querySelectorAll(".proofing-underline").forEach(node => node.replaceWith(document.createTextNode(node.textContent || "")));
  editor.normalize();
  restoreEditorSelection(editor, savedSelection);
}

function markProofingFallback(editor, issues) {
  const savedSelection = saveEditorSelection(editor);
  clearProofingFallback(editor);
  if (!issues.length) {
    restoreEditorSelection(editor, savedSelection);
    return;
  }
  collectProofingMatches(editor)
    .sort((a, b) => (a.node === b.node ? b.start - a.start : 0))
    .slice(0, 80)
    .forEach(({ node, start, end }) => {
      if (!node.parentNode || node.parentNode.closest?.(".proofing-underline")) return;
      const range = new Range();
      range.setStart(node, start);
      range.setEnd(node, end);
      const span = document.createElement("span");
      span.className = "proofing-underline";
      try {
        range.surroundContents(span);
      } catch {
        // If the editor changes under us, skip this mark and continue.
      }
    });
  restoreEditorSelection(editor, savedSelection);
}

function updateProofing(editor, options = {}) {
  if (!editor) return;
  const panel = editor === els.templateTextEditor ? els.templateProofing : els.reportProofing;
  const issues = proofingIssues(editor);
  if (options.fallback !== false && !editor.__pawplateEditor) markProofingFallback(editor, issues);
  if (window.CSS?.highlights) {
    const ranges = collectProofingMatches(editor).map(match => {
      const range = new Range();
      range.setStart(match.node, match.start);
      range.setEnd(match.node, match.end);
      return range;
    });
    if (ranges.length) {
      CSS.highlights.set(`pawplate-${editor.id}`, new Highlight(...ranges));
    } else {
      CSS.highlights.delete(`pawplate-${editor.id}`);
    }
  }
  if (!panel) return;
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

async function loadSpellchecker() {
  if (state.dictionaryReady) return;
  state.dictionaryReady = true;
  if (!window.Typo) return;
  try {
    const [affResponse, dicResponse] = await Promise.all([
      fetch(`${SPELLCHECK_DICTIONARY_URL}/en_US.aff`),
      fetch(`${SPELLCHECK_DICTIONARY_URL}/en_US.dic`)
    ]);
    if (!affResponse.ok || !dicResponse.ok) return;
    const [affData, dicData] = await Promise.all([affResponse.text(), dicResponse.text()]);
    state.dictionary = new Typo("en_US", affData, dicData);
    [els.templateTextEditor, els.reportTextEditor].forEach(editor => {
      updateProofing(editor, { fallback: document.activeElement !== editor });
    });
  } catch (error) {
    console.warn("Spellchecker dictionary unavailable; using fallback proofing.", error);
  }
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
  if (scope === "template") {
    renderChoiceChips(els.templateModalityRadios, choicesFromSelect(modalityFilter), modalityFilter.value, "template-modality");
    renderChoiceChips(els.templateTypeRadios, TEMPLATE_TYPE_FILTERS, els.templateTypeFilter.value, "template-type");
  }
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

function personalDictionaryKey() {
  return `${PERSONAL_DICTIONARY_KEY_PREFIX}${state.auth?.user?.id || "anonymous"}`;
}

function readLocalPersonalDictionary() {
  try {
    const saved = JSON.parse(localStorage.getItem(personalDictionaryKey()) || "[]");
    if (Array.isArray(saved)) return saved.map(normalizeDictionaryWord).filter(Boolean);
  } catch {
    // Broken dictionary cache should not block proofing.
  }
  return [];
}

function writeLocalPersonalDictionary(words = [...state.personalDictionary]) {
  localStorage.setItem(personalDictionaryKey(), JSON.stringify([...new Set(words.map(normalizeDictionaryWord).filter(Boolean))].sort()));
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

function scheduleEditorProofing(editor) {
  window.clearTimeout(state.editorUpdateTimers.get(editor));
  state.editorUpdateTimers.set(editor, window.setTimeout(() => {
    updateProofing(editor, { fallback: false });
  }, 120));
}

async function loadTiptapModules() {
  const version = TIPTAP_VERSION;
  const urls = {
    core: `${TIPTAP_CDN}/@tiptap/core@${version}`,
    starter: `${TIPTAP_CDN}/@tiptap/starter-kit@${version}`,
    underline: `${TIPTAP_CDN}/@tiptap/extension-underline@${version}`,
    textStyle: `${TIPTAP_CDN}/@tiptap/extension-text-style@${version}`,
    color: `${TIPTAP_CDN}/@tiptap/extension-color@${version}`,
    highlight: `${TIPTAP_CDN}/@tiptap/extension-highlight@${version}`,
    placeholder: `${TIPTAP_CDN}/@tiptap/extension-placeholder@${version}`
  };
  const [core, starter, underline, textStyle, color, highlight, placeholder] = await Promise.all([
    import(urls.core),
    import(urls.starter),
    import(urls.underline),
    import(urls.textStyle),
    import(urls.color),
    import(urls.highlight),
    import(urls.placeholder)
  ]);
  return {
    Editor: core.Editor,
    Extension: core.Extension,
    StarterKit: starter.default || starter.StarterKit,
    Underline: underline.default || underline.Underline,
    TextStyle: textStyle.default || textStyle.TextStyle,
    Color: color.default || color.Color,
    Highlight: highlight.default || highlight.Highlight,
    Placeholder: placeholder.default || placeholder.Placeholder
  };
}

async function initTiptapEditors() {
  if (state.tiptapReady) return;
  try {
    const {
      Editor,
      Extension,
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight,
      Placeholder
    } = await loadTiptapModules();
    const TabSpaces = Extension.create({
      name: "tabSpaces",
      addKeyboardShortcuts() {
        return {
          Tab: () => {
            this.editor.commands.insertContent("    ");
            return true;
          },
          "Shift-Tab": () => {
            this.editor.commands.insertContent("    ");
            return true;
          }
        };
      }
    });
    [els.templateTextEditor, els.reportTextEditor].forEach(element => {
      if (!element || element.__pawplateEditor) return;
      const placeholder = element.dataset.placeholder || "";
      const initialContent = element.innerHTML || "";
      element.removeAttribute("contenteditable");
      element.classList.add("tiptap-host");
      const editor = new Editor({
        element,
        content: initialContent,
        extensions: [
          StarterKit.configure({
            history: true,
            bulletList: false,
            orderedList: false,
            listItem: false,
            heading: false,
            blockquote: false,
            codeBlock: false
          }),
          Underline,
          TextStyle,
          Color,
          Highlight.configure({ multicolor: true }),
          Placeholder.configure({ placeholder }),
          TabSpaces
        ],
        editorProps: {
          attributes: {
            class: "pawplate-prosemirror",
            spellcheck: "true",
            lang: "en-US",
            autocapitalize: "sentences"
          }
        },
        parseOptions: { preserveWhitespace: "full" },
        onUpdate: () => scheduleEditorProofing(element),
        onFocus: () => clearProofingFallback(element),
        onBlur: () => updateProofing(element)
      });
      element.__pawplateEditor = editor;
    });
    state.tiptapReady = true;
  } catch (error) {
    console.warn("TipTap unavailable; using the fallback editor.", error);
  }
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
  state.guidelines = [];
  state.writerGuidelines = [];
  state.workLogReports = [];
  state.selectedOldReport = null;
  state.selectedTemplate = null;
  state.selectedGuideline = null;
  state.selectedWriterGuideline = null;
  state.guidelineFileToken = "";
  state.guidelineFileTokenExpiresAt = 0;
  resetGuidelineDraft();
  resetReportDraft();
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

async function ensureGuidelineFileToken() {
  if (!state.auth?.token) return "";
  if (state.guidelineFileToken && Date.now() < state.guidelineFileTokenExpiresAt) return state.guidelineFileToken;
  const response = await fetch(`${POCKETBASE_URL.replace(/\/$/, "")}/api/files/token`, {
    method: "POST",
    headers: authHeaders()
  });
  if (!response.ok) {
    console.warn("Protected file token unavailable.", await response.text());
    return "";
  }
  const data = await response.json();
  state.guidelineFileToken = data.token || "";
  state.guidelineFileTokenExpiresAt = Date.now() + 90 * 1000;
  return state.guidelineFileToken;
}

async function pbUploadFiles(collection, id, field, files) {
  const formData = new FormData();
  [...files].forEach(file => formData.append(`${field}+`, file));
  const response = await fetch(`${API}/${collection}/records/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: formData
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function friendlyErrorMessage(error) {
  const raw = error?.message || String(error || "");
  try {
    const data = JSON.parse(raw);
    const fieldMessages = Object.values(data.data || {})
      .map(item => item?.message)
      .filter(Boolean);
    return fieldMessages[0] || data.message || raw;
  } catch {
    return raw;
  }
}

function pbFileUrl(collection, recordId, filename) {
  return `${POCKETBASE_URL.replace(/\/$/, "")}/api/files/${collection}/${recordId}/${encodeURIComponent(filename)}`;
}

async function loadPersonalDictionary() {
  state.userSettingsId = "";
  state.personalDictionary = new Set(readLocalPersonalDictionary());
  try {
    const filter = `owner="${state.auth?.user?.id || ""}" && key="personalDictionary"`;
    const data = await pbList("user_settings", {
      perPage: 1,
      filter,
      fields: "id,value"
    });
    const record = data.items?.[0];
    if (!record) return;
    state.userSettingsId = record.id;
    const words = Array.isArray(record.value?.words) ? record.value.words : [];
    state.personalDictionary = new Set(words.map(normalizeDictionaryWord).filter(Boolean));
    writeLocalPersonalDictionary();
  } catch (error) {
    console.warn("Personal dictionary sync unavailable; using local cache.", error);
  }
}

async function savePersonalDictionary() {
  const value = { words: [...state.personalDictionary].sort() };
  writeLocalPersonalDictionary(value.words);
  try {
    if (state.userSettingsId) {
      await pbUpdate("user_settings", state.userSettingsId, { value });
      return;
    }
    const created = await pbCreate("user_settings", {
      owner: state.auth?.user?.id || "",
      key: "personalDictionary",
      value
    });
    state.userSettingsId = created.id;
  } catch (error) {
    console.warn("Personal dictionary saved locally only.", error);
  }
}

async function addPersonalDictionaryWord(word, editor = document.activeElement) {
  const clean = normalizeDictionaryWord(word);
  if (!clean) return;
  state.personalDictionary.add(clean);
  await savePersonalDictionary();
  [els.templateTextEditor, els.reportTextEditor].forEach(item => {
    updateProofing(item, { fallback: document.activeElement !== item });
  });
  showToast("Added to dictionary", clean);
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
  els.guidelineModeBtn.classList.toggle("active", mode === "guidelines");
  els.worklogModeBtn.classList.toggle("active", mode === "worklog");
  els.builderView.classList.toggle("hidden", mode !== "builder");
  els.writerView.classList.toggle("hidden", mode !== "writer");
  els.guidelineView.classList.toggle("hidden", mode !== "guidelines");
  els.worklogView.classList.toggle("hidden", mode !== "worklog");
  if (mode === "writer") {
    loadTemplates();
    loadWriterGuidelines();
  }
  if (mode === "guidelines") loadGuidelines();
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
  resetTemplateDraft();
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
  resetTemplateDraft();
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
    updateTemplateModeBadge();
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

function guidelineData() {
  const title = els.guidelineTitleInput.value.trim() || "Untitled guideline";
  return {
    title,
    modality: els.guidelineModalityInput.value.trim(),
    topic: els.guidelineTopicInput.value.trim(),
    bodyPart: els.guidelineBodyPartInput.value.trim(),
    tags: els.guidelineTagsInput.value.trim(),
    markdown: els.guidelineMarkdownInput.value,
    keywords: `${title} ${els.guidelineModalityInput.value} ${els.guidelineTopicInput.value} ${els.guidelineBodyPartInput.value} ${els.guidelineTagsInput.value} ${els.guidelineMarkdownInput.value}`.slice(0, 8000),
    owner: state.auth?.user?.id || ""
  };
}

function guidelineFilter(searchInput = els.guidelineSearchInput) {
  const clauses = [];
  const query = searchInput?.value?.trim() || "";
  if (query) {
    const q = escapeFilter(query);
    clauses.push(`(title~"${q}" || markdown~"${q}" || keywords~"${q}" || tags~"${q}" || bodyPart~"${q}" || topic~"${q}" || modality~"${q}")`);
  }
  return clauses.join(" && ");
}

async function loadGuidelines() {
  try {
    await ensureGuidelineFileToken();
    const query = els.guidelineSearchInput.value.trim();
    const data = await pbList("guidelines", {
      page: 1,
      perPage: 100,
      filter: guidelineFilter(els.guidelineSearchInput)
    });
    state.guidelines = data.items;
    renderGuidelines(query);
    if (!state.selectedGuideline && data.items.length) selectGuideline(data.items[0].id);
  } catch (error) {
    console.warn("Guidelines failed to load.", error);
    state.guidelines = [];
    els.guidelineList.innerHTML = `<div class="empty">Could not load guidelines. Refresh and try again.</div>`;
  }
}

async function loadWriterGuidelines() {
  try {
    await ensureGuidelineFileToken();
    const query = els.writerGuidelineSearchInput.value.trim();
    const data = await pbList("guidelines", {
      page: 1,
      perPage: 30,
      filter: guidelineFilter(els.writerGuidelineSearchInput)
    });
    state.writerGuidelines = data.items;
    renderWriterGuidelines(query);
    if (!state.selectedWriterGuideline && data.items.length) selectWriterGuideline(data.items[0].id);
  } catch (error) {
    console.warn("Writer guidelines failed to load.", error);
    state.writerGuidelines = [];
    els.writerGuidelineList.innerHTML = `<div class="empty">Could not load guidelines. Open Guidelines or refresh.</div>`;
    renderWriterGuidelinePreview(null);
  }
}

function guidelineMeta(item) {
  return [item.modality, item.topic, item.bodyPart, item.tags].filter(Boolean).join(" / ") || "Guideline";
}

function renderGuidelines(query = els.guidelineSearchInput.value.trim()) {
  if (!state.guidelines.length) {
    els.guidelineList.innerHTML = `<div class="empty">No saved guidelines for this user yet. Add a title and save one here.</div>`;
    renderGuidelinePreview(null);
    return;
  }
  els.guidelineList.innerHTML = state.guidelines.map((item, index) => `
    <button class="result-item ${state.selectedGuideline?.id === item.id ? "active" : ""}" data-guideline-id="${item.id}" type="button">
      <span class="result-no">${index + 1}.</span>
      <span>
        <span class="result-title">${highlight(item.title || "Untitled", query)}</span>
        <span class="result-meta">${escapeHtml(guidelineMeta(item))}</span>
        <span class="result-snippet">${highlight(snippet(item.markdown, query), query)}</span>
      </span>
    </button>
  `).join("");
}

function renderWriterGuidelines(query = els.writerGuidelineSearchInput.value.trim()) {
  if (!state.writerGuidelines.length) {
    els.writerGuidelineList.innerHTML = `<div class="empty">No saved guidelines for this user yet. Open Guidelines to create one.</div>`;
    renderWriterGuidelinePreview(null);
    return;
  }
  els.writerGuidelineList.innerHTML = state.writerGuidelines.map((item, index) => `
    <button class="result-item ${state.selectedWriterGuideline?.id === item.id ? "active" : ""}" data-writer-guideline-id="${item.id}" type="button">
      <span class="result-no">${index + 1}.</span>
      <span>
        <span class="result-title">${highlight(item.title || "Untitled", query)}</span>
        <span class="result-meta">${escapeHtml(guidelineMeta(item))}</span>
      </span>
    </button>
  `).join("");
}

function renderGuidelinePreview(guideline = state.selectedGuideline) {
  els.guidelinePreviewTitle.textContent = guideline?.title || "Markdown preview";
  els.guidelinePreview.innerHTML = renderMarkdown(guideline?.markdown ?? els.guidelineMarkdownInput.value);
}

function renderWriterGuidelinePreview(guideline = state.selectedWriterGuideline) {
  els.writerGuidelineTitle.textContent = guideline?.title || "Select a guideline";
  els.writerGuidelinePreview.innerHTML = guideline ? renderMarkdown(guideline.markdown) : "";
}

function selectGuideline(id) {
  const guideline = state.guidelines.find(item => item.id === id);
  if (!guideline) return;
  state.selectedGuideline = guideline;
  renderGuidelines();
  renderGuidelinePreview(guideline);
}

function selectWriterGuideline(id) {
  const guideline = state.writerGuidelines.find(item => item.id === id);
  if (!guideline) return;
  state.selectedWriterGuideline = guideline;
  renderWriterGuidelines();
  renderWriterGuidelinePreview(guideline);
}

async function refreshGuidelineViews(preferredId = state.guidelineDraftId) {
  try {
    await loadGuidelines();
    await loadWriterGuidelines();
    if (preferredId) {
      const guideline = state.guidelines.find(item => item.id === preferredId);
      const writerGuideline = state.writerGuidelines.find(item => item.id === preferredId);
      if (guideline) {
        state.selectedGuideline = guideline;
        renderGuidelines();
        renderGuidelinePreview(guideline);
      }
      if (writerGuideline) {
        state.selectedWriterGuideline = writerGuideline;
        renderWriterGuidelines();
        renderWriterGuidelinePreview(writerGuideline);
      }
    }
  } catch (error) {
    console.warn("Guideline saved, but refresh failed.", error);
  }
}

function blankGuideline() {
  resetGuidelineDraft();
  state.selectedGuideline = null;
  els.guidelineTitleInput.value = "";
  els.guidelineModalityInput.value = "";
  els.guidelineTopicInput.value = "";
  els.guidelineBodyPartInput.value = "";
  els.guidelineTagsInput.value = "";
  els.guidelineMarkdownInput.value = "";
  renderGuidelinePreview(null);
  els.guidelineTitleInput.focus();
}

function editGuideline(id) {
  const guideline = state.guidelines.find(item => item.id === id) || state.writerGuidelines.find(item => item.id === id);
  if (!guideline) return;
  state.guidelineDraftId = guideline.id;
  state.selectedGuideline = guideline;
  updateGuidelineModeBadge();
  els.guidelineTitleInput.value = guideline.title || "";
  els.guidelineModalityInput.value = guideline.modality || "";
  els.guidelineTopicInput.value = guideline.topic || "";
  els.guidelineBodyPartInput.value = guideline.bodyPart || "";
  els.guidelineTagsInput.value = guideline.tags || "";
  els.guidelineMarkdownInput.value = guideline.markdown || "";
  renderGuidelinePreview(guideline);
  showMode("guidelines");
}

async function saveGuideline() {
  const data = guidelineData();
  if (!data.title.trim()) {
    showToast("Title needed", "Add a guideline title first.", "info");
    return false;
  }
  if (/!\[[^\]]*\]\(\s*data:image\//i.test(data.markdown)) {
    showToast("Image too large", "Remove pasted base64 image text and use the Image button to upload it.", "error");
    return false;
  }
  let saved;
  if (state.guidelineDraftId) {
    saved = await pbUpdate("guidelines", state.guidelineDraftId, data);
  } else {
    saved = await pbCreate("guidelines", data);
    state.guidelineDraftId = saved.id;
    updateGuidelineModeBadge();
  }
  state.selectedGuideline = saved;
  renderGuidelinePreview(saved);
  showToast("Guideline saved", data.title);
  refreshGuidelineViews(saved.id);
  return true;
}

function insertGuidelineMarkdown(text) {
  const input = els.guidelineMarkdownInput;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
  const next = start + text.length;
  input.focus();
  input.setSelectionRange(next, next);
  renderGuidelinePreview(null);
}

function imageAltFromName(name) {
  return String(name || "image")
    .replace(/\.[^.]+$/, "")
    .replace(/[()[\]]/g, "")
    .replace(/^_+/, "")
    .trim() || "image";
}

function imageUrlFromHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const image = template.content.querySelector("img[src]");
  return image?.getAttribute("src") || "";
}

function isImageUrl(value) {
  return /^https?:\/\/\S+\.(?:jpe?g|png|gif|webp|svg)(?:[?#]\S*)?$/i.test(String(value || "").trim());
}

async function ensureGuidelineRecordForUpload() {
  if (state.guidelineDraftId) return state.guidelineDraftId;
  const data = guidelineData();
  const created = await pbCreate("guidelines", {
    ...data
  });
  state.guidelineDraftId = created.id;
  state.selectedGuideline = created;
  updateGuidelineModeBadge();
  refreshGuidelineViews(created.id);
  return created.id;
}

async function uploadGuidelineImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Image only", "Choose a PNG, JPG, GIF, or similar image.", "info");
    return;
  }
  const maxImageMb = 8;
  if (file.size > maxImageMb * 1024 * 1024) {
    showToast("Image too large", `Choose an image under ${maxImageMb} MB.`, "error");
    return;
  }
  try {
    showToast("Uploading image", file.name, "info");
    const recordId = await ensureGuidelineRecordForUpload();
    const before = state.selectedGuideline?.images || [];
    const updated = await pbUploadFiles("guidelines", recordId, "images", [file]);
    const uploaded = [...(updated.images || [])].find(name => !before.includes(name)) || [...(updated.images || [])].at(-1);
    if (!uploaded) throw new Error("PocketBase did not return an uploaded image filename.");
    const alt = imageAltFromName(file.name);
    insertGuidelineMarkdown(`\n![${alt}](${pbFileUrl("guidelines", recordId, uploaded)})\n`);
    const saved = await pbUpdate("guidelines", recordId, guidelineData());
    state.selectedGuideline = saved;
    renderGuidelinePreview(saved);
    showToast("Image added", "Linked in the guideline Markdown.");
    refreshGuidelineViews(recordId);
  } catch (error) {
    showToast("Image upload failed", friendlyErrorMessage(error), "error");
  }
}

async function uploadGuidelineImageUrl(url) {
  const cleanUrl = String(url || "").trim();
  if (!isImageUrl(cleanUrl)) return false;
  try {
    showToast("Importing image", cleanUrl, "info");
    const response = await fetch(cleanUrl, { mode: "cors" });
    if (!response.ok) throw new Error(`Image request failed (${response.status}).`);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("The URL did not return an image.");
    const filename = decodeURIComponent(new URL(cleanUrl).pathname.split("/").pop() || "image.jpg");
    await uploadGuidelineImageFile(new File([blob], filename, { type: blob.type || "image/jpeg" }));
    return true;
  } catch (error) {
    insertGuidelineMarkdown(`\n![${imageAltFromName(cleanUrl.split("/").pop() || "image")}](${cleanUrl})\n`);
    showToast("Linked external image", "This site blocks browser import, so the guideline uses the image URL.");
    return true;
  }
}

async function insertGuidelineImage(fileOrUrl) {
  if (typeof fileOrUrl === "string") {
    await uploadGuidelineImageUrl(fileOrUrl);
    return;
  }
  await uploadGuidelineImageFile(fileOrUrl);
}

async function handleGuidelinePaste(event) {
  const clipboard = event.clipboardData;
  if (!clipboard) return;
  const imageFile = [...clipboard.files].find(file => file.type.startsWith("image/"));
  if (imageFile) {
    event.preventDefault();
    await uploadGuidelineImageFile(imageFile);
    return;
  }
  const htmlUrl = imageUrlFromHtml(clipboard.getData("text/html"));
  if (htmlUrl && isImageUrl(htmlUrl)) {
    event.preventDefault();
    await uploadGuidelineImageUrl(htmlUrl);
    return;
  }
  const text = clipboard.getData("text/plain").trim();
  if (isImageUrl(text)) {
    event.preventDefault();
    await uploadGuidelineImageUrl(text);
  }
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
  resetReportDraft();
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

function blankReport() {
  resetReportDraft();
  state.selectedTemplate = null;
  els.reportTitleInput.value = "";
  els.reportModalityInput.value = "";
  els.reportTopicInput.value = "";
  els.reportBodyPartInput.value = "";
  els.reportKeywordInput.value = "";
  els.reportNoteInput.value = "";
  els.reportInterestingInput.checked = false;
  setEditorHtml(els.reportTextEditor, "");
  updateEditorDatalists("report");
  showMode("writer");
  els.reportTitleInput.focus();
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
  updateTemplateModeBadge();
  els.templateTitleInput.value = template.title || "";
  els.templateModalityInput.value = template.modality || "";
  els.templateTopicInput.value = template.topic || "";
  els.templateBodyPartInput.value = template.bodyPart || "";
  setTemplateKind(template.kind || "normal");
  setEditorHtml(els.templateTextEditor, template.report || "");
  updateEditorDatalists("template");
  showMode("builder");
  focusEditor(els.templateTextEditor);
}

function reportData() {
  const existingReport = state.reportDraftId
    ? state.workLogReports.find(item => item.id === state.reportDraftId)
    : null;
  return {
    title: els.reportTitleInput.value.trim() || "Untitled report",
    modality: els.reportModalityInput.value.trim(),
    topic: els.reportTopicInput.value.trim(),
    bodyPart: els.reportBodyPartInput.value.trim(),
    kind: "final-report",
    report: getEditorHtml(els.reportTextEditor),
    keywords: `${els.reportTitleInput.value} ${els.reportTopicInput.value} ${els.reportBodyPartInput.value} ${els.reportKeywordInput.value} ${els.reportNoteInput.value}`,
    sourceType: "final-report",
    sourceDate: state.reportDraftSourceDate || new Date().toISOString(),
    note: els.reportNoteInput.value.trim(),
    isInteresting: els.reportInterestingInput.checked,
    isReviewed: Boolean(existingReport?.isReviewed),
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
  const wasExisting = Boolean(state.reportDraftId);
  if (state.reportDraftId) {
    await pbUpdate("old_reports", state.reportDraftId, data);
  } else {
    const created = await pbCreate("old_reports", data);
    state.reportDraftId = created.id;
    state.reportDraftSourceDate = created.sourceDate || data.sourceDate;
    updateReportModeBadge();
  }
  els.oldSearchInput.value = data.title;
  state.selectedOldReport = null;
  await loadOldReports();
  await loadWorkLog();
  showToast(wasExisting ? "Report updated" : "Report created", data.isInteresting ? "Saved and marked as interesting." : "Updated in Old Reports and Work Log.");
  showMode("builder");
  return true;
}

function savedDate(report) {
  const value = report.sourceDate || report.created;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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

function filteredWorklogReports() {
  const query = els.worklogSearchInput.value.trim();
  return state.workLogReports
    .filter(report => reportMatchesQuery(report, query))
    .filter(report => !state.worklogSelectedDate || dateKey(savedDate(report) || new Date(0)) === state.worklogSelectedDate);
}

function worklogDateCounts() {
  const counts = new Map();
  for (const report of state.workLogReports) {
    const date = savedDate(report);
    if (!date) continue;
    const key = dateKey(date);
    const bucket = counts.get(key) || { total: 0, reviewed: 0, unreviewed: 0 };
    bucket.total += 1;
    if (report.isReviewed) bucket.reviewed += 1;
    else bucket.unreviewed += 1;
    counts.set(key, bucket);
  }
  return counts;
}

async function loadWorkLog() {
  const data = await pbList("old_reports", {
    page: 1,
    perPage: 500,
    sort: "-created",
    filter: 'sourceType="final-report"',
    fields: "id,title,modality,topic,bodyPart,keywords,report,sourceDate,created,note,isInteresting,isReviewed,owner"
  });
  state.workLogReports = data.items;
  if (state.selectedWorklogReport) {
    state.selectedWorklogReport = state.workLogReports.find(item => item.id === state.selectedWorklogReport.id) || null;
  }
  renderWorkLog();
  renderInterestingCases();
  renderWorklogPreview();
}

function renderWorkLog() {
  const query = els.worklogSearchInput.value.trim();
  const reports = filteredWorklogReports();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = worklogDateCounts();
  const todayCount = counts.get(dateKey(today))?.total || 0;
  const interestingCount = state.workLogReports.filter(report => report.isInteresting).length;
  const reviewCount = state.workLogReports.filter(report => report.isReviewed).length;
  const unreviewedCount = state.workLogReports.length - reviewCount;
  const visibleUnreviewedCount = reports.filter(report => !report.isReviewed).length;
  const activeDays = counts.size;
  els.worklogSummary.innerHTML = [
    ["Total reports", state.workLogReports.length],
    ["Saved today", todayCount],
    ["Active days", activeDays],
    ["Interesting", interestingCount],
    ["Unreviewed", unreviewedCount]
  ].map(([label, value]) => `<div class="summary-card"><strong>${value}</strong><span>${label}</span></div>`).join("");
  if (els.reviewVisibleReportsBtn) {
    els.reviewVisibleReportsBtn.disabled = !visibleUnreviewedCount;
    els.reviewVisibleReportsBtn.textContent = visibleUnreviewedCount ? `Review all (${visibleUnreviewedCount})` : "All reviewed";
  }

  renderWorklogCalendar(counts, today);

  if (!reports.length) {
    els.worklogList.innerHTML = `<div class="empty">${state.worklogSelectedDate ? `No saved reports on ${escapeHtml(state.worklogSelectedDate)}.` : "Saved reports will build your personal work log here."}</div>`;
    return;
  }
  els.worklogList.innerHTML = reports.map((report, index) => {
    const date = savedDate(report);
    return `
      <button class="result-item ${state.selectedWorklogReport?.id === report.id ? "active" : ""}" data-worklog-id="${report.id}" type="button">
        <span class="result-no">${index + 1}.</span>
        <span>
          <span class="result-title">${highlight(report.title || "Untitled", query)}${report.isInteresting ? '<span class="interesting-badge">Interesting</span>' : ""}${report.isReviewed ? '<span class="review-badge reviewed">Reviewed</span>' : '<span class="review-badge">Unreviewed</span>'}</span>
          <span class="result-meta">${escapeHtml(date ? dateKey(date) : "No date")} / ${escapeHtml(report.modality || "Modality")} / ${escapeHtml(report.topic || "Topic")} / ${escapeHtml(report.bodyPart || "Body part")}</span>
          ${report.note ? `<span class="result-snippet">${highlight(report.note, query)}</span>` : ""}
        </span>
      </button>
    `;
  }).join("");
}

function selectWorklogReport(id) {
  const report = state.workLogReports.find(item => item.id === id);
  if (!report) return;
  state.selectedWorklogReport = report;
  renderWorkLog();
  renderInterestingCases();
  renderWorklogPreview();
}

function closeWorklogPreview() {
  state.selectedWorklogReport = null;
  renderWorkLog();
  renderInterestingCases();
  renderWorklogPreview();
}

function renderWorklogPreview() {
  const report = state.selectedWorklogReport;
  if (!report) {
    els.worklogPreviewTitle.textContent = "Select a report";
    els.worklogPreviewMeta.textContent = "";
    els.worklogPreviewText.textContent = "Click a saved report or interesting case to preview it here.";
    els.editWorklogReportBtn.disabled = true;
    return;
  }
  const date = savedDate(report);
  els.worklogPreviewTitle.textContent = report.title || "Untitled";
  els.worklogPreviewMeta.innerHTML = [
    date ? dateKey(date) : "",
    report.isReviewed ? "Reviewed" : "Unreviewed",
    report.modality,
    report.topic,
    report.bodyPart,
    report.note
  ].filter(Boolean).map(escapeHtml).join(" / ");
  els.worklogPreviewText.innerHTML = reportHtml(report.report);
  els.editWorklogReportBtn.disabled = false;
}

async function toggleWorklogReview(id) {
  const report = state.workLogReports.find(item => item.id === id);
  if (!report) return;
  await pbUpdate("old_reports", id, { isReviewed: !report.isReviewed });
  await loadWorkLog();
  showToast(report.isReviewed ? "Marked unreviewed" : "Marked reviewed", report.title || "Saved report");
}

async function reviewVisibleReports() {
  const reports = filteredWorklogReports().filter(report => !report.isReviewed);
  if (!reports.length) {
    showToast("All reviewed", "No visible reports need review.", "info");
    return;
  }
  await Promise.all(reports.map(report => pbUpdate("old_reports", report.id, { isReviewed: true })));
  await loadWorkLog();
  showToast("Marked reviewed", `${reports.length} report${reports.length === 1 ? "" : "s"} updated.`);
}

async function editWorklogDate(id) {
  const report = state.workLogReports.find(item => item.id === id);
  if (!report) return;
  const currentDate = savedDate(report);
  const current = currentDate ? dateKey(currentDate) : dateKey(new Date());
  const next = prompt("Set report date (YYYY-MM-DD)", current);
  if (next === null) return;
  const trimmed = next.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    showToast("Date not changed", "Use YYYY-MM-DD format.", "error");
    return;
  }
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || dateKey(parsed) !== trimmed) {
    showToast("Date not changed", "That date is not valid.", "error");
    return;
  }
  const sourceDate = parsed.toISOString();
  await pbUpdate("old_reports", id, { sourceDate });
  if (state.reportDraftId === id) state.reportDraftSourceDate = sourceDate;
  state.worklogMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  state.worklogSelectedDate = trimmed;
  await loadWorkLog();
  await loadOldReports();
  showToast("Report date updated", trimmed);
}

function renderWorklogCalendar(counts, today) {
  const month = state.worklogMonth;
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const blanks = firstDay.getDay();
  const cells = [];
  for (let i = 0; i < blanks; i += 1) {
    cells.push(`<div class="calendar-day empty-day" aria-hidden="true"></div>`);
  }
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const key = dateKey(date);
    const dayCounts = counts.get(key) || { total: 0, reviewed: 0, unreviewed: 0 };
    const count = dayCounts.total;
    const level = count >= 4 ? 4 : count;
    const classes = [
      "calendar-day",
      `level-${level}`,
      key === dateKey(today) ? "today" : "",
      key === state.worklogSelectedDate ? "selected" : ""
    ].filter(Boolean).join(" ");
    cells.push(`
      <button class="${classes}" type="button" data-worklog-date="${key}" title="${key}: ${count} total, ${dayCounts.unreviewed} unreviewed, ${dayCounts.reviewed} reviewed">
        <span class="calendar-number">${day}</span>
        ${count ? `
          <span class="calendar-counts">
            <span class="calendar-count total" title="Total">${count}</span>
            <span class="calendar-count unreviewed" title="Unreviewed">${dayCounts.unreviewed}</span>
            <span class="calendar-count reviewed" title="Reviewed">${dayCounts.reviewed}</span>
          </span>
        ` : ""}
      </button>
    `);
  }
  els.worklogHeatmap.innerHTML = `
    <div class="calendar-head">
      <button type="button" data-calendar-action="prev" aria-label="Previous month">&lt;</button>
      <strong>${escapeHtml(monthKey(month))}</strong>
      <div>
        ${state.worklogSelectedDate ? `<button type="button" data-calendar-action="clear">Clear</button>` : ""}
        ${sameMonth(month, today) ? "" : `<button type="button" data-calendar-action="today">Today</button>`}
        <button type="button" data-calendar-action="next" aria-label="Next month">&gt;</button>
      </div>
    </div>
    <div class="calendar-weekdays">
      ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => `<span>${day}</span>`).join("")}
    </div>
    <div class="calendar-grid">${cells.join("")}</div>
    <div class="calendar-filter">${state.worklogSelectedDate ? `Filtered to ${escapeHtml(state.worklogSelectedDate)}` : "Click a date to filter saved reports."}</div>
  `;
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
    <button class="result-item ${state.selectedWorklogReport?.id === report.id ? "active" : ""}" data-interesting-id="${report.id}" type="button">
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
  const report = state.workLogReports.find(item => item.id === id) || state.selectedWorklogReport;
  if (!report) return;
  state.reportDraftId = report.id;
  state.reportDraftSourceDate = report.sourceDate || report.created || "";
  updateReportModeBadge();
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
  const tiptap = editor.__pawplateEditor;
  if (tiptap) {
    const chain = tiptap.chain().focus();
    const value = button.dataset.value || null;
    if (button.dataset.command === "bold") chain.toggleBold().run();
    if (button.dataset.command === "italic") chain.toggleItalic().run();
    if (button.dataset.command === "underline") chain.toggleUnderline().run();
    if (button.dataset.command === "foreColor" && value) chain.setColor(value).run();
    if (button.dataset.command === "backColor" && value) chain.setHighlight({ color: value }).run();
    updateProofing(editor, { fallback: false });
    return;
  }
  editor.focus();
  document.execCommand(button.dataset.command, false, button.dataset.value || null);
}

els.builderModeBtn.addEventListener("click", () => showMode("builder"));
els.writerModeBtn.addEventListener("click", () => showMode("writer"));
els.guidelineModeBtn.addEventListener("click", () => showMode("guidelines"));
els.worklogModeBtn.addEventListener("click", () => showMode("worklog"));
els.themeToggleBtn.addEventListener("click", toggleTheme);
document.querySelectorAll("[data-reference-tab]").forEach(button => {
  button.addEventListener("click", () => showReferenceTab(button.dataset.referenceTab));
});
els.templateModalityRadios?.addEventListener("click", event => {
  const button = event.target.closest("[data-choice-value]");
  if (!button) return;
  els.templateModalityFilter.value = button.dataset.choiceValue;
  updateFilterOptions("template", "modality");
  loadTemplates();
});
els.templateTypeRadios?.addEventListener("click", event => {
  const button = event.target.closest("[data-choice-value]");
  if (!button) return;
  els.templateTypeFilter.value = button.dataset.choiceValue;
  renderChoiceChips(els.templateTypeRadios, TEMPLATE_TYPE_FILTERS, els.templateTypeFilter.value, "template-type");
  loadTemplates();
});
els.snippetSystemSelect?.addEventListener("change", () => {
  state.snippet.system = els.snippetSystemSelect.value;
  const system = SNIPPET_SCHEMAS[state.snippet.system];
  state.snippet.modality = Object.keys(system.modalities)[0];
  state.snippet.finding = Object.keys(system.modalities[state.snippet.modality].findings)[0];
  state.snippet.values = {};
  renderSnippetGenerator();
});
els.snippetSystemRadios?.addEventListener("click", event => {
  const button = event.target.closest("[data-choice-value]");
  if (!button) return;
  els.snippetSystemSelect.value = button.dataset.choiceValue;
  els.snippetSystemSelect.dispatchEvent(new Event("change"));
});
els.snippetModalitySelect?.addEventListener("change", () => {
  state.snippet.modality = els.snippetModalitySelect.value;
  const { modality } = currentSnippetSchema();
  state.snippet.finding = Object.keys(modality.findings)[0];
  state.snippet.values = {};
  renderSnippetGenerator();
});
els.snippetModalityRadios?.addEventListener("click", event => {
  const button = event.target.closest("[data-choice-value]");
  if (!button) return;
  els.snippetModalitySelect.value = button.dataset.choiceValue;
  els.snippetModalitySelect.dispatchEvent(new Event("change"));
});
els.snippetFindingSelect?.addEventListener("change", () => {
  state.snippet.finding = els.snippetFindingSelect.value;
  state.snippet.values = {};
  renderSnippetGenerator();
});
els.snippetFindingRadios?.addEventListener("click", event => {
  const button = event.target.closest("[data-choice-value]");
  if (!button) return;
  els.snippetFindingSelect.value = button.dataset.choiceValue;
  els.snippetFindingSelect.dispatchEvent(new Event("change"));
});
els.snippetFields?.addEventListener("input", event => {
  const field = event.target.closest("[data-snippet-field]");
  if (!field) return;
  state.snippet.values[field.dataset.snippetField] = field.value;
  els.snippetPreviewText.textContent = buildSnippetText();
});
els.snippetFields?.addEventListener("change", event => {
  const field = event.target.closest("[data-snippet-field]");
  if (!field) return;
  state.snippet.values[field.dataset.snippetField] = field.value;
  els.snippetPreviewText.textContent = buildSnippetText();
});
els.snippetFields?.addEventListener("click", event => {
  const button = event.target.closest("[data-snippet-value]");
  if (!button) return;
  state.snippet.values[button.dataset.snippetField] = button.dataset.snippetValue;
  renderSnippetGenerator();
});
els.addSnippetFindingBtn?.addEventListener("click", () => {
  const text = buildSnippetText();
  if (!text) return;
  state.snippetItems.push({ text });
  renderSnippetFindingList();
  showToast("Finding added", `${state.snippetItems.length} finding${state.snippetItems.length === 1 ? "" : "s"} ready.`);
});
els.clearSnippetFindingsBtn?.addEventListener("click", () => {
  state.snippetItems = [];
  renderSnippetFindingList();
});
els.snippetFindingList?.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-snippet-item]");
  if (!button) return;
  state.snippetItems.splice(Number(button.dataset.removeSnippetItem), 1);
  renderSnippetFindingList();
});
els.insertSnippetBtn?.addEventListener("click", () => {
  const snippet = combinedSnippetText();
  insertReportText(snippet);
  showToast("Snippet inserted", snippet);
});
els.copySnippetBtn?.addEventListener("click", async () => {
  const snippet = combinedSnippetText();
  await navigator.clipboard.writeText(snippet);
  showToast("Snippet copied", snippet);
});
els.resetSnippetBtn?.addEventListener("click", () => {
  state.snippet = structuredClone(SNIPPET_DEFAULTS);
  state.snippetItems = [];
  renderSnippetGenerator();
});
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
    if (report.sourceType === "final-report" || report.kind === "final-report") {
      actions.unshift({ label: "Open report", run: async () => {
        await loadWorkLog();
        openSavedReport(id);
      }});
    }
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
      if (state.selectedWorklogReport?.id === id) state.selectedWorklogReport = null;
      if (state.reportDraftId === id) {
        resetReportDraft();
      }
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
els.writerGuidelineSearchInput.addEventListener("input", debounce(() => {
  state.selectedWriterGuideline = null;
  loadWriterGuidelines();
}));
els.guidelineSearchInput.addEventListener("input", debounce(() => {
  state.selectedGuideline = null;
  loadGuidelines();
}));
els.guidelineMarkdownInput.addEventListener("input", debounce(() => renderGuidelinePreview(null), 80));
els.guidelineMarkdownInput.addEventListener("paste", event => {
  handleGuidelinePaste(event);
});
els.newGuidelineBtn.addEventListener("click", blankGuideline);
els.insertGuidelineImageBtn.addEventListener("click", () => els.guidelineImageInput.click());
els.guidelineImageInput.addEventListener("change", () => {
  insertGuidelineImage(els.guidelineImageInput.files?.[0]);
  els.guidelineImageInput.value = "";
});
els.saveGuidelineBtn.addEventListener("click", () => {
  withButtonFeedback(els.saveGuidelineBtn, "Saving...", saveGuideline, "Saved");
});
els.openGuidelineBuilderBtn.addEventListener("click", () => {
  if (state.selectedWriterGuideline) editGuideline(state.selectedWriterGuideline.id);
  else showMode("guidelines");
});
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
  editor.addEventListener("focus", () => clearProofingFallback(editor));
  editor.addEventListener("input", debounce(() => updateProofing(editor, { fallback: false }), 120));
  editor.addEventListener("blur", () => updateProofing(editor));
  editor.addEventListener("contextmenu", event => {
    const hit = wordAtPoint(editor, event.clientX, event.clientY);
    if (!hit || !isSuspiciousWord(hit.word) || isPersonalDictionaryWord(hit.word)) return;
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY, [
      { label: `Add "${hit.word}" to dictionary`, run: () => addPersonalDictionaryWord(hit.word, editor) }
    ]);
  });
});
els.templateList.addEventListener("click", event => {
  const button = event.target.closest("[data-template-id]");
  if (button) selectTemplate(button.dataset.templateId);
});
els.guidelineList.addEventListener("click", event => {
  const button = event.target.closest("[data-guideline-id]");
  if (button) selectGuideline(button.dataset.guidelineId);
});
els.writerGuidelineList.addEventListener("click", event => {
  const button = event.target.closest("[data-writer-guideline-id]");
  if (button) selectWriterGuideline(button.dataset.writerGuidelineId);
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
els.guidelineList.addEventListener("contextmenu", event => {
  const button = event.target.closest("[data-guideline-id]");
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.guidelineId;
  showContextMenu(event.clientX, event.clientY, [
    { label: "Edit guideline", run: () => editGuideline(id) },
    { label: "Delete guideline", danger: true, run: async () => {
      if (!confirm("Delete this guideline?")) return;
      await pbDelete("guidelines", id);
      if (state.selectedGuideline?.id === id) state.selectedGuideline = null;
      if (state.selectedWriterGuideline?.id === id) state.selectedWriterGuideline = null;
      if (state.guidelineDraftId === id) blankGuideline();
      await loadGuidelines();
      await loadWriterGuidelines();
      showToast("Guideline deleted");
    }}
  ]);
});
els.writerGuidelineList.addEventListener("contextmenu", event => {
  const button = event.target.closest("[data-writer-guideline-id]");
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.writerGuidelineId;
  showContextMenu(event.clientX, event.clientY, [
    { label: "Open guideline", run: () => editGuideline(id) },
    { label: "Delete guideline", danger: true, run: async () => {
      if (!confirm("Delete this guideline?")) return;
      await pbDelete("guidelines", id);
      if (state.selectedGuideline?.id === id) state.selectedGuideline = null;
      if (state.selectedWriterGuideline?.id === id) state.selectedWriterGuideline = null;
      if (state.guidelineDraftId === id) blankGuideline();
      await loadGuidelines();
      await loadWriterGuidelines();
      showToast("Guideline deleted");
    }}
  ]);
});
els.contextMenu?.addEventListener("click", event => event.stopPropagation());
document.addEventListener("click", hideContextMenu);
els.newReportBtn.addEventListener("click", blankReport);
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
els.reviewVisibleReportsBtn?.addEventListener("click", () => {
  els.reviewVisibleReportsBtn.disabled = true;
  els.reviewVisibleReportsBtn.textContent = "Reviewing...";
  reviewVisibleReports().catch(error => {
    showToast("Action failed", error.message || "Please try again.", "error");
    renderWorkLog();
  });
});
els.interestingSearchInput.addEventListener("input", debounce(renderInterestingCases));
els.worklogHeatmap.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-calendar-action]");
  if (actionButton) {
    const action = actionButton.dataset.calendarAction;
    if (action === "prev") {
      state.worklogMonth = new Date(state.worklogMonth.getFullYear(), state.worklogMonth.getMonth() - 1, 1);
      state.worklogSelectedDate = "";
    }
    if (action === "next") {
      state.worklogMonth = new Date(state.worklogMonth.getFullYear(), state.worklogMonth.getMonth() + 1, 1);
      state.worklogSelectedDate = "";
    }
    if (action === "today") {
      const today = new Date();
      state.worklogMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      state.worklogSelectedDate = dateKey(today);
    }
    if (action === "clear") state.worklogSelectedDate = "";
    renderWorkLog();
    return;
  }
  const dayButton = event.target.closest("[data-worklog-date]");
  if (!dayButton) return;
  state.worklogSelectedDate = state.worklogSelectedDate === dayButton.dataset.worklogDate ? "" : dayButton.dataset.worklogDate;
  renderWorkLog();
});
els.worklogList.addEventListener("click", event => {
  const button = event.target.closest("[data-worklog-id]");
  if (button) selectWorklogReport(button.dataset.worklogId);
});
els.interestingList.addEventListener("click", event => {
  const button = event.target.closest("[data-interesting-id]");
  if (button) selectWorklogReport(button.dataset.interestingId);
});
els.editWorklogReportBtn.addEventListener("click", () => {
  if (state.selectedWorklogReport) openSavedReport(state.selectedWorklogReport.id);
});
els.closeWorklogPreviewBtn.addEventListener("click", closeWorklogPreview);
els.worklogList.addEventListener("contextmenu", event => {
  const button = event.target.closest("[data-worklog-id]");
  if (!button) return;
  event.preventDefault();
  const id = button.dataset.worklogId;
  const report = state.workLogReports.find(item => item.id === id);
  showContextMenu(event.clientX, event.clientY, [
    { label: "Open report", run: () => openSavedReport(id) },
    { label: report?.isReviewed ? "Mark unreviewed" : "Mark reviewed", run: () => toggleWorklogReview(id) },
    { label: "Change report date", run: () => editWorklogDate(id) },
    { label: report?.isInteresting ? "Remove interesting" : "Save as interesting", run: async () => {
      await pbUpdate("old_reports", id, { isInteresting: !report?.isInteresting });
      await loadWorkLog();
      await loadOldReports();
      showToast(report?.isInteresting ? "Removed from interesting" : "Saved as interesting", report?.title || "Saved report");
    }},
    { label: "Delete saved report", danger: true, run: async () => {
      if (!confirm("Delete this saved report?")) return;
      await pbDelete("old_reports", id);
      if (state.reportDraftId === id) {
        resetReportDraft();
      }
      if (state.selectedWorklogReport?.id === id) state.selectedWorklogReport = null;
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
  const report = state.workLogReports.find(item => item.id === id);
  showContextMenu(event.clientX, event.clientY, [
    { label: "Open report", run: () => openSavedReport(id) },
    { label: report?.isReviewed ? "Mark unreviewed" : "Mark reviewed", run: () => toggleWorklogReview(id) },
    { label: "Change report date", run: () => editWorklogDate(id) },
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
  await initTiptapEditors();
  await loadPersonalDictionary();
  loadSpellchecker();
  updateTemplateModeBadge();
  updateGuidelineModeBadge();
  updateReportModeBadge();
  showReferenceTab(state.referenceTab);
  renderSnippetGenerator();
  blankTemplate();
  blankGuideline();
  await loadFacets();
  await loadOldReports();
  await loadTemplates();
  await loadGuidelines();
  await loadWriterGuidelines();
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
