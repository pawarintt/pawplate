import {
  AI_DRAFT_TIMEOUT_MS,
  API,
  AUTH_KEY,
  AUTH_REFRESH_INTERVAL_MS,
  AUTH_REFRESH_LEEWAY_MS,
  AuthSessionError,
  DEFAULT_AI_PROMPT,
  DEFAULT_PALETTE,
  FEATURE_USAGE_DAYS,
  FEATURE_USAGE_SETTINGS_KEY,
  MODE_ROUTES,
  MUTATION_TIMEOUT_MS,
  PALETTE_KEY_PREFIX,
  PERSONAL_DICTIONARY_KEY_PREFIX,
  PERSONAL_NOTES_LIMIT,
  PERSONAL_NOTES_SETTINGS_KEY,
  PERSONAL_NOTE_BOARD_HEIGHT,
  PERSONAL_NOTE_BOARD_WIDTH,
  PERSONAL_NOTE_CARD_HEIGHT,
  PERSONAL_NOTE_CARD_MAX_SIZE,
  PERSONAL_NOTE_CARD_MIN_HEIGHT,
  PERSONAL_NOTE_CARD_MIN_WIDTH,
  PERSONAL_NOTE_CARD_WIDTH,
  PERSONAL_NOTE_IMAGE_MAX_HEIGHT,
  PERSONAL_NOTE_IMAGE_MAX_WIDTH,
  PERSONAL_NOTE_IMAGE_MIN_HEIGHT,
  PERSONAL_NOTE_IMAGE_MIN_WIDTH,
  POCKETBASE_URL,
  READ_MAX_RETRIES,
  READ_TIMEOUT_MS,
  REFERENCE_ROUTES,
  REPORT_DRAFT_KEY_PREFIX,
  REPORT_NOTES_LIMIT,
  REPORT_NOTES_SETTINGS_KEY,
  RETRY_BASE_DELAY_MS,
  ROUTE_MODES,
  ROUTE_REFERENCES,
  SHORTHAND_SETTINGS_KEY,
  SPELLCHECK_DICTIONARY_URL,
  TEMPLATE_ORDER_SETTINGS_KEY,
  TEMPLATE_TYPE_FILTERS,
  TIPTAP_CDN,
  TIPTAP_VERSION,
  TRACKED_FEATURES
} from "./constants.js?v=20260803-pawlet-lightbox";
import { collectDom } from "./dom.js?v=20260803-pawlet-lightbox";
import { createInitialState } from "./state.js?v=20260803-pawlet-lightbox";
import {
  copyText,
  debounce,
  escapeFilter,
  escapeHtml,
  escapeRegex,
  friendlyErrorMessage,
  isHtml,
  plainText,
  reportHtml
} from "./utils.js?v=20260803-pawlet-lightbox";
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
              { key: "clock", label: "Clock", type: "text", placeholder: "10 (auto → 10 o'clock)" },
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

const state = createInitialState(SNIPPET_DEFAULTS);

const els = collectDom();

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

// Scroll positions of the writer reference panels, keyed by tab, so switching
// tabs (or re-rendering a list) never loses the user's place. Filter inputs
// persist naturally in the DOM; only scroll needs explicit memory.
const REFERENCE_SCROLLABLES = ["templateList", "snippetFields", "snippetFindingList", "aiDraftResult"];

function saveReferenceScroll(tab) {
  if (!REFERENCE_ROUTES[tab]) return;
  const saved = {};
  REFERENCE_SCROLLABLES.forEach(key => {
    const node = els[key];
    if (node && node.scrollTop) saved[key] = node.scrollTop;
  });
  if (Object.keys(saved).length) {
    state.referenceScroll[tab] = saved;
  } else {
    delete state.referenceScroll[tab];
  }
}

function restoreReferenceScroll(tab) {
  const saved = state.referenceScroll[tab];
  if (!saved) return;
  requestAnimationFrame(() => {
    Object.entries(saved).forEach(([key, top]) => {
      if (els[key]) els[key].scrollTop = top;
    });
  });
}

function showReferenceTab(tab, options = {}) {
  if (!REFERENCE_ROUTES[tab]) tab = "templates";
  if (tab !== state.referenceTab) saveReferenceScroll(state.referenceTab);
  state.referenceTab = tab;
  document.querySelectorAll("[data-reference-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.referenceTab === tab);
  });
  document.querySelectorAll("[data-reference-panel]").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.referencePanel === tab);
  });
  restoreReferenceScroll(tab);
  if (tab === "ai-draft" && !state.aiSettingsLoaded) {
    loadAiSettings().catch(error => console.warn("AI settings could not be loaded.", error));
  }
  if (tab === "snippets") renderSnippetGenerator();
  if (options.updateRoute !== false && state.mode === "writer") updateRoute("writer", tab);
}

// Narrow-screen drawer for the writer reference pane (see the 1240px media
// query). The class is a no-op on wide screens, so callers can toggle it
// unconditionally.
function setReferenceDrawer(open) {
  state.referenceDrawerOpen = open;
  els.writerReferencePane?.classList.toggle("drawer-open", open);
  els.drawerBackdrop?.classList.toggle("hidden", !open);
  els.referenceDrawerBtn?.setAttribute("aria-expanded", String(open));
}

function aiDraftFields() {
  if (!state.aiDraft) return [];
  return [
    { key: "title", label: "Report title", value: state.aiDraft.title, target: els.reportTitleInput },
    { key: "modality", label: "Modality", value: state.aiDraft.modality, target: els.reportModalityInput },
    { key: "topic", label: "Topic", value: state.aiDraft.topic, target: els.reportTopicInput },
    { key: "bodyPart", label: "Body part", value: state.aiDraft.bodyPart, target: els.reportBodyPartInput },
    { key: "keywords", label: "Keywords", value: state.aiDraft.keywords, target: els.reportKeywordInput }
  ].filter(item => item.value && !state.aiDraft.rejected?.includes(item.key));
}

function renderAiDraft() {
  if (!els.aiDraftResult) return;
  const draft = state.aiDraft;
  if (!draft) {
    els.aiDraftResult.innerHTML = '<p class="mini-empty">Write findings, then generate a draft.</p>';
    return;
  }
  const metadata = aiDraftFields().map(item => `
    <article class="ai-suggestion" data-ai-key="${item.key}">
      <span class="ai-suggestion-label">${escapeHtml(item.label)}</span>
      <p>${escapeHtml(item.value)}</p>
      <div><button type="button" data-ai-accept="${item.key}">Accept</button><button type="button" data-ai-reject="${item.key}">Reject</button></div>
    </article>
  `).join("");
  const impression = draft.rejected?.includes("impression") ? "" : `
    <article class="ai-suggestion ai-impression" data-ai-key="impression">
      <span class="ai-suggestion-label">Impression draft</span>
      <p>${escapeHtml(draft.impression || "")}</p>
      ${draft.uncertainties ? `<small>${escapeHtml(draft.uncertainties)}</small>` : ""}
      <div><button type="button" data-ai-accept="impression">Insert</button><button type="button" data-ai-reject="impression">Reject</button></div>
    </article>
  `;
  els.aiDraftResult.innerHTML = `${impression}${metadata || '<p class="mini-empty">No additional metadata proposed.</p>'}`;
}

async function generateAiDraft() {
  const report = getEditorText(els.reportTextEditor);
  if (!report.trim()) {
    showToast("Nothing to draft", "Write the findings first.", "info");
    return false;
  }
  const response = await authenticatedFetch(`${POCKETBASE_URL.replace(/\/$/, "")}/api/pawplate/ai-draft`, {
    method: "POST",
    timeoutMs: AI_DRAFT_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      report,
      title: els.reportTitleInput.value.trim(),
      modality: els.reportModalityInput.value.trim(),
      topic: els.reportTopicInput.value.trim(),
      bodyPart: els.reportBodyPartInput.value.trim(),
      keywords: els.reportKeywordInput.value.trim(),
      aiPrompt: els.aiPromptInput.value.trim() || DEFAULT_AI_PROMPT,
      aiReasoning: selectedAiReasoning()
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "AI draft could not be created.");
  state.aiDraft = { ...payload, rejected: [] };
  renderAiDraft();
  trackFeature("ai.generate");
  showToast("Draft ready", "Review each proposal before applying it.");
  return true;
}

function applyAiDraftSuggestion(key) {
  const field = aiDraftFields().find(item => item.key === key);
  if (key === "impression") {
    insertReportText(`${state.aiDraft.impression || ""}\n`);
    trackFeature("ai.accept.impression");
  } else if (field) {
    field.target.value = field.value;
    field.target.dispatchEvent(new Event("input", { bubbles: true }));
    trackFeature("ai.accept.metadata");
  }
  state.aiDraft.rejected = [...new Set([...(state.aiDraft.rejected || []), key])];
  renderAiDraft();
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

function formatClockFace(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  // Already has o'clock in any spelling: normalize spacing.
  if (/o\s*'?clock/i.test(text)) {
    return text
      .replace(/\s*o\s*'?clock/ig, " o'clock")
      .replace(/\s+/g, " ")
      .trim();
  }
  // Bare numbers like "10", "3", "10-11", "2 - 4": append o'clock.
  const range = text.match(/^(\d{1,2})(?:\s*[-\u2013\u2014]\s*(\d{1,2}))?$/);
  if (range) {
    return range[2] ? `${range[1]}-${range[2]} o'clock` : `${range[1]} o'clock`;
  }
  return text;
}

// Simplified suggested BI-RADS from the US mass lexicon (ACR BI-RADS
// Ultrasound, 5th ed. descriptors). Transparent estimate only — the
// radiologist must verify; not a substitute for full assessment.
function biradsUltrasoundAssessment(values) {
  const shapeScore = { oval: 0, round: 1, irregular: 2 };
  const orientationScore = { parallel: 0, "not parallel": 2 };
  const marginScore = { circumscribed: 0, indistinct: 1, microlobulated: 2, angular: 2, spiculated: 3 };
  const echoScore = { anechoic: 0, hyperechoic: 0, isoechoic: 0, hypoechoic: 1, heterogeneous: 1, "complex cystic and solid": 1 };
  const posteriorScore = { "no posterior features": 0, "posterior enhancement": 0, "posterior shadowing": 2, "combined posterior pattern": 2 };
  const vascularityScore = { "no internal vascularity": 0, "peripheral vascularity": 1, "internal vascularity": 1 };
  const total = (shapeScore[values.shape] ?? 0)
    + (orientationScore[values.orientation] ?? 0)
    + (marginScore[values.margin] ?? 0)
    + (echoScore[values.echo] ?? 0)
    + (posteriorScore[values.posterior] ?? 0)
    + (vascularityScore[values.vascularity] ?? 0);
  const flags = [];
  if (values.shape === "irregular") flags.push("irregular shape");
  if (values.shape === "round") flags.push("round shape");
  if (values.orientation === "not parallel") flags.push("not parallel orientation");
  if (values.margin && values.margin !== "circumscribed") flags.push(`${values.margin} margin`);
  if (values.echo === "hypoechoic" || values.echo === "heterogeneous" || values.echo === "complex cystic and solid") flags.push(`${values.echo} echo`);
  if (values.posterior === "posterior shadowing" || values.posterior === "combined posterior pattern") flags.push(values.posterior);
  if (values.vascularity === "internal vascularity") flags.push("internal vascularity");
  // Classic simple cyst pattern reads as benign.
  const isSimpleCyst = values.echo === "anechoic"
    && values.margin === "circumscribed"
    && (values.shape === "oval" || values.shape === "round")
    && values.orientation === "parallel"
    && (values.posterior === "posterior enhancement" || values.posterior === "no posterior features");
  if (isSimpleCyst) return { category: "2", total, flags, label: "benign (simple-cyst pattern)" };
  if (total <= 0) return { category: "3", total, flags, label: "probably benign" };
  if (total <= 2) return { category: "4A", total, flags, label: "low suspicion" };
  if (total <= 4) return { category: "4B", total, flags, label: "moderate suspicion" };
  if (total <= 6) return { category: "4C", total, flags, label: "high suspicion" };
  return { category: "5", total, flags, label: "highly suggestive of malignancy" };
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
    return sentenceCase(joinPhrase([`${size ? "A" : indefiniteArticle(descriptor)}`, lesion, location ? `in the ${location}` : "", associated ? `, with ${associated}` : ""]) + ".");
  }
  if (system === SNIPPET_SCHEMAS.birads && modality.label === "Mammography" && finding.label === "Calcification") {
    const location = joinPhrase([values.breast, snippetValue("location") ? `at the ${snippetValue("location")}` : ""], " ");
    return sentenceCase(joinPhrase([values.distribution, values.morphology, "calcifications are seen", location ? `in the ${location}` : ""]) + ".");
  }
  if (system === SNIPPET_SCHEMAS.birads && modality.label === "Ultrasound" && finding.label === "Mass") {
    const clock = formatClockFace(snippetValue("clock"));
    const location = joinPhrase([
      values.breast,
      clock ? `at ${clock}` : ""
    ], ", ");
    const descriptor = joinPhrase([values.shape, values.orientation, values.margin, values.echo, "mass"]);
    const size = snippetValue("size");
    const lesion = joinPhrase([size ? `${size}` : "", descriptor]);
    const posterior = values.posterior && values.posterior !== "no posterior features" ? ` with ${values.posterior}` : "";
    const vascularity = values.vascularity ? ` and ${values.vascularity}` : "";
    const assessment = biradsUltrasoundAssessment(values);
    const sentence = sentenceCase(joinPhrase([`${size ? "A" : indefiniteArticle(descriptor)}`, lesion, location ? `in the ${location}` : ""]) + `${posterior}${vascularity}`);
    return `${sentence}; BI-RADS ${assessment.category}.`;
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
    // Use reportHtml so blank lines become empty paragraphs instead of
    // collapsing into a single block.
    tiptap.chain().focus().insertContent(`${reportHtml(value)}<p></p>`).run();
    updateProofing(editor, { fallback: false });
    return;
  }
  editor.focus();
  document.execCommand("insertText", false, `${value}\n`);
  updateProofing(editor);
}

// Serialize the current selection inside a report/template editor to plain
// text WITHOUT dropping blank lines (native serialization collapses empty
// paragraphs and <br><br> runs when pasting into plain-text targets).
function editorSelectionText(editor) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  const holder = document.createElement("div");
  holder.appendChild(range.cloneContents());
  holder.querySelectorAll("br").forEach(node => node.replaceWith(document.createTextNode("\n")));
  holder.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6").forEach(node => node.append(document.createTextNode("\n")));
  return (holder.textContent || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n");
}

function handleEditorCopy(event) {
  const editor = event.currentTarget;
  const text = editorSelectionText(editor);
  if (text === null || !event.clipboardData) return;
  event.preventDefault();
  event.clipboardData.setData("text/plain", text);
  try {
    // Keep rich-target pastes scoped to the actual selection, not the whole report.
    const selection = window.getSelection();
    const htmlHolder = document.createElement("div");
    htmlHolder.appendChild(selection.getRangeAt(0).cloneContents());
    if (htmlHolder.innerHTML) event.clipboardData.setData("text/html", htmlHolder.innerHTML);
  } catch {
    // Plain text alone is enough for the paste targets.
  }
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

function reportDraftStorageKey() {
  return `${REPORT_DRAFT_KEY_PREFIX}${state.auth?.user?.id || "anonymous"}`;
}

function reportWorkingDraftPayload() {
  return {
    version: 1,
    sourceReportId: state.reportDraftId || "",
    sourceDate: state.reportDraftSourceDate || "",
    title: els.reportTitleInput.value,
    modality: els.reportModalityInput.value,
    topic: els.reportTopicInput.value,
    bodyPart: els.reportBodyPartInput.value,
    keywords: els.reportKeywordInput.value,
    note: els.reportNoteInput.value,
    isInteresting: els.reportInterestingInput.checked,
    report: getEditorHtml(els.reportTextEditor)
  };
}

function hasReportWorkspaceContent(payload = reportWorkingDraftPayload()) {
  return Boolean(
    plainText(payload.report).trim()
    || payload.title?.trim()
    || payload.modality?.trim()
    || payload.topic?.trim()
    || payload.bodyPart?.trim()
    || payload.keywords?.trim()
    || payload.note?.trim()
    || payload.isInteresting
  );
}

function readLocalWorkingDraft() {
  try {
    return JSON.parse(localStorage.getItem(reportDraftStorageKey()) || "null");
  } catch {
    return null;
  }
}

function writeLocalWorkingDraft(payload, options = {}) {
  const value = {
    payload,
    cleared: Boolean(options.cleared),
    savedAt: options.savedAt || new Date().toISOString()
  };
  try {
    localStorage.setItem(reportDraftStorageKey(), JSON.stringify(value));
  } catch (error) {
    console.warn("Local draft backup unavailable.", error);
  }
  return value;
}

function clearLocalWorkingDraft() {
  localStorage.removeItem(reportDraftStorageKey());
}

function setReportAutosaveStatus(status = "", label = "") {
  if (!els.reportAutosaveStatus) return;
  els.reportAutosaveStatus.className = `autosave-status ${status || "hidden"}`;
  els.reportAutosaveStatus.textContent = label;
  els.reportAutosaveStatus.title = label;
}

function draftSavedLabel(value = new Date()) {
  const time = value instanceof Date ? value : new Date(value);
  const label = Number.isNaN(time.getTime())
    ? ""
    : time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return label ? `Draft saved ${label}` : "Draft saved";
}

function scheduleReportAutosave(delay = 900) {
  if (state.suppressReportAutosave || !state.auth?.token) return;
  window.clearTimeout(state.reportAutosaveTimer);
  state.reportAutosaveDirty = true;
  const payload = reportWorkingDraftPayload();
  writeLocalWorkingDraft(payload, { cleared: !hasReportWorkspaceContent(payload) });
  setReportAutosaveStatus("unsaved", "Unsaved changes");
  state.reportAutosaveTimer = window.setTimeout(saveWorkingDraft, delay);
}

async function saveWorkingDraft() {
  window.clearTimeout(state.reportAutosaveTimer);
  state.reportAutosaveTimer = 0;
  if (state.suppressReportAutosave || !state.auth?.token) return false;
  if (state.reportAutosaveSaving) {
    state.reportAutosaveDirty = true;
    return false;
  }

  const payload = reportWorkingDraftPayload();
  const hasContent = hasReportWorkspaceContent(payload);
  const saveEpoch = state.reportAutosaveEpoch;
  state.reportAutosaveDirty = false;
  state.reportAutosaveSaving = true;
  writeLocalWorkingDraft(payload, { cleared: !hasContent });
  // Definitely offline: don't burn time on a doomed request, just keep the
  // local backup. It syncs on the next successful save after reconnect.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    state.reportAutosaveDirty = true;
    state.reportAutosaveSaving = false;
    setReportAutosaveStatus("offline", "Offline — draft saved locally");
    return false;
  }
  setReportAutosaveStatus("saving", "Saving draft...");

  try {
    if (!hasContent) {
      if (state.workingDraftId) await pbDelete("report_drafts", state.workingDraftId);
      state.workingDraftId = "";
      clearLocalWorkingDraft();
      setReportAutosaveStatus();
      return true;
    }

    const data = { owner: state.auth?.user?.id || "", payload };
    const saved = state.workingDraftId
      ? await pbUpdate("report_drafts", state.workingDraftId, data)
      : await pbCreate("report_drafts", data);
    if (saveEpoch !== state.reportAutosaveEpoch) {
      try {
        await pbDelete("report_drafts", saved.id);
      } catch {
        // The newer action may already have removed this draft.
      }
      return false;
    }
    state.workingDraftId = saved.id;
    const savedAt = saved.updated || new Date().toISOString();
    writeLocalWorkingDraft(payload, { savedAt });
    setReportAutosaveStatus("saved", draftSavedLabel(savedAt));
    return true;
  } catch (error) {
    console.warn("PocketBase draft autosave unavailable; keeping local backup.", error);
    writeLocalWorkingDraft(payload, { cleared: !hasContent });
    setReportAutosaveStatus("offline", "Draft saved locally");
    return false;
  } finally {
    state.reportAutosaveSaving = false;
    if (state.reportAutosaveDirty) scheduleReportAutosave(250);
  }
}

async function clearWorkingDraft() {
  state.reportAutosaveEpoch += 1;
  window.clearTimeout(state.reportAutosaveTimer);
  state.reportAutosaveTimer = 0;
  state.reportAutosaveDirty = false;
  const draftId = state.workingDraftId;
  state.workingDraftId = "";
  writeLocalWorkingDraft({}, { cleared: true });
  setReportAutosaveStatus();
  if (!draftId) {
    clearLocalWorkingDraft();
    return;
  }
  try {
    await pbDelete("report_drafts", draftId);
    clearLocalWorkingDraft();
  } catch (error) {
    console.warn("Remote draft cleanup will be retried later.", error);
  }
}

function applyWorkingDraft(payload) {
  state.suppressReportAutosave = true;
  state.reportDraftId = payload.sourceReportId || null;
  state.reportDraftSourceDate = payload.sourceDate || "";
  state.selectedTemplate = null;
  els.reportTitleInput.value = payload.title || "";
  els.reportModalityInput.value = payload.modality || "";
  els.reportTopicInput.value = payload.topic || "";
  els.reportBodyPartInput.value = payload.bodyPart || "";
  els.reportKeywordInput.value = payload.keywords || "";
  els.reportNoteInput.value = payload.note || "";
  els.reportInterestingInput.checked = Boolean(payload.isInteresting);
  setEditorHtml(els.reportTextEditor, payload.report || "");
  updateReportModeBadge();
  updateEditorDatalists("report");
  state.suppressReportAutosave = false;
  showMode("writer");
}

function showDraftRecoveryDialog(selected, useLocal) {
  const payload = selected.payload || {};
  const savedAt = new Date(selected.savedAt || Date.now());
  const savedLabel = Number.isNaN(savedAt.getTime()) ? "Saved draft" : `Saved ${savedAt.toLocaleString()}`;
  const sourceLabel = useLocal ? "local backup" : "cloud draft";
  const excerpt = plainText(payload.report).replace(/\s+/g, " ").trim();
  els.draftRecoveryReportTitle.textContent = payload.title?.trim() || "Untitled report";
  els.draftRecoveryMeta.textContent = `${savedLabel} · ${sourceLabel}`;
  els.draftRecoveryExcerpt.textContent = excerpt || "Report metadata only";
  state.pendingWorkingDraft = { selected, useLocal };
  if (!els.draftRecoveryDialog.open) els.draftRecoveryDialog.showModal();
}

async function continueRecoveredDraft() {
  const pending = state.pendingWorkingDraft;
  if (!pending) return;
  state.pendingWorkingDraft = null;
  els.draftRecoveryDialog.close();
  applyWorkingDraft(pending.selected.payload);
  if (pending.useLocal) {
    setReportAutosaveStatus("offline", "Recovered local draft");
    scheduleReportAutosave(100);
  } else {
    writeLocalWorkingDraft(pending.selected.payload, { savedAt: pending.selected.savedAt });
    setReportAutosaveStatus("saved", draftSavedLabel(pending.selected.savedAt));
  }
  showToast("Draft restored", pending.selected.payload.title || "Your unfinished report is ready.");
}

async function discardRecoveredDraft() {
  state.pendingWorkingDraft = null;
  els.draftRecoveryDialog.close();
  await clearWorkingDraft();
  showToast("Draft discarded", "Start with a clean report when you are ready.", "info");
}

async function loadWorkingDraft() {
  state.workingDraftId = "";
  const local = readLocalWorkingDraft();
  let remote = null;
  try {
    const owner = state.auth?.user?.id || "";
    const data = await pbList("report_drafts", {
      perPage: 1,
      filter: `owner="${owner}"`,
      fields: "id,payload,updated"
    });
    remote = data.items?.[0] || null;
    state.workingDraftId = remote?.id || "";
  } catch (error) {
    console.warn("Remote draft recovery unavailable; checking local backup.", error);
  }

  const remoteTime = remote?.updated ? new Date(remote.updated).getTime() : 0;
  const localTime = local?.savedAt ? new Date(local.savedAt).getTime() : 0;
  const useLocal = Boolean(local && (!remote || localTime > remoteTime));
  const selected = useLocal
    ? local
    : remote
      ? { payload: remote.payload, savedAt: remote.updated, cleared: false }
      : local;

  if (!selected || selected.cleared || !hasReportWorkspaceContent(selected.payload || {})) {
    if (selected?.cleared && remote && useLocal) {
      clearWorkingDraft().catch(error => console.warn("Stale draft cleanup failed.", error));
    } else {
      setReportAutosaveStatus();
    }
    return false;
  }

  showDraftRecoveryDialog(selected, useLocal);
  return true;
}

async function discardWorkingDraft(message) {
  const local = readLocalWorkingDraft();
  const hasDraft = Boolean(
    state.workingDraftId
    || state.reportAutosaveDirty
    || (local && !local.cleared && hasReportWorkspaceContent(local.payload || {}))
  );
  if (hasDraft && hasReportWorkspaceContent() && !confirm(message)) return false;
  await clearWorkingDraft();
  return true;
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
  const previousOwner = state.auth?.user?.id || "";
  const nextOwner = auth?.user?.id || "";
  if (previousOwner !== nextOwner) {
    state.authGeneration += 1;
    invalidateDataLoads();
  }
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
  const editorElements = [els.templateTextEditor, els.reportTextEditor].filter(Boolean);
  const restoreFallbackEditor = (element, initialContent = "") => {
    if (!element || element.__pawplateEditor) return;
    element.classList.remove("tiptap-host");
    element.setAttribute("contenteditable", "true");
    element.setAttribute("spellcheck", "true");
    element.setAttribute("lang", "en-US");
    if (!element.innerHTML && initialContent) element.innerHTML = initialContent;
  };
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
    editorElements.forEach(element => {
      if (!element || element.__pawplateEditor) return;
      const placeholder = element.dataset.placeholder || "";
      const initialContent = element.innerHTML || "";
      try {
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
          onUpdate: () => {
            scheduleEditorProofing(element);
            updateShorthandPalette(element);
            if (element === els.reportTextEditor) scheduleReportAutosave();
          },
          onFocus: () => clearProofingFallback(element),
          onBlur: () => {
            closeShorthandPalette();
            updateProofing(element);
          }
        });
        element.__pawplateEditor = editor;
      } catch (error) {
        restoreFallbackEditor(element, initialContent);
        console.warn("TipTap editor could not start; using the editable fallback.", error);
      }
    });
    state.tiptapReady = editorElements.every(element => Boolean(element.__pawplateEditor));
  } catch (error) {
    editorElements.forEach(element => restoreFallbackEditor(element));
    console.warn("TipTap unavailable; using the fallback editor.", error);
  }
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    ...(state.auth?.token ? { Authorization: state.auth.token } : {})
  };
}

function authTokenExpiresAt(token = state.auth?.token) {
  try {
    const encoded = String(token || "").split(".")[1];
    if (!encoded) return 0;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    return Number(payload.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

function sessionNeedsRefresh(force = false) {
  if (force) return true;
  const expiresAt = authTokenExpiresAt();
  if (!expiresAt || expiresAt <= Date.now() + AUTH_REFRESH_LEEWAY_MS) return true;
  return Date.now() - state.lastAuthRefreshAt >= AUTH_REFRESH_INTERVAL_MS;
}

// Marker for failures worth retrying: timeouts and low-level network errors.
// HTTP error statuses are NOT retryable here (the server answered).
class NetworkError extends Error {
  constructor(message = "Network request failed.", options = {}) {
    super(message, options);
    this.name = "NetworkError";
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// fetch() with no timeout can hang for minutes on a half-dead connection,
// which is the main "junky" feeling on unstable internet. Bound every
// request with an AbortController so failures surface fast instead.
async function fetchWithTimeout(url, options = {}, timeoutMs = READ_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new NetworkError(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Check your connection and try again.`, { cause: error });
    }
    throw new NetworkError("PawPlate could not reach the server. Check your connection and try again.", { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

// Retry idempotent requests (reads, auth refresh) with exponential backoff so
// single-packet blips self-heal instead of failing the whole view load.
// Mutations must NOT use this: a retry after an ambiguous failure could
// create duplicate records.
async function fetchWithRetry(url, options = {}, { timeoutMs = READ_TIMEOUT_MS, retries = READ_MAX_RETRIES } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (error) {
      if (!(error instanceof NetworkError) || attempt >= retries) throw error;
      attempt += 1;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
}

async function refreshAuthSession(options = {}) {
  if (!state.auth?.token) throw new AuthSessionError("Sign in to continue.");
  if (!sessionNeedsRefresh(Boolean(options.force))) return state.auth;
  if (state.authRefreshPromise) return state.authRefreshPromise;

  state.authRefreshPromise = (async () => {
    let response;
    try {
      // Auth refresh is idempotent (old tokens stay valid), so it is safe to retry.
      response = await fetchWithRetry(`${API}/users/auth-refresh`, {
        method: "POST",
        headers: authHeaders()
      });
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError("PawPlate could not reach the server. Your local draft is safe.", { cause: error });
    }

    if (response.status === 401 || response.status === 403) {
      const error = new AuthSessionError();
      logout(error.message);
      throw error;
    }
    if (!response.ok) throw new Error("PawPlate could not verify your session. Please try again.");

    const auth = await response.json();
    if (!auth?.token || !auth?.record) {
      const error = new AuthSessionError();
      logout(error.message);
      throw error;
    }
    setAuth({ token: auth.token, user: auth.record });
    state.lastAuthRefreshAt = Date.now();
    return state.auth;
  })();

  try {
    return await state.authRefreshPromise;
  } finally {
    state.authRefreshPromise = null;
  }
}

async function authenticatedFetch(url, options = {}) {
  await refreshAuthSession();
  const { timeoutMs: explicitTimeout, retries: explicitRetries, ...fetchOptions } = options;
  const method = String(fetchOptions.method || "GET").toUpperCase();
  // Reads retry with backoff (idempotent); mutations get a timeout only so a
  // blind retry can never duplicate a create/update/delete.
  const timeoutMs = explicitTimeout
    ?? (method === "GET" || method === "HEAD" ? READ_TIMEOUT_MS : MUTATION_TIMEOUT_MS);
  const send = () => {
    const sendOptions = { ...fetchOptions, headers: authHeaders(fetchOptions.headers || {}) };
    if (method === "GET" || method === "HEAD") {
      return fetchWithRetry(url, sendOptions, {
        timeoutMs,
        retries: explicitRetries ?? READ_MAX_RETRIES
      });
    }
    return fetchWithTimeout(url, sendOptions, timeoutMs);
  };
  let response;
  try {
    response = await send();
  } catch (error) {
    if (error instanceof NetworkError) throw error;
    throw new NetworkError("PawPlate could not reach the server. Check your connection and try again.", { cause: error });
  }
  if (response.status === 401 || response.status === 403) {
    await refreshAuthSession({ force: true });
    response = await send();
  }
  return response;
}

async function login(identity, password) {
  let response;
  try {
    response = await fetchWithTimeout(`${API}/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, password })
    }, MUTATION_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof NetworkError) throw error;
    throw new NetworkError("Sign in could not reach the server. Check your connection and try again.", { cause: error });
  }
  if (!response.ok) throw new Error("Sign in failed. Check the email and password.");
  const auth = await response.json();
  setAuth({ token: auth.token, user: auth.record });
  state.lastAuthRefreshAt = Date.now();
  await loadApp();
}

function logout(message = "") {
  setAuth(null);
  state.authRefreshPromise = null;
  state.lastAuthRefreshAt = 0;
  state.oldReports = [];
  state.templates = [];
  state.guidelines = [];
  state.writerGuidelines = [];
  state.workLogReports = [];
  state.selectedOldReport = null;
  state.selectedTemplate = null;
  state.templateOrder = [];
  state.templateOrderSettingsId = "";
  state.selectedGuideline = null;
  state.selectedWriterGuideline = null;
  state.aiDraft = null;
  state.aiSettingsId = "";
  state.aiSettingsLoaded = false;
  window.clearTimeout(state.featureUsageSaveTimer);
  state.featureUsageSettingsId = "";
  state.featureUsage = emptyFeatureUsage();
  state.featureUsageLoaded = false;
  state.featureUsageLoadPromise = null;
  state.featureUsageSaveTimer = 0;
  state.featureUsageSavePromise = null;
  state.featureUsageDirty = false;
  window.clearTimeout(state.reportNotesSaveTimer);
  state.reportNotesSettingsId = "";
  state.reportNotes = emptyReportNotes();
  state.reportNotesLoaded = false;
  state.reportNotesLoadPromise = null;
  state.reportNotesSaveTimer = 0;
  state.reportNotesSavePromise = null;
  state.reportNotesDirty = false;
  state.reportNotePopoverOpen = false;
  window.clearTimeout(state.personalNotesSaveTimer);
  state.personalNotesSettingsId = "";
  state.personalNotes = emptyPersonalNotes();
  state.personalNotesLoaded = false;
  state.personalNotesLoadPromise = null;
  state.personalNotesSaveTimer = 0;
  state.personalNotesSavePromise = null;
  state.personalNotesDirty = false;
  state.personalNotesEditPending = false;
  state.personalNotesResizeObserver?.disconnect();
  state.personalNotesResizeObserver = null;
  window.clearTimeout(state.personalNotesResizeTrackTimer);
  state.personalNotesResizeTrackTimer = 0;
  state.personalNoteImageTargetId = "";
  state.personalNotePasteTargetId = "";
  state.alwaysNotesOpen = false;
  els.alwaysNotesPopover.classList.add("hidden");
  els.reportNotePopover.classList.add("hidden");
  els.alwaysNotesBtn.setAttribute("aria-expanded", "false");
  els.quickReportNoteBtn.setAttribute("aria-expanded", "false");
  setPersonalNotesStatus("");
  setReportNotesStatus("");
  renderPersonalNotes();
  window.clearTimeout(state.reportAutosaveTimer);
  state.reportAutosaveTimer = 0;
  state.reportAutosaveDirty = false;
  state.reportAutosaveSaving = false;
  state.reportAutosaveEpoch += 1;
  state.workingDraftId = "";
  state.pendingWorkingDraft = null;
  if (els.draftRecoveryDialog.open) els.draftRecoveryDialog.close();
  state.guidelineFileToken = "";
  state.guidelineFileTokenExpiresAt = 0;
  resetGuidelineDraft();
  resetReportDraft();
  setAiSettingsForm();
  els.aiSettingsPanel.classList.add("hidden");
  els.aiSettingsToggleBtn.classList.remove("active");
  els.aiSettingsToggleBtn.setAttribute("aria-expanded", "false");
  setReportAutosaveStatus();
  els.loginPasswordInput.value = "";
  els.loginError.textContent = message;
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
  const terms = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return clean.slice(0, 210);
  const lowered = clean.toLowerCase();
  let index = -1;
  let matchedLength = 0;
  for (const term of terms) {
    const at = lowered.indexOf(term);
    if (at >= 0 && (index < 0 || at < index)) {
      index = at;
      matchedLength = term.length;
    }
  }
  const start = Math.max(0, index < 0 ? 0 : index - 80);
  const end = Math.min(clean.length, (index < 0 ? 0 : index) + matchedLength + 150);
  return `${start ? "... " : ""}${clean.slice(start, end)}${end < clean.length ? " ..." : ""}`;
}

async function pbList(collection, params = {}) {
  const response = await authenticatedFetch(`${API}/${collection}/records?${new URLSearchParams(params)}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function pbCreate(collection, data) {
  const response = await authenticatedFetch(`${API}/${collection}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function pbUpdate(collection, id, data) {
  const response = await authenticatedFetch(`${API}/${collection}/records/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function pbDelete(collection, id) {
  const response = await authenticatedFetch(`${API}/${collection}/records/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await response.text());
}

function emptyFeatureUsage() {
  return { version: 1, features: {} };
}

function normalizeFeatureUsage(value) {
  const normalized = emptyFeatureUsage();
  Object.entries(value?.features || {}).forEach(([feature, entry]) => {
    if (!TRACKED_FEATURES.has(feature) || !entry || typeof entry !== "object") return;
    const daily = Object.fromEntries(Object.entries(entry.daily || {})
      .filter(([day, count]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Number(count)))
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-FEATURE_USAGE_DAYS)
      .map(([day, count]) => [day, Math.max(0, Number(count))]));
    normalized.features[feature] = {
      count: Math.max(0, Number(entry.count) || 0),
      lastUsedAt: typeof entry.lastUsedAt === "string" ? entry.lastUsedAt : "",
      daily
    };
  });
  return normalized;
}

async function loadFeatureUsage() {
  if (state.featureUsageLoaded) return state.featureUsage;
  if (state.featureUsageLoadPromise) return state.featureUsageLoadPromise;
  const owner = state.auth?.user?.id || "";
  if (!owner) return state.featureUsage;
  const generation = state.authGeneration;
  const loadPromise = (async () => {
    try {
      const filter = `owner="${owner}" && key="${FEATURE_USAGE_SETTINGS_KEY}"`;
      const data = await pbList("user_settings", { perPage: 1, filter, fields: "id,value" });
      if (generation !== state.authGeneration) return state.featureUsage;
      const record = data.items?.[0];
      state.featureUsageSettingsId = record?.id || "";
      state.featureUsage = normalizeFeatureUsage(record?.value);
    } catch (error) {
      if (generation === state.authGeneration) state.featureUsage = emptyFeatureUsage();
      console.warn("Feature usage sync unavailable.", error);
    } finally {
      if (state.featureUsageLoadPromise === loadPromise) {
        state.featureUsageLoaded = true;
        state.featureUsageLoadPromise = null;
      }
    }
    return state.featureUsage;
  })();
  state.featureUsageLoadPromise = loadPromise;
  return loadPromise;
}

function scheduleFeatureUsageSave(delay = 1200) {
  window.clearTimeout(state.featureUsageSaveTimer);
  state.featureUsageSaveTimer = window.setTimeout(() => {
    saveFeatureUsage().catch(error => console.warn("Feature usage could not be saved.", error));
  }, delay);
}

async function saveFeatureUsage() {
  window.clearTimeout(state.featureUsageSaveTimer);
  state.featureUsageSaveTimer = 0;
  if (!state.auth?.user?.id || !state.featureUsageDirty) return;
  if (state.featureUsageSavePromise) return state.featureUsageSavePromise;
  const owner = state.auth.user.id;
  const savePromise = (async () => {
    while (state.featureUsageDirty && state.auth?.user?.id === owner) {
      state.featureUsageDirty = false;
      const value = structuredClone(state.featureUsage);
      try {
        if (state.featureUsageSettingsId) {
          await pbUpdate("user_settings", state.featureUsageSettingsId, { value });
        } else {
          const created = await pbCreate("user_settings", {
            owner,
            key: FEATURE_USAGE_SETTINGS_KEY,
            value
          });
          state.featureUsageSettingsId = created.id;
        }
      } catch (error) {
        if (state.auth?.user?.id === owner) state.featureUsageDirty = true;
        throw error;
      }
    }
  })();
  state.featureUsageSavePromise = savePromise;
  try {
    await savePromise;
  } finally {
    if (state.featureUsageSavePromise === savePromise) state.featureUsageSavePromise = null;
  }
}

async function trackFeature(feature) {
  if (!TRACKED_FEATURES.has(feature) || !state.auth?.user?.id) return;
  await loadFeatureUsage();
  if (!state.auth?.user?.id) return;
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const current = state.featureUsage.features[feature] || { count: 0, lastUsedAt: "", daily: {} };
  const daily = { ...(current.daily || {}), [day]: (Number(current.daily?.[day]) || 0) + 1 };
  current.count = (Number(current.count) || 0) + 1;
  current.lastUsedAt = now;
  current.daily = Object.fromEntries(Object.entries(daily).sort(([left], [right]) => left.localeCompare(right)).slice(-FEATURE_USAGE_DAYS));
  state.featureUsage.features[feature] = current;
  state.featureUsageDirty = true;
  scheduleFeatureUsageSave();
}

function emptyReportNotes() {
  return { version: 1, notes: {} };
}

function normalizeReportNotes(value) {
  const entries = Object.entries(value?.notes || {})
    .map(([reportId, note]) => {
      const text = String(note?.text || "").replace(/\r/g, "").slice(0, 10000);
      if (!reportId || !text.trim()) return null;
      return [reportId, {
        text,
        updatedAt: typeof note?.updatedAt === "string" ? note.updatedAt : ""
      }];
    })
    .filter(Boolean)
    .sort((left, right) => right[1].updatedAt.localeCompare(left[1].updatedAt))
    .slice(0, REPORT_NOTES_LIMIT);
  return { version: 1, notes: Object.fromEntries(entries) };
}

function reportNoteText(reportId) {
  return state.reportNotes.notes?.[reportId]?.text || "";
}

function setReportNotesStatus(message) {
  els.reportNoteStatus.textContent = message;
}

async function loadReportNotes() {
  if (state.reportNotesLoaded) return state.reportNotes;
  if (state.reportNotesLoadPromise) return state.reportNotesLoadPromise;
  const owner = state.auth?.user?.id || "";
  if (!owner) return state.reportNotes;
  const generation = state.authGeneration;
  const loadPromise = (async () => {
    try {
      const filter = `owner="${owner}" && key="${REPORT_NOTES_SETTINGS_KEY}"`;
      const data = await pbList("user_settings", { perPage: 1, filter, fields: "id,value" });
      if (generation !== state.authGeneration) return state.reportNotes;
      const record = data.items?.[0];
      state.reportNotesSettingsId = record?.id || "";
      state.reportNotes = normalizeReportNotes(record?.value);
    } catch (error) {
      if (generation === state.authGeneration) state.reportNotes = emptyReportNotes();
      console.warn("Report notes sync unavailable.", error);
    } finally {
      if (state.reportNotesLoadPromise === loadPromise) {
        state.reportNotesLoaded = true;
        state.reportNotesLoadPromise = null;
      }
    }
    return state.reportNotes;
  })();
  state.reportNotesLoadPromise = loadPromise;
  return loadPromise;
}

function scheduleReportNotesSave(delay = 650) {
  window.clearTimeout(state.reportNotesSaveTimer);
  setReportNotesStatus("Saving...");
  state.reportNotesSaveTimer = window.setTimeout(() => {
    saveReportNotes().catch(error => {
      setReportNotesStatus("Not saved");
      console.warn("Report notes could not be saved.", error);
    });
  }, delay);
}

async function saveReportNotes() {
  window.clearTimeout(state.reportNotesSaveTimer);
  state.reportNotesSaveTimer = 0;
  if (!state.auth?.user?.id || !state.reportNotesDirty) return;
  if (state.reportNotesSavePromise) return state.reportNotesSavePromise;
  const owner = state.auth.user.id;
  const savePromise = (async () => {
    while (state.reportNotesDirty && state.auth?.user?.id === owner) {
      state.reportNotesDirty = false;
      const value = normalizeReportNotes(structuredClone(state.reportNotes));
      try {
        if (state.reportNotesSettingsId) {
          await pbUpdate("user_settings", state.reportNotesSettingsId, { value });
        } else {
          const created = await pbCreate("user_settings", {
            owner,
            key: REPORT_NOTES_SETTINGS_KEY,
            value
          });
          state.reportNotesSettingsId = created.id;
        }
      } catch (error) {
        if (state.auth?.user?.id === owner) state.reportNotesDirty = true;
        throw error;
      }
    }
    setReportNotesStatus("Saved");
    trackFeature("report_note.save");
  })();
  state.reportNotesSavePromise = savePromise;
  try {
    await savePromise;
  } finally {
    if (state.reportNotesSavePromise === savePromise) state.reportNotesSavePromise = null;
  }
}

function setReportNote(reportId, value) {
  if (!reportId) return;
  const text = String(value || "").replace(/\r/g, "").slice(0, 10000);
  if (text.trim()) {
    state.reportNotes.notes[reportId] = { text, updatedAt: new Date().toISOString() };
  } else {
    delete state.reportNotes.notes[reportId];
  }
  state.reportNotesDirty = true;
  scheduleReportNotesSave();
  updateReportNoteButton();
}

function removeReportNote(reportId) {
  if (!state.reportNotes.notes?.[reportId]) return;
  delete state.reportNotes.notes[reportId];
  state.reportNotesDirty = true;
  scheduleReportNotesSave(0);
}

function emptyPersonalNotes() {
  return { version: 4, notes: [] };
}

function normalizePersonalNoteAsset(asset) {
  const recordId = String(asset?.recordId || "").trim();
  const filename = String(asset?.filename || "").trim();
  if (!recordId || !filename) return null;
  const width = Number(asset?.width);
  const height = Number(asset?.height);
  return {
    recordId,
    filename,
    alt: String(asset?.alt || imageAltFromName(filename)).replace(/\s+/g, " ").trim().slice(0, 160) || "Pawlet image",
    width: Number.isFinite(width) && width > 0
      ? clampPersonalNoteSize(width, PERSONAL_NOTE_IMAGE_MIN_WIDTH, PERSONAL_NOTE_IMAGE_MAX_WIDTH, PERSONAL_NOTE_IMAGE_MIN_WIDTH)
      : 0,
    height: Number.isFinite(height) && height > 0
      ? clampPersonalNoteSize(height, PERSONAL_NOTE_IMAGE_MIN_HEIGHT, PERSONAL_NOTE_IMAGE_MAX_HEIGHT, PERSONAL_NOTE_IMAGE_MIN_HEIGHT)
      : 0
  };
}

function personalNoteAssets(note) {
  return (Array.isArray(note?.images) ? note.images : []).map(normalizePersonalNoteAsset).filter(Boolean);
}

function personalNoteImageUrl(asset) {
  return protectedFileUrl(pbFileUrl("guidelines", asset.recordId, asset.filename));
}

function titleFromPersonalNoteText(text) {
  const firstLine = String(text || "").split("\n").map(line => line.trim()).find(Boolean) || "Untitled note";
  return firstLine.slice(0, 80);
}

function clampPersonalNotePosition(value, max) {
  const number = Number(value);
  return Math.round(Math.min(max, Math.max(12, Number.isFinite(number) ? number : 12)));
}

function clampPersonalNoteSize(value, min, max, fallback) {
  const number = Number(value);
  return Math.round(Math.min(max, Math.max(min, Number.isFinite(number) ? number : fallback)));
}

function normalizePersonalNotes(value) {
  const notes = (Array.isArray(value?.notes) ? value.notes : [])
    .map((note, index) => {
      const text = String(note?.text || "").replace(/\r/g, "").slice(0, 10000);
      const fallbackX = 26 + (index % 6) * 265;
      const fallbackY = 26 + Math.floor(index / 6) * 215;
      const color = Number(note?.color);
      const type = note?.type === "image" ? "image" : "note";
      const images = personalNoteAssets(note).slice(0, 12);
      const width = clampPersonalNoteSize(note?.width, PERSONAL_NOTE_CARD_MIN_WIDTH, PERSONAL_NOTE_CARD_MAX_SIZE, PERSONAL_NOTE_CARD_WIDTH);
      const height = clampPersonalNoteSize(note?.height, PERSONAL_NOTE_CARD_MIN_HEIGHT, PERSONAL_NOTE_CARD_MAX_SIZE, PERSONAL_NOTE_CARD_HEIGHT);
      return {
        id: String(note?.id || ""),
        type,
        title: String(note?.title || (type === "image" ? images[0]?.alt : titleFromPersonalNoteText(text)) || "Untitled note").replace(/\s+/g, " ").trim().slice(0, 120) || "Untitled note",
        text,
        images,
        x: clampPersonalNotePosition(note?.x ?? fallbackX, PERSONAL_NOTE_BOARD_WIDTH - width - 12),
        y: clampPersonalNotePosition(note?.y ?? fallbackY, PERSONAL_NOTE_BOARD_HEIGHT - height - 12),
        width,
        height,
        collapsed: Boolean(note?.collapsed),
        z: Math.max(1, Math.round(Number(note?.z) || index + 1)),
        color: Math.max(0, Math.min(5, Math.round(Number.isFinite(color) ? color : index % 6))),
        createdAt: typeof note?.createdAt === "string" ? note.createdAt : "",
        updatedAt: typeof note?.updatedAt === "string" ? note.updatedAt : ""
      };
    })
    .filter(note => note.id)
    .sort((left, right) => left.z - right.z)
    .slice(-PERSONAL_NOTES_LIMIT);
  return { version: 4, notes };
}

function setPersonalNotesStatus(message) {
  els.alwaysNotesStatus.textContent = message;
}

async function loadPersonalNotes() {
  if (state.personalNotesLoaded) return state.personalNotes;
  if (state.personalNotesLoadPromise) return state.personalNotesLoadPromise;
  const owner = state.auth?.user?.id || "";
  if (!owner) return state.personalNotes;
  const generation = state.authGeneration;
  const loadPromise = (async () => {
    try {
      const filter = `owner="${owner}" && key="${PERSONAL_NOTES_SETTINGS_KEY}"`;
      const data = await pbList("user_settings", { perPage: 1, filter, fields: "id,value" });
      if (generation !== state.authGeneration) return state.personalNotes;
      const record = data.items?.[0];
      state.personalNotesSettingsId = record?.id || "";
      state.personalNotes = normalizePersonalNotes(record?.value);
    } catch (error) {
      if (generation === state.authGeneration) state.personalNotes = emptyPersonalNotes();
      console.warn("Personal notes sync unavailable.", error);
    } finally {
      if (state.personalNotesLoadPromise === loadPromise) {
        state.personalNotesLoaded = true;
        state.personalNotesLoadPromise = null;
      }
    }
    if (generation === state.authGeneration) renderPersonalNotes();
    return state.personalNotes;
  })();
  state.personalNotesLoadPromise = loadPromise;
  return loadPromise;
}

function schedulePersonalNotesSave(delay = 650) {
  window.clearTimeout(state.personalNotesSaveTimer);
  setPersonalNotesStatus("Saving...");
  state.personalNotesSaveTimer = window.setTimeout(() => {
    savePersonalNotes().catch(error => {
      setPersonalNotesStatus("Not saved");
      console.warn("Personal notes could not be saved.", error);
    });
  }, delay);
}

async function savePersonalNotes() {
  window.clearTimeout(state.personalNotesSaveTimer);
  state.personalNotesSaveTimer = 0;
  if (!state.auth?.user?.id || !state.personalNotesDirty) return;
  if (state.personalNotesSavePromise) return state.personalNotesSavePromise;
  const owner = state.auth.user.id;
  const savePromise = (async () => {
    while (state.personalNotesDirty && state.auth?.user?.id === owner) {
      state.personalNotesDirty = false;
      const value = normalizePersonalNotes(structuredClone(state.personalNotes));
      try {
        if (state.personalNotesSettingsId) {
          await pbUpdate("user_settings", state.personalNotesSettingsId, { value });
        } else {
          const created = await pbCreate("user_settings", {
            owner,
            key: PERSONAL_NOTES_SETTINGS_KEY,
            value
          });
          state.personalNotesSettingsId = created.id;
        }
      } catch (error) {
        if (state.auth?.user?.id === owner) state.personalNotesDirty = true;
        throw error;
      }
    }
    setPersonalNotesStatus("Saved");
    if (state.personalNotesEditPending) {
      state.personalNotesEditPending = false;
      trackFeature("always_notes.edit");
    }
  })();
  state.personalNotesSavePromise = savePromise;
  try {
    await savePromise;
  } finally {
    if (state.personalNotesSavePromise === savePromise) state.personalNotesSavePromise = null;
  }
}

function observePersonalNoteSizes() {
  state.personalNotesResizeObserver?.disconnect();
  state.personalNotesResizeObserver = null;
  if (!("ResizeObserver" in window)) return;
  state.personalNotesResizeObserver = new ResizeObserver(entries => {
    let changed = false;
    entries.forEach(entry => {
      let entryChanged = false;
      const card = entry.target;
      const note = state.personalNotes.notes.find(item => item.id === card.dataset.personalNoteId);
      if (!note) return;
      const rect = card.getBoundingClientRect();
      if (rect.width < PERSONAL_NOTE_CARD_MIN_WIDTH || (!note.collapsed && rect.height < PERSONAL_NOTE_CARD_MIN_HEIGHT)) return;
      const width = clampPersonalNoteSize(rect.width, PERSONAL_NOTE_CARD_MIN_WIDTH, PERSONAL_NOTE_CARD_MAX_SIZE, PERSONAL_NOTE_CARD_WIDTH);
      const height = clampPersonalNoteSize(rect.height, PERSONAL_NOTE_CARD_MIN_HEIGHT, PERSONAL_NOTE_CARD_MAX_SIZE, PERSONAL_NOTE_CARD_HEIGHT);
      if (width !== note.width) {
        note.width = width;
        entryChanged = true;
      }
      if (!note.collapsed && height !== note.height) {
        note.height = height;
        entryChanged = true;
      }
      const nextX = clampPersonalNotePosition(note.x, PERSONAL_NOTE_BOARD_WIDTH - note.width - 12);
      const nextY = clampPersonalNotePosition(note.y, PERSONAL_NOTE_BOARD_HEIGHT - (note.collapsed ? 38 : note.height) - 12);
      if (nextX !== note.x || nextY !== note.y) {
        note.x = nextX;
        note.y = nextY;
        card.style.left = `${nextX}px`;
        card.style.top = `${nextY}px`;
        entryChanged = true;
      }
      if (entryChanged) {
        note.updatedAt = new Date().toISOString();
        changed = true;
      }
    });
    if (!changed) return;
    state.personalNotesDirty = true;
    schedulePersonalNotesSave();
    window.clearTimeout(state.personalNotesResizeTrackTimer);
    state.personalNotesResizeTrackTimer = window.setTimeout(() => {
      state.personalNotesResizeTrackTimer = 0;
      trackFeature("always_notes.resize");
    }, 900);
  });
  els.personalNotesBoard.querySelectorAll("[data-personal-note-id]").forEach(card => state.personalNotesResizeObserver.observe(card));
}

function renderPersonalNotes() {
  const notes = state.personalNotes.notes || [];
  els.alwaysNotesCount.textContent = String(notes.length);
  if (!notes.length) {
    state.personalNotesResizeObserver?.disconnect();
    els.personalNotesBoard.innerHTML = '<div class="personal-notes-empty">Create a note or paste an image, then arrange the board around the way you think.</div>';
    return;
  }
  els.personalNotesBoard.innerHTML = notes.map(note => `
    <div class="personal-note-card ${note.type === "image" ? "is-image-note" : ""} ${note.collapsed ? "is-collapsed" : ""}" data-personal-note-id="${escapeHtml(note.id)}" data-note-color="${note.color}" style="left:${note.x}px;top:${note.y}px;width:${note.width}px;height:${note.collapsed ? 38 : note.height}px;z-index:${note.z}" title="Right-click for actions">
      <div class="personal-note-head" data-note-drag>
        <span class="personal-note-grip" aria-hidden="true" title="Drag note">::</span>
        <input class="personal-note-title" data-note-title maxlength="120" value="${escapeHtml(note.title)}" aria-label="Note title">
        <button class="personal-note-add-image" data-note-add-image type="button" aria-label="Add image to note" title="Add image">Image</button>
        <button class="personal-note-collapse" data-note-collapse type="button" aria-label="${note.collapsed ? "Expand" : "Collapse"} note" title="${note.collapsed ? "Expand" : "Collapse"} note">${note.collapsed ? "+" : "&minus;"}</button>
      </div>
      ${note.type === "image" ? `
        <div class="personal-note-image-body">
          ${personalNoteImageGallery(note, { showEmpty: true })}
        </div>
      ` : `
        <div class="personal-note-content">
          <textarea class="personal-note-body" data-note-body maxlength="10000" aria-label="Note body">${escapeHtml(note.text)}</textarea>
          ${personalNoteImageGallery(note, { resizable: true })}
        </div>
      `}
      <button class="personal-note-resize" data-note-resize type="button" aria-label="Resize note" title="Resize note"></button>
    </div>
  `).join("");
  observePersonalNoteSizes();
}

function personalNoteImageGallery(note, { showEmpty = false, resizable = false } = {}) {
  const images = personalNoteAssets(note);
  if (!images.length) return showEmpty ? '<div class="personal-note-image-empty">Add or paste an image</div>' : "";
  return `<div class="personal-note-images ${images.length === 1 ? "is-single" : ""}">${images.map((asset, index) => `
    <figure class="personal-note-image" data-note-image-index="${index}"${resizable ? ` style="width:${asset.width ? `${asset.width}px` : images.length === 1 ? "100%" : "calc(50% - 3px)"};height:${asset.height ? `${asset.height}px` : "128px"}"` : ""}>
      <img src="${escapeHtml(personalNoteImageUrl(asset))}" alt="${escapeHtml(asset.alt)}" loading="lazy" data-note-image-record="${escapeHtml(asset.recordId)}" data-note-image-file="${escapeHtml(asset.filename)}" title="Double-click to view full screen">
      <button class="personal-note-image-remove" type="button" data-note-image-remove="${index}" aria-label="Remove ${escapeHtml(asset.alt)}" title="Remove image">&times;</button>
      ${resizable ? `<button class="personal-note-image-resize" type="button" data-note-image-resize="${index}" aria-label="Resize ${escapeHtml(asset.alt)}" title="Resize image"></button>` : ""}
    </figure>
  `).join("")}</div>`;
}

function topPersonalNoteZ() {
  return Math.max(0, ...state.personalNotes.notes.map(note => Number(note.z) || 0));
}

function createPersonalNote({ type = "note", title = "", images = [], position = null } = {}) {
  if (state.personalNotes.notes.length >= PERSONAL_NOTES_LIMIT) {
    showToast("Pawlet is full", `Delete a note before adding more than ${PERSONAL_NOTES_LIMIT}.`, "info");
    return null;
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID?.() || `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const offset = state.personalNotes.notes.length * 26;
  const isImage = type === "image";
  const width = isImage ? 320 : PERSONAL_NOTE_CARD_WIDTH;
  const height = isImage ? 280 : PERSONAL_NOTE_CARD_HEIGHT;
  const x = clampPersonalNotePosition(position?.x ?? els.personalNotesCanvas.scrollLeft + 34 + (offset % 520), PERSONAL_NOTE_BOARD_WIDTH - width - 12);
  const y = clampPersonalNotePosition(position?.y ?? els.personalNotesCanvas.scrollTop + 34 + (offset % 310), PERSONAL_NOTE_BOARD_HEIGHT - height - 12);
  state.personalNotes.notes.push({
    id,
    type: isImage ? "image" : "note",
    title: title || (isImage ? "Image" : "New note"),
    text: "",
    images: personalNoteAssets({ images }),
    x,
    y,
    width,
    height,
    collapsed: false,
    z: topPersonalNoteZ() + 1,
    color: state.personalNotes.notes.length % 6,
    createdAt: now,
    updatedAt: now
  });
  state.personalNotesDirty = true;
  renderPersonalNotes();
  schedulePersonalNotesSave(0);
  trackFeature(isImage ? "always_notes.image_card" : "always_notes.add");
  window.setTimeout(() => {
    const card = [...els.personalNotesBoard.querySelectorAll("[data-personal-note-id]")].find(item => item.dataset.personalNoteId === id);
    const titleInput = card?.querySelector("[data-note-title]");
    if (!isImage) {
      titleInput?.focus();
      titleInput?.select();
    }
  }, 0);
  return id;
}

function pawletImageFiles(source) {
  return [...(source || [])].filter(file => file?.type?.startsWith("image/"));
}

function pawletBoardPosition(event = null) {
  if (!event?.clientX || !event?.clientY) {
    return {
      x: els.personalNotesCanvas.scrollLeft + 50,
      y: els.personalNotesCanvas.scrollTop + 50
    };
  }
  const rect = els.personalNotesBoard.getBoundingClientRect();
  return { x: event.clientX - rect.left - 150, y: event.clientY - rect.top - 28 };
}

async function createPawletImageAsset(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose a PNG, JPG, GIF, WebP, or similar image.");
  const maxImageMb = 8;
  if (file.size > maxImageMb * 1024 * 1024) throw new Error(`Choose an image under ${maxImageMb} MB.`);
  const owner = state.auth?.user?.id || "";
  if (!owner) throw new AuthSessionError();
  const title = `Pawlet image: ${imageAltFromName(file.name)}`.slice(0, 120);
  const created = await pbCreate("guidelines", {
    title,
    modality: "",
    topic: "",
    bodyPart: "",
    tags: "pawlet-asset",
    markdown: "",
    keywords: "pawlet image asset",
    owner
  });
  try {
    const updated = await pbUploadFiles("guidelines", created.id, "images", [file]);
    const filename = [...(updated.images || [])].at(-1);
    if (!filename) throw new Error("PocketBase did not return an uploaded image filename.");
    return { recordId: created.id, filename, alt: imageAltFromName(file.name) };
  } catch (error) {
    pbDelete("guidelines", created.id).catch(() => {});
    throw error;
  }
}

async function uploadPawletImages(files, { targetNoteId = "", position = null } = {}) {
  const images = pawletImageFiles(files);
  if (!images.length) {
    showToast("Image only", "Choose or paste an image file.", "info");
    return;
  }
  const target = state.personalNotes.notes.find(note => note.id === targetNoteId);
  const available = target ? Math.max(0, 12 - personalNoteAssets(target).length) : Math.max(0, PERSONAL_NOTES_LIMIT - state.personalNotes.notes.length);
  if (!available) {
    showToast(target ? "Note images full" : "Pawlet is full", target ? "Each note can hold up to 12 images." : `Pawlet can hold up to ${PERSONAL_NOTES_LIMIT} cards.`, "info");
    return;
  }
  const selected = images.slice(0, available);
  let uploaded = 0;
  let failed = 0;
  for (const [index, file] of selected.entries()) {
    try {
      setPersonalNotesStatus(`Uploading ${index + 1}/${selected.length}`);
      const asset = await createPawletImageAsset(file);
      if (target) {
        target.images = [...personalNoteAssets(target), asset];
        target.updatedAt = new Date().toISOString();
      } else {
        const base = position || pawletBoardPosition();
        createPersonalNote({
          type: "image",
          title: asset.alt,
          images: [asset],
          position: { x: base.x + index * 24, y: base.y + index * 24 }
        });
      }
      uploaded += 1;
    } catch (error) {
      failed += 1;
      console.warn("Pawlet image upload failed.", error);
      showToast("Image upload failed", friendlyErrorMessage(error), "error");
    }
  }
  if (target && uploaded) {
    state.personalNotesDirty = true;
    state.personalNotesEditPending = true;
    trackFeature("always_notes.image_embed");
  }
  if (uploaded) {
    try {
      await ensureGuidelineFileToken();
    } catch (error) {
      console.warn("Pawlet image access token could not be refreshed.", error);
    }
    renderPersonalNotes();
    schedulePersonalNotesSave(0);
    showToast(uploaded === 1 ? "Image added" : `${uploaded} images added`, target ? target.title : "Pawlet board");
  } else {
    setPersonalNotesStatus(failed ? "Not saved" : "");
  }
}

function openPawletImagePicker(targetNoteId = "") {
  state.personalNoteImageTargetId = targetNoteId;
  els.personalNoteImageInput.value = "";
  els.personalNoteImageInput.click();
}

async function deletePawletAssets(assets) {
  const results = await Promise.allSettled(personalNoteAssets({ images: assets }).map(asset => pbDelete("guidelines", asset.recordId)));
  if (results.some(result => result.status === "rejected")) {
    showToast("Image removed", "The note was updated, but an unused file could not be cleaned up.", "info");
  }
}

async function removePersonalNoteImage(noteId, imageIndex) {
  const note = state.personalNotes.notes.find(item => item.id === noteId);
  const images = personalNoteAssets(note);
  const asset = images[Number(imageIndex)];
  if (!note || !asset) return;
  if (!confirm(`Remove this image (${asset.alt || "image"})?`)) return;
  note.images = images.filter((_, index) => index !== Number(imageIndex));
  note.updatedAt = new Date().toISOString();
  if (note.type === "image" && !note.images.length) {
    state.personalNotes.notes = state.personalNotes.notes.filter(item => item.id !== note.id);
  }
  state.personalNotesDirty = true;
  renderPersonalNotes();
  schedulePersonalNotesSave(0);
  trackFeature("always_notes.image_delete");
  await deletePawletAssets([asset]);
}

function bringPersonalNoteToFront(id, card) {
  const note = state.personalNotes.notes.find(item => item.id === id);
  if (!note || note.z === topPersonalNoteZ()) return;
  note.z = topPersonalNoteZ() + 1;
  note.updatedAt = new Date().toISOString();
  if (card) card.style.zIndex = String(note.z);
  state.personalNotesDirty = true;
  schedulePersonalNotesSave(900);
}

function startPersonalNoteDrag(event, card) {
  const handle = event.target.closest("[data-note-drag]");
  if (!handle || event.target.closest("input, textarea, button")) return;
  const note = state.personalNotes.notes.find(item => item.id === card.dataset.personalNoteId);
  if (!note) return;
  event.preventDefault();
  bringPersonalNoteToFront(note.id, card);
  const startX = event.clientX;
  const startY = event.clientY;
  const originX = note.x;
  const originY = note.y;
  let moved = false;
  card.classList.add("is-dragging");
  const move = moveEvent => {
    const nextX = clampPersonalNotePosition(originX + moveEvent.clientX - startX, PERSONAL_NOTE_BOARD_WIDTH - note.width - 12);
    const nextY = clampPersonalNotePosition(originY + moveEvent.clientY - startY, PERSONAL_NOTE_BOARD_HEIGHT - (note.collapsed ? 38 : note.height) - 12);
    moved ||= nextX !== originX || nextY !== originY;
    note.x = nextX;
    note.y = nextY;
    card.style.left = `${nextX}px`;
    card.style.top = `${nextY}px`;
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    card.classList.remove("is-dragging");
    if (!moved) return;
    note.updatedAt = new Date().toISOString();
    state.personalNotesDirty = true;
    schedulePersonalNotesSave();
    trackFeature("always_notes.move");
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startPersonalNoteResize(event, card) {
  if (!event.target.closest("[data-note-resize]") || card.classList.contains("is-collapsed")) return;
  const note = state.personalNotes.notes.find(item => item.id === card.dataset.personalNoteId);
  if (!note) return;
  event.preventDefault();
  event.stopPropagation();
  bringPersonalNoteToFront(note.id, card);
  const startX = event.clientX;
  const startY = event.clientY;
  const originWidth = card.getBoundingClientRect().width;
  const originHeight = card.getBoundingClientRect().height;
  let resized = false;
  card.classList.add("is-resizing");
  const move = moveEvent => {
    const width = clampPersonalNoteSize(originWidth + moveEvent.clientX - startX, PERSONAL_NOTE_CARD_MIN_WIDTH, PERSONAL_NOTE_CARD_MAX_SIZE, PERSONAL_NOTE_CARD_WIDTH);
    const height = clampPersonalNoteSize(originHeight + moveEvent.clientY - startY, PERSONAL_NOTE_CARD_MIN_HEIGHT, PERSONAL_NOTE_CARD_MAX_SIZE, PERSONAL_NOTE_CARD_HEIGHT);
    resized ||= width !== originWidth || height !== originHeight;
    note.width = width;
    note.height = height;
    note.x = clampPersonalNotePosition(note.x, PERSONAL_NOTE_BOARD_WIDTH - width - 12);
    note.y = clampPersonalNotePosition(note.y, PERSONAL_NOTE_BOARD_HEIGHT - height - 12);
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    card.style.left = `${note.x}px`;
    card.style.top = `${note.y}px`;
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    card.classList.remove("is-resizing");
    if (!resized) return;
    note.updatedAt = new Date().toISOString();
    state.personalNotesDirty = true;
    schedulePersonalNotesSave();
    trackFeature("always_notes.resize");
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function startPersonalNoteImageResize(event, card, handle) {
  if (!handle || card.classList.contains("is-collapsed")) return;
  const note = state.personalNotes.notes.find(item => item.id === card.dataset.personalNoteId);
  const images = personalNoteAssets(note);
  const imageIndex = Number(handle.dataset.noteImageResize);
  const asset = images[imageIndex];
  const figure = handle.closest("[data-note-image-index]");
  if (!note || !asset || !figure) return;
  event.preventDefault();
  event.stopPropagation();
  bringPersonalNoteToFront(note.id, card);
  const startX = event.clientX;
  const startY = event.clientY;
  const rect = figure.getBoundingClientRect();
  const originWidth = rect.width;
  const originHeight = rect.height;
  const maxWidth = Math.max(PERSONAL_NOTE_IMAGE_MIN_WIDTH, Math.min(PERSONAL_NOTE_IMAGE_MAX_WIDTH, card.clientWidth - 24));
  let resized = false;
  figure.classList.add("is-resizing");
  const move = moveEvent => {
    const width = clampPersonalNoteSize(originWidth + moveEvent.clientX - startX, PERSONAL_NOTE_IMAGE_MIN_WIDTH, maxWidth, originWidth);
    const height = clampPersonalNoteSize(originHeight + moveEvent.clientY - startY, PERSONAL_NOTE_IMAGE_MIN_HEIGHT, PERSONAL_NOTE_IMAGE_MAX_HEIGHT, originHeight);
    resized ||= width !== Math.round(originWidth) || height !== Math.round(originHeight);
    asset.width = width;
    asset.height = height;
    figure.style.width = `${width}px`;
    figure.style.height = `${height}px`;
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    figure.classList.remove("is-resizing");
    if (!resized) return;
    note.images = images;
    note.updatedAt = new Date().toISOString();
    state.personalNotesDirty = true;
    schedulePersonalNotesSave();
    trackFeature("always_notes.image_resize");
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function togglePersonalNoteCollapsed(id, card, button) {
  const note = state.personalNotes.notes.find(item => item.id === id);
  if (!note) return;
  if (!note.collapsed) {
    const rect = card.getBoundingClientRect();
    note.width = clampPersonalNoteSize(rect.width, PERSONAL_NOTE_CARD_MIN_WIDTH, PERSONAL_NOTE_CARD_MAX_SIZE, PERSONAL_NOTE_CARD_WIDTH);
    note.height = clampPersonalNoteSize(rect.height, PERSONAL_NOTE_CARD_MIN_HEIGHT, PERSONAL_NOTE_CARD_MAX_SIZE, PERSONAL_NOTE_CARD_HEIGHT);
  }
  note.collapsed = !note.collapsed;
  note.updatedAt = new Date().toISOString();
  card.classList.toggle("is-collapsed", note.collapsed);
  card.style.width = `${note.width}px`;
  card.style.height = `${note.collapsed ? 38 : note.height}px`;
  button.textContent = note.collapsed ? "+" : "-";
  button.setAttribute("aria-label", `${note.collapsed ? "Expand" : "Collapse"} note`);
  button.title = `${note.collapsed ? "Expand" : "Collapse"} note`;
  state.personalNotesDirty = true;
  schedulePersonalNotesSave();
  trackFeature("always_notes.collapse");
}

async function deletePersonalNote(id) {
  const note = state.personalNotes.notes.find(item => item.id === id);
  if (!note || !confirm("Delete this note?")) return;
  state.personalNotes.notes = state.personalNotes.notes.filter(item => item.id !== id);
  state.personalNotesDirty = true;
  renderPersonalNotes();
  schedulePersonalNotesSave(0);
  trackFeature("always_notes.delete");
  await deletePawletAssets(note.images);
}

function setAlwaysNotesOpen(open) {
  state.alwaysNotesOpen = Boolean(open);
  if (state.alwaysNotesOpen) setShorthandOpen(false);
  els.alwaysNotesPopover.classList.toggle("hidden", !state.alwaysNotesOpen);
  els.alwaysNotesBtn.setAttribute("aria-expanded", String(state.alwaysNotesOpen));
  if (state.alwaysNotesOpen) {
    state.personalNotePasteTargetId = "";
    renderPersonalNotes();
    if (state.personalNotes.notes.some(note => personalNoteAssets(note).length)) {
      ensureGuidelineFileToken()
        .then(() => {
          if (state.alwaysNotesOpen) renderPersonalNotes();
        })
        .catch(error => console.warn("Pawlet image access could not be refreshed.", error));
    }
    trackFeature("always_notes.open");
  }
}

function openPawletImageLightbox(image) {
  const card = image.closest("[data-personal-note-id]");
  const noteTitle = card?.querySelector("[data-note-title]")?.value?.trim();
  const caption = image.alt?.trim() || noteTitle || "Pawlet image";
  els.pawletImageLightboxImage.src = image.currentSrc || image.src;
  els.pawletImageLightboxImage.alt = caption;
  els.pawletImageLightboxCaption.textContent = caption;
  if (!els.pawletImageLightbox.open) els.pawletImageLightbox.showModal();
  trackFeature("always_notes.image_view");
}

function closePawletImageLightbox() {
  if (els.pawletImageLightbox.open) els.pawletImageLightbox.close();
}

function updateReportNoteButton() {
  const hasNote = Boolean(reportNoteText(state.selectedWorklogReport?.id));
  els.quickReportNoteBtn.classList.toggle("has-note", hasNote);
  els.quickReportNoteDot.classList.toggle("hidden", !hasNote);
}

function setReportNotePopoverOpen(open) {
  const canOpen = Boolean(state.selectedWorklogReport);
  state.reportNotePopoverOpen = Boolean(open && canOpen);
  els.reportNotePopover.classList.toggle("hidden", !state.reportNotePopoverOpen);
  els.quickReportNoteBtn.setAttribute("aria-expanded", String(state.reportNotePopoverOpen));
  if (state.reportNotePopoverOpen) {
    els.reportPersonalNoteInput.value = reportNoteText(state.selectedWorklogReport.id);
    setReportNotesStatus(els.reportPersonalNoteInput.value ? "Saved" : "");
    trackFeature("report_note.open");
    window.setTimeout(() => els.reportPersonalNoteInput.focus(), 0);
  }
}

function openReportNote(reportId = "") {
  if (reportId && state.selectedWorklogReport?.id !== reportId) selectWorklogReport(reportId);
  setReportNotePopoverOpen(true);
}

async function ensureGuidelineFileToken() {
  if (!state.auth?.token) return "";
  if (state.guidelineFileToken && Date.now() < state.guidelineFileTokenExpiresAt) return state.guidelineFileToken;
  const response = await authenticatedFetch(`${POCKETBASE_URL.replace(/\/$/, "")}/api/files/token`, { method: "POST" });
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
  const response = await authenticatedFetch(`${API}/${collection}/records/${id}`, {
    method: "PATCH",
    body: formData
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
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

function selectedAiReasoning() {
  return els.aiReasoningInputs.find(input => input.checked)?.value || "medium";
}

function setAiSettingsForm(value = {}) {
  const prompt = typeof value.prompt === "string" && value.prompt.trim()
    ? value.prompt
    : DEFAULT_AI_PROMPT;
  const reasoning = ["low", "medium", "high"].includes(value.reasoning) ? value.reasoning : "medium";
  els.aiPromptInput.value = prompt;
  els.aiReasoningInputs.forEach(input => {
    input.checked = input.value === reasoning;
  });
}

async function loadAiSettings() {
  state.aiSettingsId = "";
  state.aiSettingsLoaded = false;
  setAiSettingsForm();
  try {
    const filter = `owner="${state.auth?.user?.id || ""}" && key="aiDraft"`;
    const data = await pbList("user_settings", {
      perPage: 1,
      filter,
      fields: "id,value"
    });
    const record = data.items?.[0];
    if (record) {
      state.aiSettingsId = record.id;
      setAiSettingsForm(record.value || {});
    }
  } catch (error) {
    console.warn("AI settings sync unavailable; using defaults.", error);
  }
  state.aiSettingsLoaded = true;
}

async function saveAiSettings() {
  const prompt = els.aiPromptInput.value.trim();
  if (!prompt) {
    showToast("Prompt required", "Add impression instructions or reset to the default.", "info");
    return false;
  }
  const value = { prompt, reasoning: selectedAiReasoning() };
  if (state.aiSettingsId) {
    await pbUpdate("user_settings", state.aiSettingsId, { value });
  } else {
    const created = await pbCreate("user_settings", {
      owner: state.auth?.user?.id || "",
      key: "aiDraft",
      value
    });
    state.aiSettingsId = created.id;
  }
  state.aiSettingsLoaded = true;
  showToast("AI settings saved", "The next draft will use these instructions.");
  return true;
}

function toggleAiSettings() {
  const willOpen = els.aiSettingsPanel.classList.contains("hidden");
  els.aiSettingsPanel.classList.toggle("hidden", !willOpen);
  els.aiSettingsToggleBtn.setAttribute("aria-expanded", String(willOpen));
  els.aiSettingsToggleBtn.classList.toggle("active", willOpen);
  if (willOpen) els.aiPromptInput.focus();
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

function beginDataLoad(key) {
  const epoch = (state.dataLoadEpochs[key] || 0) + 1;
  state.dataLoadEpochs[key] = epoch;
  return { epoch, owner: state.auth?.user?.id || "" };
}

function isCurrentDataLoad(key, request) {
  return state.dataLoadEpochs[key] === request.epoch
    && (state.auth?.user?.id || "") === request.owner;
}

function invalidateDataLoads() {
  Object.keys(state.dataLoadEpochs).forEach(key => {
    state.dataLoadEpochs[key] += 1;
  });
}

async function loadFacets() {
  const request = beginDataLoad("facets");
  const records = [];
  for (let page = 1; page < 80; page += 1) {
    const data = await pbList("old_reports", {
      page,
      perPage: 500,
      fields: "modality,topic,bodyPart"
    });
    records.push(...data.items);
    if (page >= data.totalPages) break;
  }
  if (!isCurrentDataLoad("facets", request)) return false;
  state.oldFacetRecords = records;
  updateFilterOptions("old");
  updateEditorDatalists("report");
  await loadTemplateFacets();
  return true;
}

async function loadTemplateFacets() {
  const request = beginDataLoad("templateFacets");
  const data = await pbList("templates", {
    page: 1,
    perPage: 500,
    sort: "modality,topic,bodyPart",
    fields: "modality,topic,bodyPart"
  });
  if (!isCurrentDataLoad("templateFacets", request)) return false;
  state.templateFacetRecords = data.items;
  updateFilterOptions("template");
  updateEditorDatalists("template");
  return true;
}

function routeState() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const mode = ROUTE_MODES[parts[0]] || "builder";
  const referenceTab = mode === "writer" ? (ROUTE_REFERENCES[parts[1]] || "templates") : state.referenceTab;
  const validMode = Boolean(ROUTE_MODES[parts[0]]);
  const validChild = mode !== "writer" || !parts[1] || Boolean(ROUTE_REFERENCES[parts[1]]);
  return { mode, referenceTab, valid: validMode && validChild && parts.length <= (mode === "writer" ? 2 : 1) };
}

function routeUrl(mode = state.mode, referenceTab = state.referenceTab) {
  const root = MODE_ROUTES[mode] || MODE_ROUTES.builder;
  const child = mode === "writer" ? REFERENCE_ROUTES[referenceTab] || REFERENCE_ROUTES.templates : "";
  return `#/${root}${child ? `/${child}` : ""}`;
}

function updateRoute(mode = state.mode, referenceTab = state.referenceTab, replace = false) {
  const target = routeUrl(mode, referenceTab);
  if (window.location.hash === target) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", target);
}

function syncRouteFromLocation(options = {}) {
  const route = routeState();
  if (options.force || state.mode !== route.mode) {
    showMode(route.mode, { updateRoute: false, loadData: options.loadData });
  }
  if (route.mode === "writer" && (options.force || state.referenceTab !== route.referenceTab)) {
    showReferenceTab(route.referenceTab, { updateRoute: false });
  }
  if (!route.valid || !window.location.hash) updateRoute(route.mode, route.referenceTab, options.replace !== false);
}

function loadViewData(promise, label) {
  Promise.resolve(promise).catch(error => {
    if (error instanceof AuthSessionError) return;
    console.error(`${label} could not be loaded.`, error);
    showToast(`${label} unavailable`, "Check the connection and try again.", "error");
  });
}

async function loadInitialWorkspaceData() {
  const loads = [
    ["filters", loadFacets()],
    ["old reports", loadOldReports()],
    ["templates", loadTemplates()],
    ["work log", loadWorkLog()]
  ];
  const results = await Promise.allSettled(loads.map(([, promise]) => promise));
  const authFailure = results.find(result => result.status === "rejected" && result.reason instanceof AuthSessionError);
  if (authFailure) throw authFailure.reason;
  const failures = results
    .map((result, index) => ({ result, label: loads[index][0] }))
    .filter(item => item.result.status === "rejected");
  failures.forEach(item => console.error(`${item.label} could not be loaded.`, item.result.reason));
  if (failures.length) {
    showToast(
      "Some data is unavailable",
      `${failures.map(item => item.label).join(", ")} will retry when the connection returns.`,
      "error"
    );
  }
  return failures.length === 0;
}

async function reloadActiveView() {
  if (state.mode === "builder") {
    await Promise.all([loadFacets(), loadOldReports(), loadTemplates()]);
    return;
  }
  if (state.mode === "writer") {
    await loadTemplates();
    return;
  }
  if (state.mode === "worklog" || state.mode === "interesting") {
    await loadWorkLog();
    return;
  }
}

function showMode(mode, options = {}) {
  if (!MODE_ROUTES[mode]) mode = "builder";
  if (mode !== "writer") setReferenceDrawer(false);
  state.mode = mode;
  [
    [els.builderModeBtn, "builder"],
    [els.writerModeBtn, "writer"],
    [els.worklogModeBtn, "worklog"],
    [els.interestingModeBtn, "interesting"]
  ].forEach(([link, linkMode]) => {
    const active = mode === linkMode;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  els.builderView.classList.toggle("hidden", mode !== "builder");
  els.writerView.classList.toggle("hidden", mode !== "writer");
  els.worklogView.classList.toggle("hidden", mode !== "worklog" && mode !== "interesting");
  els.builderTopbarContext.classList.toggle("hidden", mode !== "builder");
  els.writerTopbarContext.classList.toggle("hidden", mode !== "writer");
  els.worklogTopbarContext.classList.toggle("hidden", mode !== "worklog");
  els.interestingTopbarContext.classList.toggle("hidden", mode !== "interesting");
  els.worklogSummary.classList.toggle("hidden", mode !== "worklog");
  els.worklogMain.classList.toggle("hidden", mode !== "worklog");
  els.interestingCasesMain.classList.toggle("hidden", mode !== "interesting");
  if (mode === "writer" && options.loadData !== false) {
    loadViewData(loadTemplates(), "Templates");
  }
  if ((mode === "worklog" || mode === "interesting") && options.loadData !== false) {
    loadViewData(loadWorkLog(), mode === "interesting" ? "Interesting Cases" : "Work Log");
  }
  document.title = `PawPlate · ${{
    builder: "Template Builder",
    writer: "Report Writer",
    worklog: "Work Log",
    interesting: "Interesting Cases"
  }[mode]}`;
  if (options.updateRoute !== false) updateRoute(mode);
}

function skeletonRows(count = 6) {
  return Array.from({ length: count }, () => '<div class="skeleton-row" aria-hidden="true"></div>').join("");
}

function setListLoading(listEl, isFirstLoad) {
  if (!listEl) return;
  listEl.setAttribute("aria-busy", "true");
  if (isFirstLoad) {
    listEl.innerHTML = skeletonRows();
  } else {
    listEl.classList.add("is-updating");
  }
}

function clearListLoading(listEl) {
  if (!listEl) return;
  listEl.removeAttribute("aria-busy");
  listEl.classList.remove("is-updating");
}

function hasOldFilters() {
  return Boolean(
    els.oldSearchInput.value.trim()
    || els.oldModalityFilter.value
    || els.oldTopicFilter.value
    || els.oldBodyPartFilter.value
    || els.oldTypeFilter.value
    || els.oldDateFilter.value.trim()
    || els.oldInterestingFilter.checked
  );
}

function hasTemplateFilters() {
  return Boolean(
    els.templateSearchInput.value.trim()
    || els.templateModalityFilter.value
    || els.templateTopicFilter.value
    || els.templateBodyPartFilter.value
    || els.templateTypeFilter.value
  );
}

function clearOldFilters() {
  els.oldSearchInput.value = "";
  els.oldModalityFilter.value = "";
  els.oldTopicFilter.value = "";
  els.oldBodyPartFilter.value = "";
  els.oldTypeFilter.value = "";
  els.oldDateFilter.value = "";
  els.oldInterestingFilter.checked = false;
  updateFilterOptions("old");
  state.selectedOldReport = null;
  loadViewData(loadOldReports(), "Old Reports");
}

function clearTemplateFilters() {
  els.templateSearchInput.value = "";
  els.templateModalityFilter.value = "";
  els.templateTopicFilter.value = "";
  els.templateBodyPartFilter.value = "";
  els.templateTypeFilter.value = "";
  updateFilterOptions("template");
  loadViewData(loadTemplates(), "Templates");
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
  const request = beginDataLoad("oldReports");
  const query = els.oldSearchInput.value.trim();
  setListLoading(els.oldReportList, !state.oldReports.length && !state.oldReportsError);
  try {
    const data = await pbList("old_reports", {
      page: 1,
      perPage: 80,
      sort: "-created",
      filter: oldReportFilter(),
      fields: "id,title,modality,topic,bodyPart,kind,keywords,report,sourceType,sourceDate,note,isInteresting,owner"
    });
    if (!isCurrentDataLoad("oldReports", request)) return false;
    state.oldReports = data.items;
    state.oldReportsError = "";
    renderOldReports(query);
    if (!state.selectedOldReport && data.items.length) selectOldReport(data.items[0].id);
    return true;
  } catch (error) {
    if (!isCurrentDataLoad("oldReports", request)) return false;
    state.oldReportsError = friendlyErrorMessage(error);
    renderOldReports(query);
    throw error;
  } finally {
    clearListLoading(els.oldReportList);
  }
}

function renderOldReports(query = els.oldSearchInput.value.trim()) {
  if (state.oldReportsError) {
    els.oldReportList.innerHTML = `<div class="list-error" role="alert">
      <strong>Old reports unavailable</strong>
      <span>${escapeHtml(state.oldReportsError)} Check the connection and try again.</span>
      <button type="button" data-retry="old-reports">Retry</button>
    </div>`;
    return;
  }
  if (!state.oldReports.length) {
    els.oldReportList.innerHTML = hasOldFilters()
      ? `<div class="empty">No matches for these filters. Try fewer words or clear the filters.
        <br><button type="button" data-clear-filters="old-reports">Clear filters</button></div>`
      : `<div class="empty">Search old reports from the Excel corpus. Saved full reports will appear here too.</div>`;
    return;
  }
  const scrollTop = els.oldReportList.scrollTop;
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
  els.oldReportList.scrollTop = scrollTop;
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
  trackFeature("old_report.use_as_template");
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
  const wasExisting = Boolean(state.templateDraftId);
  if (wasExisting) {
    await pbUpdate("templates", state.templateDraftId, data);
  } else {
    const created = await pbCreate("templates", data);
    state.templateDraftId = created.id;
    updateTemplateModeBadge();
  }
  await loadTemplateFacets();
  await loadTemplates();
  trackFeature(wasExisting ? "template.save.updated" : "template.save.created");
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
  const request = beginDataLoad("templates");
  const query = els.templateSearchInput.value.trim();
  setListLoading(els.templateList, !state.templates.length && !state.templatesError);
  try {
    const data = await pbList("templates", {
      page: 1,
      perPage: 80,
      sort: "-updated",
      filter: templateFilter(),
      fields: "id,title,modality,topic,bodyPart,kind,keywords,report,owner"
    });
    if (!isCurrentDataLoad("templates", request)) return false;
    state.templates = sortTemplatesByCustomOrder(data.items);
    state.templatesError = "";
    renderTemplates(query);
    return true;
  } catch (error) {
    if (!isCurrentDataLoad("templates", request)) return false;
    state.templatesError = friendlyErrorMessage(error);
    renderTemplates(query);
    throw error;
  } finally {
    clearListLoading(els.templateList);
  }
}

function renderTemplates(query = els.templateSearchInput.value.trim()) {
  if (state.templatesError) {
    els.templateList.innerHTML = `<div class="list-error" role="alert">
      <strong>Templates unavailable</strong>
      <span>${escapeHtml(state.templatesError)} Check the connection and try again.</span>
      <button type="button" data-retry="templates">Retry</button>
    </div>`;
    return;
  }
  if (!state.templates.length) {
    els.templateList.innerHTML = hasTemplateFilters()
      ? `<div class="empty">No matches for these filters. Try fewer words or clear the filters.
        <br><button type="button" data-clear-filters="templates">Clear filters</button></div>`
      : `<div class="empty">No personal templates yet. Build one in Template Builder first.</div>`;
    return;
  }
  const scrollTop = els.templateList.scrollTop;
  els.templateList.innerHTML = state.templates.map((item, index) => `
    <button class="result-item" draggable="true" data-template-id="${item.id}" type="button">
      <span class="result-no">${index + 1}.</span>
      <span>
        <span class="result-title">${highlight(item.title || "Untitled", query)}</span>
        <span class="result-meta">${escapeHtml(item.modality || "Modality")} / ${escapeHtml(item.topic || "Topic")} / ${escapeHtml(item.bodyPart || "Body part")} / ${escapeHtml(item.kind || "template")}</span>
      </span>
    </button>
  `).join("");
  els.templateList.scrollTop = scrollTop;
  markSelectedTemplate();
}

// Personal template order, persisted per user in user_settings so a custom
// arrangement survives reloads and devices. Templates missing from the order
// (new ones) keep their server relative order at the end.
function sortTemplatesByCustomOrder(items) {
  if (!state.templateOrder.length) return items;
  const position = new Map(state.templateOrder.map((id, index) => [id, index]));
  return [...items].sort((left, right) => {
    const leftPos = position.get(left.id);
    const rightPos = position.get(right.id);
    if (leftPos === undefined && rightPos === undefined) return 0;
    if (leftPos === undefined) return 1;
    if (rightPos === undefined) return -1;
    return leftPos - rightPos;
  });
}

async function loadTemplateOrder() {
  state.templateOrderSettingsId = "";
  state.templateOrder = [];
  try {
    const filter = `owner="${state.auth?.user?.id || ""}" && key="${TEMPLATE_ORDER_SETTINGS_KEY}"`;
    const data = await pbList("user_settings", { perPage: 1, filter, fields: "id,value" });
    const record = data.items?.[0];
    if (record) {
      state.templateOrderSettingsId = record.id;
      const order = Array.isArray(record.value?.order) ? record.value.order : [];
      state.templateOrder = order.map(String).filter(Boolean);
    }
  } catch (error) {
    console.warn("Template order unavailable; using server order.", error);
  }
  if (state.templates.length) {
    state.templates = sortTemplatesByCustomOrder(state.templates);
    renderTemplates();
  }
}

async function saveTemplateOrder() {
  if (!state.auth?.user?.id) return;
  const value = { version: 1, order: state.templateOrder };
  try {
    if (state.templateOrderSettingsId) {
      await pbUpdate("user_settings", state.templateOrderSettingsId, { value });
    } else {
      const created = await pbCreate("user_settings", {
        owner: state.auth.user.id,
        key: TEMPLATE_ORDER_SETTINGS_KEY,
        value
      });
      state.templateOrderSettingsId = created.id;
    }
  } catch (error) {
    console.warn("Template order could not be saved.", error);
    showToast("Order not saved", "The new arrangement is active for this session only. Check the connection.", "error");
  }
}

// Personal shorthands: short @codes expanding to reusable report sentences,
// persisted per user in user_settings so they sync across devices.
function normalizeShorthands(value) {
  const items = Array.isArray(value?.items) ? value.items : [];
  const seen = new Set();
  return items
    .filter(item => item && typeof item.code === "string" && typeof item.text === "string")
    .map(item => ({ code: item.code.trim().toLowerCase(), text: item.text.trim() }))
    .filter(item => item.code && item.text && !seen.has(item.code) && (seen.add(item.code), true))
    .slice(0, 500);
}

function normalizeShorthandCode(raw) {
  return String(raw || "").trim().toLowerCase().replace(/^@+/, "");
}

async function loadShorthands() {
  state.shorthandSettingsId = "";
  state.shorthands = [];
  try {
    const filter = `owner="${state.auth?.user?.id || ""}" && key="${SHORTHAND_SETTINGS_KEY}"`;
    const data = await pbList("user_settings", { perPage: 1, filter, fields: "id,value" });
    const record = data.items?.[0];
    if (record) {
      state.shorthandSettingsId = record.id;
      state.shorthands = normalizeShorthands(record.value);
    }
  } catch (error) {
    console.warn("Shorthands unavailable; @ expansion disabled for this session.", error);
  }
  state.shorthandLoaded = true;
  renderShorthands();
}

async function persistShorthands() {
  if (!state.auth?.user?.id) return false;
  const value = { version: 1, items: state.shorthands };
  try {
    if (state.shorthandSettingsId) {
      await pbUpdate("user_settings", state.shorthandSettingsId, { value });
    } else {
      const created = await pbCreate("user_settings", {
        owner: state.auth.user.id,
        key: SHORTHAND_SETTINGS_KEY,
        value
      });
      state.shorthandSettingsId = created.id;
    }
    return true;
  } catch (error) {
    console.warn("Shorthands could not be saved.", error);
    showToast("Shorthand not saved", "Check the connection and try again.", "error");
    return false;
  }
}

// Personal shorthands: type @code in a report/template editor to expand a
// reusable sentence. Detection runs on Tiptap updates; the fallback editable
// path has no palette.
let shorthandPalette = null;
let editingShorthandCode = "";

function previewShorthand(text) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat;
}

function matchShorthands(query) {
  const q = String(query || "").toLowerCase();
  const starts = [];
  const contains = [];
  state.shorthands.forEach(item => {
    if (item.code.startsWith(q)) starts.push(item);
    else if (q && item.code.includes(q)) contains.push(item);
  });
  return [...starts, ...contains].slice(0, 8);
}

function closeShorthandPalette() {
  shorthandPalette = null;
  els.shorthandPalette?.classList.add("hidden");
}

function updateShorthandPalette(hostEl) {
  const tiptap = hostEl?.__pawplateEditor;
  if (!tiptap || !state.shorthandLoaded || !state.shorthands.length) {
    closeShorthandPalette();
    return;
  }
  const { empty, $from } = tiptap.state.selection;
  if (!empty || !$from) {
    closeShorthandPalette();
    return;
  }
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\ufffc");
  const match = /@([A-Za-z0-9_-]*)$/.exec(textBefore);
  if (!match) {
    closeShorthandPalette();
    return;
  }
  const hits = matchShorthands(match[1]);
  if (!hits.length) {
    closeShorthandPalette();
    return;
  }
  shorthandPalette = {
    hostEl,
    editor: tiptap,
    from: $from.pos - match[0].length,
    to: $from.pos,
    active: 0,
    hits
  };
  renderShorthandPalette();
}

function renderShorthandPalette() {
  const palette = els.shorthandPalette;
  if (!shorthandPalette) {
    palette.classList.add("hidden");
    return;
  }
  palette.innerHTML = shorthandPalette.hits.map((item, index) => `
    <button class="${index === shorthandPalette.active ? "active" : ""}" role="option"
      aria-selected="${index === shorthandPalette.active}" data-shorthand-index="${index}" type="button">
      <span class="shorthand-palette-code">@${escapeHtml(item.code)}</span>
      <span class="shorthand-palette-preview">${escapeHtml(previewShorthand(item.text))}</span>
    </button>`).join("");
  palette.classList.remove("hidden");
  const coords = shorthandPalette.editor.view.coordsAtPos(shorthandPalette.from);
  const width = Math.min(340, window.innerWidth - 16);
  palette.style.width = `${width}px`;
  let left = Math.max(8, Math.min(coords.left, window.innerWidth - width - 8));
  let top = coords.bottom + 6;
  if (top + palette.offsetHeight > window.innerHeight - 8) {
    top = Math.max(8, coords.top - palette.offsetHeight - 6);
  }
  palette.style.left = `${left}px`;
  palette.style.top = `${top}px`;
  palette.querySelector(".active")?.scrollIntoView({ block: "nearest" });
}

function acceptShorthandPalette() {
  const active = shorthandPalette;
  closeShorthandPalette();
  if (!active) return;
  const item = active.hits[active.active];
  if (!item) return;
  const parts = String(item.text).split(/\n+/).map(part => part.trim()).filter(Boolean);
  const content = parts.length > 1
    ? parts.map(part => ({ type: "paragraph", content: [{ type: "text", text: part }] }))
    : [{ type: "text", text: parts[0] || "" }];
  active.editor.chain().focus().deleteRange({ from: active.from, to: active.to }).insertContent(content).run();
  updateProofing(active.hostEl, { fallback: false });
  if (active.hostEl === els.reportTextEditor) scheduleReportAutosave();
  trackFeature("shorthand.insert");
  showToast("Shorthand inserted", `@${item.code}`);
}

// Capture phase so Enter/Tab/Escape/Arrows reach the palette before Tiptap.
document.addEventListener("keydown", event => {
  if (!shorthandPalette) return;
  if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) return;
  if (!shorthandPalette.hostEl?.contains(document.activeElement)) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.key === "Escape") {
    closeShorthandPalette();
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const count = shorthandPalette.hits.length;
    const step = event.key === "ArrowDown" ? 1 : count - 1;
    shorthandPalette.active = (shorthandPalette.active + step) % count;
    renderShorthandPalette();
    return;
  }
  acceptShorthandPalette();
}, true);

els.shorthandPalette.addEventListener("mousedown", event => {
  const button = event.target.closest("[data-shorthand-index]");
  if (!button || !shorthandPalette) return;
  event.preventDefault();
  shorthandPalette.active = Number(button.dataset.shorthandIndex);
  acceptShorthandPalette();
});

function updateShorthandForm() {
  const editing = Boolean(editingShorthandCode);
  els.saveShorthandBtn.textContent = editing ? "Save changes" : "Add shorthand";
  els.cancelShorthandEditBtn.classList.toggle("hidden", !editing);
}

function renderShorthands() {
  els.shorthandCount.textContent = String(state.shorthands.length);
  if (!state.shorthands.length) {
    els.shorthandList.innerHTML = `<div class="empty">No shorthands yet. Select text in a report, right-click,
      and choose “Save selection as shorthand” — then type @code to expand it.</div>`;
    return;
  }
  const sorted = [...state.shorthands].sort((left, right) => left.code.localeCompare(right.code));
  els.shorthandList.innerHTML = sorted.map(item => `
    <div class="shorthand-row" data-shorthand-code="${escapeHtml(item.code)}">
      <div class="shorthand-row-text">
        <strong>@${escapeHtml(item.code)}</strong>
        <p>${escapeHtml(previewShorthand(item.text))}</p>
      </div>
      <div class="shorthand-row-actions">
        <button type="button" data-shorthand-edit>Edit</button>
        <button type="button" data-shorthand-delete>Delete</button>
      </div>
    </div>`).join("");
}

function setShorthandOpen(open, prefill = null) {
  state.shorthandOpen = Boolean(open);
  els.shorthandPopover.classList.toggle("hidden", !state.shorthandOpen);
  els.shorthandBtn.setAttribute("aria-expanded", String(state.shorthandOpen));
  if (!state.shorthandOpen) return;
  setAlwaysNotesOpen(false);
  renderShorthands();
  if (prefill) {
    editingShorthandCode = "";
    els.shorthandCodeInput.value = prefill.code || "";
    els.shorthandTextInput.value = prefill.text || "";
    updateShorthandForm();
  }
  window.setTimeout(() => els.shorthandCodeInput.focus({ preventScroll: true }), 50);
}

async function saveShorthandForm() {
  const code = normalizeShorthandCode(els.shorthandCodeInput.value);
  const text = els.shorthandTextInput.value.trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(code)) {
    showToast("Invalid code", "Use letters, numbers, - or _ (no spaces).", "error");
    return;
  }
  if (!text) {
    showToast("Empty expansion", "Write the text this code expands to.", "error");
    return;
  }
  const wasEditing = Boolean(editingShorthandCode);
  const clash = state.shorthands.find(item => item.code === code);
  if (clash && clash.code !== editingShorthandCode) {
    showToast("Code already used", "Edit the existing entry below instead.", "error");
    return;
  }
  if (editingShorthandCode && editingShorthandCode !== code) {
    state.shorthands = state.shorthands.filter(item => item.code !== editingShorthandCode);
  }
  if (clash) clash.text = text;
  else state.shorthands.push({ code, text });
  if (!await persistShorthands()) return;
  editingShorthandCode = "";
  els.shorthandCodeInput.value = "";
  els.shorthandTextInput.value = "";
  updateShorthandForm();
  renderShorthands();
  trackFeature("shorthand.save");
  showToast(wasEditing ? "Shorthand updated" : "Shorthand added", `@${code}`);
}

els.shorthandBtn.addEventListener("click", () => {
  setShorthandOpen(!state.shorthandOpen);
  if (state.shorthandOpen) trackFeature("shorthand.open");
});
els.closeShorthandBtn.addEventListener("click", () => setShorthandOpen(false));
els.saveShorthandBtn.addEventListener("click", saveShorthandForm);
els.cancelShorthandEditBtn.addEventListener("click", () => {
  editingShorthandCode = "";
  els.shorthandCodeInput.value = "";
  els.shorthandTextInput.value = "";
  updateShorthandForm();
});
els.shorthandList.addEventListener("click", async event => {
  const row = event.target.closest("[data-shorthand-code]");
  if (!row) return;
  const code = row.dataset.shorthandCode;
  if (event.target.closest("[data-shorthand-delete]")) {
    if (!confirm(`Delete @${code}?`)) return;
    state.shorthands = state.shorthands.filter(item => item.code !== code);
    if (await persistShorthands()) {
      renderShorthands();
      trackFeature("shorthand.delete");
      showToast("Shorthand deleted", `@${code}`);
    }
    return;
  }
  if (event.target.closest("[data-shorthand-edit]")) {
    const item = state.shorthands.find(entry => entry.code === code);
    if (!item) return;
    editingShorthandCode = code;
    els.shorthandCodeInput.value = code;
    els.shorthandTextInput.value = item.text;
    updateShorthandForm();
    els.shorthandCodeInput.focus();
  }
});

// Move a template within the loaded list and merge that move into the stored
// global order, so reordering works the same with or without active filters.
function moveTemplateInList(draggedId, beforeId) {
  const items = state.templates;
  const from = items.findIndex(item => item.id === draggedId);
  if (from < 0 || (beforeId && draggedId === beforeId)) return false;
  const [moved] = items.splice(from, 1);
  const to = beforeId ? items.findIndex(item => item.id === beforeId) : items.length;
  items.splice(to < 0 ? items.length : to, 0, moved);
  const order = state.templateOrder.filter(id => id !== draggedId);
  const orderTo = beforeId ? order.indexOf(beforeId) : order.length;
  order.splice(orderTo < 0 ? order.length : orderTo, 0, draggedId);
  for (const item of items) {
    if (!order.includes(item.id)) order.push(item.id);
  }
  state.templateOrder = order;
  renderTemplates();
  saveTemplateOrder().catch(error => console.warn("Template order could not be saved.", error));
  return true;
}

function markSelectedTemplate() {
  if (!state.selectedTemplate) return;
  els.templateList.querySelectorAll("[data-template-id]").forEach(button => {
    button.classList.toggle("active", button.dataset.templateId === state.selectedTemplate.id);
  });
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

async function useTemplateForReport(template = null) {
  const canReplace = await discardWorkingDraft("Replace the current draft with this template?");
  if (!canReplace) return false;
  const source = template || {
    title: els.templateTitleInput.value,
    modality: els.templateModalityInput.value,
    topic: els.templateTopicInput.value,
    bodyPart: els.templateBodyPartInput.value,
    kind: getTemplateKind(),
    report: getEditorHtml(els.templateTextEditor)
  };
  state.suppressReportAutosave = true;
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
  state.suppressReportAutosave = false;
  scheduleReportAutosave(100);
  showMode("writer");
  renderTemplates();
  trackFeature("template.use");
  return true;
}

function blankReport() {
  state.suppressReportAutosave = true;
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
  state.suppressReportAutosave = false;
  showMode("writer");
  els.reportTitleInput.focus();
}

async function startNewReport() {
  const canReplace = await discardWorkingDraft("Start a new report and discard the current draft?");
  if (!canReplace) return false;
  blankReport();
  trackFeature("report.new");
  return true;
}

async function selectTemplate(id) {
  const template = state.templates.find(item => item.id === id);
  if (!template) return;
  setReferenceDrawer(false);
  await useTemplateForReport(template);
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
      showToast("Action failed", friendlyErrorMessage(error) || "Please try again.", "error");
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
    showToast("Action failed", friendlyErrorMessage(error) || "Please try again.", "error");
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
  await clearWorkingDraft();
  els.oldSearchInput.value = data.title;
  state.selectedOldReport = null;
  await loadOldReports();
  await loadWorkLog();
  trackFeature(wasExisting ? "report.save.updated" : "report.save.created");
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
    reportNoteText(report.id),
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
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

// Normalize free-text modality entries into the five work-log buckets:
// CT, US, CR (plain film / X-ray), MR (MRI), Flu (fluoroscopy). Returns "" when unknown.
function classifyWorklogModality(modality) {
  const raw = String(modality || "").toLowerCase();
  if (!raw.trim()) return "";
  if (/(mri|\bmr\b|magnetic resonance)/.test(raw)) return "MR";
  if (/\bct\b|ct angi|cta\b|mdct|ncct|computed tomo/.test(raw)) return "CT";
  if (/ultrasound|\bus\b|sonogr|\bsono\b/.test(raw)) return "US";
  if (/fluoro|\bflu\b|\brf\b/.test(raw)) return "Flu";
  if (/\bcr\b|\bdx\b|\bdr\b|film|x-?ray|\bxr\b|\bcxr\b|radiograph|plain film/.test(raw)) return "CR";
  return "";
}

function worklogModalityCounts(reports = state.workLogReports) {
  const counts = { CT: 0, US: 0, CR: 0, MR: 0, Flu: 0 };
  for (const report of reports) {
    const bucket = classifyWorklogModality(report.modality);
    if (bucket && counts[bucket] !== undefined) counts[bucket] += 1;
  }
  return counts;
}

async function loadWorkLog() {
  const request = beginDataLoad("workLog");
  await loadReportNotes();
  const data = await pbList("old_reports", {
    page: 1,
    perPage: 500,
    sort: "-created",
    filter: 'sourceType="final-report"',
    fields: "id,title,modality,topic,bodyPart,keywords,report,sourceDate,created,updated,note,isInteresting,owner"
  });
  if (!isCurrentDataLoad("workLog", request)) return false;
  state.workLogReports = data.items;
  if (state.selectedWorklogReport) {
    state.selectedWorklogReport = state.workLogReports.find(item => item.id === state.selectedWorklogReport.id) || null;
  }
  renderWorkLog();
  renderInterestingCases();
  renderWorklogPreview();
  return true;
}

function renderWorkLog() {
  const query = els.worklogSearchInput.value.trim();
  const reports = filteredWorklogReports();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = worklogDateCounts();
  const todayCount = counts.get(dateKey(today)) || 0;
  const interestingCount = state.workLogReports.filter(report => report.isInteresting).length;
  const activeDays = counts.size;
  const modalityCounts = worklogModalityCounts();
  els.worklogSummary.innerHTML = [
    ["Total reports", state.workLogReports.length, `${todayCount} saved today · ${activeDays} active days · ${interestingCount} interesting`],
    ["CT", modalityCounts.CT, "Computed tomography"],
    ["US", modalityCounts.US, "Ultrasound"],
    ["CR", modalityCounts.CR, "Plain film / X-ray"],
    ["MR", modalityCounts.MR, "MRI"],
    ["Flu", modalityCounts.Flu, "Fluoroscopy"]
  ].map(([label, value, title]) => `<div class="summary-card" title="${escapeHtml(title || label)}"><strong>${value}</strong><span>${label}</span></div>`).join("");

  renderWorklogCalendar(counts, today);

  if (!reports.length) {
    els.worklogList.innerHTML = `<div class="empty">${state.worklogSelectedDate ? `No saved reports on ${escapeHtml(state.worklogSelectedDate)}.` : "Saved reports will build your personal work log here."}</div>`;
    return;
  }
  els.worklogList.innerHTML = reports.map((report, index) => {
    const date = savedDate(report);
    const personalNote = reportNoteText(report.id);
    const reportExcerpt = report.report ? snippet(report.report, query) : "";
    return `
      <button class="result-item ${state.selectedWorklogReport?.id === report.id ? "active" : ""}" data-worklog-id="${report.id}" type="button">
        <span class="result-no">${index + 1}.</span>
        <span>
          <span class="result-title">${highlight(report.title || "Untitled", query)}${report.isInteresting ? '<span class="interesting-badge">Interesting</span>' : ""}${personalNote ? '<span class="note-dot" aria-label="Has personal note"></span>' : ""}</span>
          <span class="result-meta">${escapeHtml(date ? dateKey(date) : "No date")} / ${escapeHtml(report.modality || "Modality")} / ${escapeHtml(report.topic || "Topic")} / ${escapeHtml(report.bodyPart || "Body part")}</span>
          ${report.keywords ? `<span class="result-snippet"><strong>Keywords:</strong> ${highlight(report.keywords, query)}</span>` : ""}
          ${report.note ? `<span class="result-snippet">${highlight(report.note, query)}</span>` : ""}
          ${reportExcerpt ? `<span class="result-snippet result-report-snippet">${highlight(reportExcerpt, query)}</span>` : ""}
          ${personalNote ? `<span class="report-note-snippet">${highlight(snippet(personalNote, query), query)}</span>` : ""}
        </span>
      </button>
    `;
  }).join("");
}

function selectWorklogReport(id) {
  const report = state.workLogReports.find(item => item.id === id);
  if (!report) return;
  if (state.selectedWorklogReport?.id !== id) setReportNotePopoverOpen(false);
  state.selectedWorklogReport = report;
  renderWorkLog();
  renderInterestingCases();
  renderWorklogPreview();
}

function closeWorklogPreview() {
  setReportNotePopoverOpen(false);
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
    els.worklogPreviewText.textContent = "Select a report to preview it here.";
    els.editWorklogReportBtn.disabled = true;
    els.quickReportNoteBtn.disabled = true;
    updateReportNoteButton();
    return;
  }
  const date = savedDate(report);
  els.worklogPreviewTitle.textContent = report.title || "Untitled";
  els.worklogPreviewMeta.innerHTML = [
    date ? dateKey(date) : "",
    report.modality,
    report.topic,
    report.bodyPart,
    report.note
  ].filter(Boolean).map(escapeHtml).join(" / ");
  els.worklogPreviewText.innerHTML = reportHtml(report.report);
  els.editWorklogReportBtn.disabled = false;
  els.quickReportNoteBtn.disabled = false;
  updateReportNoteButton();
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
    const count = counts.get(key) || 0;
    const level = count >= 4 ? 4 : count;
    const classes = [
      "calendar-day",
      `level-${level}`,
      key === dateKey(today) ? "today" : "",
      key === state.worklogSelectedDate ? "selected" : ""
    ].filter(Boolean).join(" ");
    cells.push(`
      <button class="${classes}" type="button" data-worklog-date="${key}" title="${key}: ${count} report${count === 1 ? "" : "s"}">
        <span class="calendar-number">${day}</span>
        ${count ? `<span class="calendar-count" title="Reports">${count}</span>` : ""}
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
  els.interestingList.innerHTML = reports.map((report, index) => {
    const personalNote = reportNoteText(report.id);
    const reportExcerpt = report.report ? snippet(report.report, query) : "";
    return `
      <button class="result-item ${state.selectedWorklogReport?.id === report.id ? "active" : ""}" data-interesting-id="${report.id}" type="button">
        <span class="result-no">${index + 1}.</span>
        <span>
          <span class="result-title">${highlight(report.title || "Untitled", query)}${personalNote ? '<span class="note-dot" aria-label="Has personal note"></span>' : ""}</span>
          <span class="result-meta">${escapeHtml(report.modality || "Modality")} / ${escapeHtml(report.topic || "Topic")} / ${escapeHtml(report.bodyPart || "Body part")}</span>
          ${report.keywords ? `<span class="result-snippet"><strong>Keywords:</strong> ${highlight(report.keywords, query)}</span>` : ""}
          ${report.note ? `<span class="result-snippet">${highlight(report.note, query)}</span>` : ""}
          ${reportExcerpt ? `<span class="result-snippet result-report-snippet">${highlight(reportExcerpt, query)}</span>` : ""}
          ${personalNote ? `<span class="report-note-snippet">${highlight(snippet(personalNote, query), query)}</span>` : ""}
        </span>
      </button>
    `;
  }).join("");
}

async function openSavedReport(id) {
  const report = state.workLogReports.find(item => item.id === id) || state.selectedWorklogReport;
  if (!report) return;
  const canReplace = await discardWorkingDraft("Open this saved report and discard the current draft?");
  if (!canReplace) return false;
  state.suppressReportAutosave = true;
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
  state.suppressReportAutosave = false;
  scheduleReportAutosave(100);
  showMode("writer");
  return true;
}

const refreshReportNoteLists = debounce(() => {
  renderWorkLog();
  renderInterestingCases();
}, 180);

function handleModeLink(event, mode) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showMode(mode);
  trackFeature({
    builder: "navigation.template_builder",
    writer: "navigation.report_writer",
    worklog: "navigation.work_log",
    interesting: "navigation.interesting_cases"
  }[mode]);
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
    if (button.dataset.command === "clearHighlight") chain.unsetHighlight().run();
    updateProofing(editor, { fallback: false });
    return;
  }
  editor.focus();
  if (button.dataset.command === "clearHighlight") {
    document.execCommand("backColor", false, "transparent");
    return;
  }
  document.execCommand(button.dataset.command, false, button.dataset.value || null);
}

els.builderModeBtn.addEventListener("click", event => handleModeLink(event, "builder"));
els.writerModeBtn.addEventListener("click", event => handleModeLink(event, "writer"));
els.worklogModeBtn.addEventListener("click", event => handleModeLink(event, "worklog"));
els.interestingModeBtn.addEventListener("click", event => handleModeLink(event, "interesting"));
document.querySelectorAll("[data-reference-tab]").forEach(button => {
  button.addEventListener("click", () => {
    const tab = button.dataset.referenceTab;
    showReferenceTab(tab);
    trackFeature({ templates: "reference.templates", snippets: "reference.snippets", "ai-draft": "reference.ai_assist" }[tab]);
  });
});
els.referenceDrawerBtn?.addEventListener("click", () => {
  setReferenceDrawer(!state.referenceDrawerOpen);
  if (state.referenceDrawerOpen) showReferenceTab(state.referenceTab, { updateRoute: false });
});
els.drawerBackdrop?.addEventListener("click", () => setReferenceDrawer(false));
els.generateAiDraftBtn?.addEventListener("click", () => {
  withButtonFeedback(els.generateAiDraftBtn, "Drafting...", generateAiDraft, "Draft ready");
});
els.aiSettingsToggleBtn?.addEventListener("click", toggleAiSettings);
els.resetAiSettingsBtn?.addEventListener("click", () => {
  setAiSettingsForm();
  showToast("Default restored", "Save settings to use it for future drafts.", "info");
});
els.saveAiSettingsBtn?.addEventListener("click", () => {
  withButtonFeedback(els.saveAiSettingsBtn, "Saving...", saveAiSettings, "Saved");
});
els.aiDraftResult?.addEventListener("click", event => {
  const accept = event.target.closest("[data-ai-accept]");
  const reject = event.target.closest("[data-ai-reject]");
  const key = accept?.dataset.aiAccept || reject?.dataset.aiReject;
  if (!key || !state.aiDraft) return;
  if (accept) applyAiDraftSuggestion(key);
  if (reject) {
    state.aiDraft.rejected = [...new Set([...(state.aiDraft.rejected || []), key])];
    renderAiDraft();
  }
});
els.templateModalityRadios?.addEventListener("click", event => {
  const button = event.target.closest("[data-choice-value]");
  if (!button) return;
  els.templateModalityFilter.value = button.dataset.choiceValue;
  updateFilterOptions("template", "modality");
  loadViewData(loadTemplates(), "Templates");
});
els.templateTypeRadios?.addEventListener("click", event => {
  const button = event.target.closest("[data-choice-value]");
  if (!button) return;
  els.templateTypeFilter.value = button.dataset.choiceValue;
  renderChoiceChips(els.templateTypeRadios, TEMPLATE_TYPE_FILTERS, els.templateTypeFilter.value, "template-type");
  loadViewData(loadTemplates(), "Templates");
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
  let value = field.value;
  // Autofill "o'clock": typing "10" becomes "10 o'clock" on blur/enter.
  if (field.dataset.snippetField === "clock") {
    const formatted = formatClockFace(value);
    if (formatted && formatted !== value) {
      value = formatted;
      field.value = formatted;
    }
  }
  state.snippet.values[field.dataset.snippetField] = value;
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
  trackFeature(`snippet.add_finding.${state.snippet.system}`);
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
  if (!snippet) return;
  insertReportText(snippet);
  setReferenceDrawer(false);
  trackFeature(`snippet.insert.${state.snippet.system}`);
  showToast("Snippet inserted", snippet);
});
els.copySnippetBtn?.addEventListener("click", () => {
  withButtonFeedback(els.copySnippetBtn, "Copying...", async () => {
    const snippet = combinedSnippetText();
    if (!snippet) return false;
    await copyText(snippet);
    trackFeature(`snippet.copy.${state.snippet.system}`);
    showToast("Snippet copied", snippet);
    return true;
  }, "Copied");
});
els.resetSnippetBtn?.addEventListener("click", () => {
  state.snippet = structuredClone(SNIPPET_DEFAULTS);
  state.snippetItems = [];
  renderSnippetGenerator();
});
els.oldSearchInput.addEventListener("input", debounce(() => {
  state.selectedOldReport = null;
  loadViewData(loadOldReports(), "Old Reports");
}));
els.oldReportList.addEventListener("click", event => {
  if (event.target.closest('[data-retry="old-reports"]')) {
    loadViewData(loadOldReports(), "Old Reports");
    return;
  }
  if (event.target.closest('[data-clear-filters="old-reports"]')) {
    clearOldFilters();
    return;
  }
  const button = event.target.closest("[data-old-id]");
  if (button) {
    selectOldReport(button.dataset.oldId);
    trackFeature("old_report.preview");
  }
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
        await openSavedReport(id);
      }});
    }
    actions.push({ label: report.isInteresting ? "Remove interesting" : "Save as interesting", run: async () => {
      await pbUpdate("old_reports", id, { isInteresting: !report.isInteresting });
      await loadOldReports();
      await loadWorkLog();
      trackFeature("interesting.toggle");
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
els.newTemplateBtn.addEventListener("click", () => {
  blankTemplate();
  trackFeature("template.new");
});
els.saveTemplateBtn.addEventListener("click", () => {
  withButtonFeedback(els.saveTemplateBtn, "Saving...", saveTemplate, "Saved");
});
els.useTemplateBtn.addEventListener("click", () => useTemplateForReport());
els.templateSearchInput.addEventListener("input", debounce(() => loadViewData(loadTemplates(), "Templates")));
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
  loadViewData(loadOldReports(), "Old Reports");
})));
[
  els.templateModalityFilter,
  els.templateTopicFilter,
  els.templateBodyPartFilter,
  els.templateTypeFilter
].forEach(element => element.addEventListener("input", debounce(() => {
  if (element === els.templateModalityFilter) updateFilterOptions("template", "modality");
  if (element === els.templateTopicFilter) updateFilterOptions("template", "topic");
  loadViewData(loadTemplates(), "Templates");
})));
[
  els.templateModalityInput,
  els.templateTopicInput
].forEach(element => element.addEventListener("input", () => updateEditorDatalists("template")));
[
  els.reportModalityInput,
  els.reportTopicInput
].forEach(element => element.addEventListener("input", () => updateEditorDatalists("report")));
[
  els.reportTitleInput,
  els.reportModalityInput,
  els.reportTopicInput,
  els.reportBodyPartInput,
  els.reportKeywordInput,
  els.reportNoteInput
].forEach(element => element.addEventListener("input", scheduleReportAutosave));
els.reportInterestingInput.addEventListener("change", () => {
  scheduleReportAutosave();
  trackFeature("report.interesting_toggle");
});
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

// Thai year converter (พ.ศ. ⇄ ค.ศ., offset 543) next to the highlight colors.
// Typing in either box converts into the other; focusing a box selects its
// value for quick copying into the report.
function syncYearConverter(source) {
  const beField = els.yearBeInput;
  const adField = els.yearAdInput;
  if (!beField || !adField || (source !== beField && source !== adField)) return;
  const target = source === beField ? adField : beField;
  const raw = source.value.trim();
  if (!raw) {
    target.value = "";
    return;
  }
  if (!/^\d{1,4}$/.test(raw)) return;
  const year = Number(raw);
  target.value = String(source === beField ? year - 543 : year + 543);
}

["yearBeInput", "yearAdInput"].forEach(key => {
  const field = els[key];
  if (!field) return;
  field.addEventListener("input", () => syncYearConverter(field));
  field.addEventListener("focus", () => field.select());
});
[els.templateTextEditor, els.reportTextEditor].forEach(editor => {
  editor.addEventListener("focus", () => clearProofingFallback(editor));
  editor.addEventListener("input", debounce(() => {
    updateProofing(editor, { fallback: false });
    if (editor === els.reportTextEditor) scheduleReportAutosave();
  }, 120));
  editor.addEventListener("blur", () => updateProofing(editor));
  // Native select-all + copy collapses blank lines; serve our own
  // plain-text serialization that keeps empty paragraphs.
  editor.addEventListener("copy", handleEditorCopy);
  editor.addEventListener("contextmenu", event => {
    const actions = [];
    const selected = editorSelectionText(editor);
    if (selected && selected.trim()) {
      const clipped = selected.trim().slice(0, 2000);
      actions.push({ label: "Save selection as shorthand", run: () => setShorthandOpen(true, { code: "", text: clipped }) });
    }
    const hit = wordAtPoint(editor, event.clientX, event.clientY);
    if (hit && isSuspiciousWord(hit.word) && !isPersonalDictionaryWord(hit.word)) {
      actions.push({ label: `Add "${hit.word}" to dictionary`, run: () => addPersonalDictionaryWord(hit.word, editor) });
    }
    if (!actions.length) return;
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY, actions);
  });
});
els.templateList.addEventListener("click", event => {
  if (event.target.closest('[data-retry="templates"]')) {
    loadViewData(loadTemplates(), "Templates");
    return;
  }
  if (event.target.closest('[data-clear-filters="templates"]')) {
    clearTemplateFilters();
    return;
  }
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
      state.templateOrder = state.templateOrder.filter(orderId => orderId !== id);
      saveTemplateOrder().catch(error => console.warn("Template order could not be saved.", error));
      await loadTemplateFacets();
      await loadTemplates();
      showToast("Template deleted");
    }}
  ]);
});

// Drag-and-drop reorder of the template list. Browsers fire a click on the
// drag source right after a drop, so swallow that one click to avoid
// accidentally loading the moved template into the report.
let draggedTemplateId = "";
let suppressTemplateClick = false;

function clearTemplateDropIndicators() {
  els.templateList.querySelectorAll(".drop-before, .drop-after").forEach(node => node.classList.remove("drop-before", "drop-after"));
}

function templateDropTarget(event) {
  const button = event.target?.closest?.("[data-template-id]");
  if (!button || button.dataset.templateId === draggedTemplateId) return null;
  const rect = button.getBoundingClientRect();
  return {
    id: button.dataset.templateId,
    before: (event.clientY - rect.top) < rect.height / 2
  };
}

function templateIdAfter(id) {
  const buttons = [...els.templateList.querySelectorAll("[data-template-id]")];
  const at = buttons.findIndex(node => node.dataset.templateId === id);
  return at >= 0 && at + 1 < buttons.length ? buttons[at + 1].dataset.templateId : null;
}

els.templateList.addEventListener("dragstart", event => {
  const button = event.target?.closest?.("[data-template-id]");
  if (!button) return;
  draggedTemplateId = button.dataset.templateId;
  suppressTemplateClick = true;
  event.dataTransfer.effectAllowed = "move";
  try {
    event.dataTransfer.setData("text/plain", draggedTemplateId);
  } catch {
    // Firefox requires setData above; other browsers may restrict it.
  }
  button.classList.add("dragging");
});
els.templateList.addEventListener("dragover", event => {
  if (!draggedTemplateId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  clearTemplateDropIndicators();
  const target = templateDropTarget(event);
  if (target) {
    els.templateList.querySelector(`[data-template-id="${target.id}"]`)?.classList.add(target.before ? "drop-before" : "drop-after");
  }
});
els.templateList.addEventListener("dragleave", event => {
  if (!els.templateList.contains(event.relatedTarget)) clearTemplateDropIndicators();
});
els.templateList.addEventListener("drop", event => {
  if (!draggedTemplateId) return;
  event.preventDefault();
  const target = templateDropTarget(event);
  clearTemplateDropIndicators();
  if (target) {
    moveTemplateInList(draggedTemplateId, target.before ? target.id : templateIdAfter(target.id));
  } else if (event.target?.closest?.("#templateList")) {
    moveTemplateInList(draggedTemplateId, null);
  }
  draggedTemplateId = "";
});
els.templateList.addEventListener("dragend", () => {
  draggedTemplateId = "";
  clearTemplateDropIndicators();
  els.templateList.querySelectorAll(".dragging").forEach(node => node.classList.remove("dragging"));
  // A cancelled drag (Esc) fires no click; never swallow a later real click.
  window.setTimeout(() => { suppressTemplateClick = false; }, 0);
});
document.addEventListener("click", event => {
  if (!suppressTemplateClick || !els.templateList.contains(event.target)) return;
  suppressTemplateClick = false;
  event.preventDefault();
  event.stopPropagation();
}, true);
els.contextMenu?.addEventListener("click", event => event.stopPropagation());
document.addEventListener("click", hideContextMenu);
els.alwaysNotesBtn.addEventListener("click", () => setAlwaysNotesOpen(!state.alwaysNotesOpen));
els.closeAlwaysNotesBtn.addEventListener("click", () => setAlwaysNotesOpen(false));
els.newPersonalNoteBtn.addEventListener("click", () => createPersonalNote());
els.newPersonalImageBtn.addEventListener("click", () => openPawletImagePicker());
els.personalNoteImageInput.addEventListener("change", async () => {
  const targetNoteId = state.personalNoteImageTargetId;
  state.personalNoteImageTargetId = "";
  await uploadPawletImages(els.personalNoteImageInput.files, { targetNoteId });
  els.personalNoteImageInput.value = "";
});
els.personalNotesBoard.addEventListener("input", event => {
  const titleInput = event.target.closest("[data-note-title]");
  const bodyInput = event.target.closest("[data-note-body]");
  const card = event.target.closest("[data-personal-note-id]");
  if ((!titleInput && !bodyInput) || !card) return;
  const note = state.personalNotes.notes.find(item => item.id === card.dataset.personalNoteId);
  if (!note) return;
  if (titleInput) note.title = titleInput.value.replace(/\s+/g, " ").slice(0, 120);
  if (bodyInput) note.text = bodyInput.value.replace(/\r/g, "").slice(0, 10000);
  note.updatedAt = new Date().toISOString();
  state.personalNotesDirty = true;
  state.personalNotesEditPending = true;
  schedulePersonalNotesSave();
});
els.personalNotesBoard.addEventListener("focusout", event => {
  const titleInput = event.target.closest("[data-note-title]");
  if (!titleInput || titleInput.value.trim()) return;
  titleInput.value = "Untitled note";
  titleInput.dispatchEvent(new Event("input", { bubbles: true }));
});
els.personalNotesBoard.addEventListener("focusin", event => {
  const card = event.target.closest("[data-personal-note-id]");
  if (!card || !event.target.closest("[data-note-title], [data-note-body]")) return;
  state.personalNotePasteTargetId = card.dataset.personalNoteId;
});
els.personalNotesBoard.addEventListener("click", event => {
  const addImageButton = event.target.closest("[data-note-add-image]");
  const removeImageButton = event.target.closest("[data-note-image-remove]");
  const collapseButton = event.target.closest("[data-note-collapse]");
  const card = event.target.closest("[data-personal-note-id]");
  if (!card) return;
  if (addImageButton) {
    openPawletImagePicker(card.dataset.personalNoteId);
    return;
  }
  if (removeImageButton) {
    removePersonalNoteImage(card.dataset.personalNoteId, removeImageButton.dataset.noteImageRemove);
    return;
  }
  if (collapseButton) togglePersonalNoteCollapsed(card.dataset.personalNoteId, card, collapseButton);
});
els.personalNotesBoard.addEventListener("dblclick", event => {
  const image = event.target.closest(".personal-note-image img");
  if (!image) return;
  event.preventDefault();
  event.stopPropagation();
  openPawletImageLightbox(image);
});
els.closePawletImageLightboxBtn.addEventListener("click", closePawletImageLightbox);
els.pawletImageLightbox.addEventListener("click", event => {
  if (event.target === els.pawletImageLightbox || event.target.classList?.contains("pawlet-image-lightbox-stage")) {
    closePawletImageLightbox();
  }
});
els.pawletImageLightbox.addEventListener("close", () => {
  els.pawletImageLightboxImage.removeAttribute("src");
  els.pawletImageLightboxImage.alt = "";
  els.pawletImageLightboxCaption.textContent = "";
});
els.alwaysNotesPopover.addEventListener("paste", event => {
  const files = pawletImageFiles(event.clipboardData?.files);
  if (!files.length) return;
  event.preventDefault();
  uploadPawletImages(files, { targetNoteId: state.personalNotePasteTargetId });
});
els.personalNotesBoard.addEventListener("dragover", event => {
  if (!event.dataTransfer?.types?.includes("Files")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  els.personalNotesBoard.classList.add("is-image-dragover");
});
els.personalNotesBoard.addEventListener("dragleave", event => {
  if (!els.personalNotesBoard.contains(event.relatedTarget)) els.personalNotesBoard.classList.remove("is-image-dragover");
});
els.personalNotesBoard.addEventListener("drop", event => {
  const files = pawletImageFiles(event.dataTransfer?.files);
  els.personalNotesBoard.classList.remove("is-image-dragover");
  if (!files.length) return;
  event.preventDefault();
  const card = event.target.closest("[data-personal-note-id]");
  uploadPawletImages(files, {
    targetNoteId: card?.dataset.personalNoteId || "",
    position: card ? null : pawletBoardPosition(event)
  });
});
els.personalNotesBoard.addEventListener("error", event => {
  const image = event.target.closest?.("[data-note-image-record]");
  if (!image || image.dataset.tokenRetry) return;
  image.dataset.tokenRetry = "true";
  state.guidelineFileTokenExpiresAt = 0;
  ensureGuidelineFileToken()
    .then(() => {
      image.src = personalNoteImageUrl({
        recordId: image.dataset.noteImageRecord,
        filename: image.dataset.noteImageFile,
        alt: image.alt
      });
    })
    .catch(error => console.warn("Pawlet image could not be reloaded.", error));
}, true);
els.personalNotesBoard.addEventListener("pointerdown", event => {
  const card = event.target.closest("[data-personal-note-id]");
  if (!card) {
    state.personalNotePasteTargetId = "";
    els.personalNotesBoard.focus({ preventScroll: true });
    return;
  }
  state.personalNotePasteTargetId = event.target.closest("[data-note-title], [data-note-body], .personal-note-content, .personal-note-image-body")
    ? card.dataset.personalNoteId
    : "";
  const imageResizeHandle = event.target.closest("[data-note-image-resize]");
  if (imageResizeHandle) {
    startPersonalNoteImageResize(event, card, imageResizeHandle);
    return;
  }
  if (event.target.closest("[data-note-resize]")) {
    startPersonalNoteResize(event, card);
    return;
  }
  bringPersonalNoteToFront(card.dataset.personalNoteId, card);
  startPersonalNoteDrag(event, card);
});
els.personalNotesBoard.addEventListener("contextmenu", event => {
  const card = event.target.closest("[data-personal-note-id]");
  if (!card) return;
  event.preventDefault();
  showContextMenu(event.clientX, event.clientY, [
    { label: "Delete note", danger: true, run: () => deletePersonalNote(card.dataset.personalNoteId) }
  ]);
});
els.quickReportNoteBtn.addEventListener("click", () => setReportNotePopoverOpen(!state.reportNotePopoverOpen));
els.closeReportNoteBtn.addEventListener("click", () => setReportNotePopoverOpen(false));
els.reportPersonalNoteInput.addEventListener("input", () => {
  const reportId = state.selectedWorklogReport?.id;
  if (!reportId) return;
  setReportNote(reportId, els.reportPersonalNoteInput.value);
  refreshReportNoteLists();
});
document.addEventListener("pointerdown", event => {
  if (els.pawletImageLightbox.open && els.pawletImageLightbox.contains(event.target)) return;
  if (state.alwaysNotesOpen && !els.alwaysNotesShell.contains(event.target) && !els.contextMenu.contains(event.target)) setAlwaysNotesOpen(false);
  if (state.shorthandOpen && !els.shorthandShell.contains(event.target) && !els.contextMenu.contains(event.target)) setShorthandOpen(false);
  if (state.reportNotePopoverOpen && !els.reportNotePopover.contains(event.target) && !els.quickReportNoteBtn.contains(event.target)) {
    setReportNotePopoverOpen(false);
  }
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (els.pawletImageLightbox.open) {
    event.preventDefault();
    closePawletImageLightbox();
    return;
  }
  if (state.referenceDrawerOpen) {
    setReferenceDrawer(false);
    return;
  }
  if (state.reportNotePopoverOpen) setReportNotePopoverOpen(false);
  if (state.shorthandOpen) {
    setShorthandOpen(false);
    return;
  }
  if (state.alwaysNotesOpen) setAlwaysNotesOpen(false);
});
els.newReportBtn.addEventListener("click", () => startNewReport());
els.copyReportBtn.addEventListener("click", () => {
  withButtonFeedback(els.copyReportBtn, "Copying...", async () => {
    await copyText(getEditorText(els.reportTextEditor));
    trackFeature("report.copy");
    showToast("Copied", "Plain text is ready to paste.");
  }, "Copied");
});
els.saveReportBtn.addEventListener("click", () => {
  withButtonFeedback(els.saveReportBtn, "Saving...", saveFullReport, "Saved");
});
els.worklogSearchInput.addEventListener("input", debounce(renderWorkLog));
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
  trackFeature("work_log.calendar_filter");
  renderWorkLog();
});
els.worklogList.addEventListener("click", event => {
  const button = event.target.closest("[data-worklog-id]");
  if (button) {
    selectWorklogReport(button.dataset.worklogId);
    trackFeature("work_log.preview");
  }
});
els.interestingList.addEventListener("click", event => {
  const button = event.target.closest("[data-interesting-id]");
  if (button) {
    selectWorklogReport(button.dataset.interestingId);
    trackFeature("interesting.preview");
  }
});
els.editWorklogReportBtn.addEventListener("click", () => {
  if (state.selectedWorklogReport) {
    openSavedReport(state.selectedWorklogReport.id);
    trackFeature(state.mode === "interesting" ? "interesting.edit_report" : "work_log.edit_report");
  }
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
    { label: reportNoteText(id) ? "Edit personal note" : "Add personal note", run: () => openReportNote(id) },
    { label: "Change report date", run: () => editWorklogDate(id) },
    { label: report?.isInteresting ? "Remove interesting" : "Save as interesting", run: async () => {
      await pbUpdate("old_reports", id, { isInteresting: !report?.isInteresting });
      await loadWorkLog();
      await loadOldReports();
      trackFeature("interesting.toggle");
      showToast(report?.isInteresting ? "Removed from interesting" : "Saved as interesting", report?.title || "Saved report");
    }},
    { label: "Delete saved report", danger: true, run: async () => {
      if (!confirm("Delete this saved report?")) return;
      await pbDelete("old_reports", id);
      if (state.reportDraftId === id) {
        resetReportDraft();
      }
       if (state.selectedWorklogReport?.id === id) state.selectedWorklogReport = null;
       removeReportNote(id);
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
    { label: reportNoteText(id) ? "Edit personal note" : "Add personal note", run: () => openReportNote(id) },
    { label: "Change report date", run: () => editWorklogDate(id) },
    { label: "Remove interesting", run: async () => {
      await pbUpdate("old_reports", id, { isInteresting: false });
      await loadWorkLog();
      await loadOldReports();
      trackFeature("interesting.toggle");
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
els.logoutBtn.addEventListener("click", async () => {
  try {
    await Promise.all([saveFeatureUsage(), saveReportNotes(), savePersonalNotes()]);
  } catch (error) {
    console.warn("Personal settings could not be flushed before sign out.", error);
  }
  logout();
});
els.continueRecoveredDraftBtn.addEventListener("click", continueRecoveredDraft);
els.discardRecoveredDraftBtn.addEventListener("click", () => {
  withButtonFeedback(els.discardRecoveredDraftBtn, "Discarding...", discardRecoveredDraft, "Discarded");
});
els.draftRecoveryDialog.addEventListener("cancel", event => event.preventDefault());
window.addEventListener("popstate", () => syncRouteFromLocation({ replace: false }));
window.addEventListener("hashchange", () => syncRouteFromLocation({ replace: false }));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (state.reportAutosaveDirty) saveWorkingDraft();
    saveFeatureUsage().catch(error => console.warn("Feature usage could not be flushed.", error));
    saveReportNotes().catch(error => console.warn("Report notes could not be flushed.", error));
    savePersonalNotes().catch(error => console.warn("Personal notes could not be flushed.", error));
    return;
  }
  if (!state.auth?.token) return;
  // Coming back with no connection: skip quietly instead of flashing errors.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  refreshAuthSession()
    .then(reloadActiveView)
    .catch(error => {
      if (error instanceof AuthSessionError) return;
      // Transient blip: silent, the next request retries on its own.
      if (error instanceof NetworkError) return;
      showToast("Connection problem", error.message || "PawPlate could not refresh your session.", "error");
    });
});
window.addEventListener("offline", () => {
  if (!state.auth?.token) return;
  showToast("You're offline", "Work keeps saving locally and syncs when you reconnect.", "info");
});
window.addEventListener("online", () => {
  if (!state.auth?.token) return;
  // Flush any draft that couldn't sync while offline, then reload the view.
  if (state.reportAutosaveDirty) scheduleReportAutosave(100);
  loadViewData(refreshAuthSession().then(reloadActiveView), "Workspace");
});

async function loadApp() {
  document.body.removeAttribute("data-theme");
  applyPalette();
  syncRouteFromLocation({ force: true, loadData: false });
  await loadWorkingDraft();
  await initTiptapEditors();
  await loadPersonalDictionary();
  await loadAiSettings();
  await Promise.all([loadReportNotes(), loadPersonalNotes(), loadTemplateOrder(), loadShorthands()]);
  loadFeatureUsage().catch(error => console.warn("Feature usage could not be loaded.", error));
  loadSpellchecker();
  updateTemplateModeBadge();
  updateReportModeBadge();
  showReferenceTab(state.referenceTab, { updateRoute: false });
  blankTemplate();
  await loadInitialWorkspaceData();
}

async function init() {
  const auth = readAuth();
  setAuth(auth);
  if (!auth?.token) {
    els.loginEmailInput.focus();
    return;
  }
  try {
    await refreshAuthSession({ force: true });
    await loadApp();
  } catch (error) {
    if (error instanceof AuthSessionError) return;
    showToast("Workspace unavailable", "PawPlate could not reach the server. Try refreshing in a moment.", "error");
    console.error(error);
  }
}

init();
