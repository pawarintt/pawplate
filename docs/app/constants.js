const CONFIG = window.PAWPLATE_CONFIG || {};

export const POCKETBASE_URL = CONFIG.pocketbaseUrl || window.location.origin;
export const API = `${POCKETBASE_URL.replace(/\/$/, "")}/api/collections`;
export const AUTH_KEY = "pawplate.auth";
export const PALETTE_KEY_PREFIX = "pawplate.palette.";
export const PERSONAL_DICTIONARY_KEY_PREFIX = "pawplate.dictionary.";
export const REPORT_DRAFT_KEY_PREFIX = "pawplate.report-draft.";
export const AUTH_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
export const AUTH_REFRESH_LEEWAY_MS = 60 * 60 * 1000;

export const MODE_ROUTES = {
  builder: "template-builder",
  writer: "report-writer",
  worklog: "work-log",
  interesting: "interesting-cases",
  insights: "insights"
};
export const ROUTE_MODES = Object.fromEntries(Object.entries(MODE_ROUTES).map(([mode, route]) => [route, mode]));
export const REFERENCE_ROUTES = {
  templates: "templates",
  snippets: "snippets",
  "ai-draft": "ai-draft"
};
export const ROUTE_REFERENCES = Object.fromEntries(Object.entries(REFERENCE_ROUTES).map(([tab, route]) => [route, tab]));

export class AuthSessionError extends Error {
  constructor(message = "Your session expired. Sign in again; your draft is safe.") {
    super(message);
    this.name = "AuthSessionError";
  }
}

export const SPELLCHECK_DICTIONARY_URL = "https://cdn.jsdelivr.net/npm/typo-js@1.3.2/dictionaries/en_US";
export const TIPTAP_VERSION = "2.11.7";
export const TIPTAP_CDN = "https://esm.sh";
export const DEFAULT_AI_PROMPT = `Create a concise, prioritized impression that synthesizes the report into clinically meaningful diagnoses rather than repeating findings.

Before writing, silently identify the principal disease, interval change, clinically material complications or staging features, the answer to the clinical question, and important secondary diagnoses.

- Use a plain numbered list without an IMPRESSION heading.
- Lead with the principal abnormality, meaningful interval change, and key complications.
- Fold a complication into the principal disease item when it can be stated concisely. Do not create a separate item merely for nonvisualization, patency, or suspected involvement of a vessel or adjacent structure.
- State the clinical implication instead of repeating its supporting finding.
- Merge related findings into a conventional disease-level interpretation only when directly supported.
- Group secondary findings only when they represent the same disease process. Do not combine unrelated findings merely to shorten the list.
- Recognize supported conventional constellations, such as cirrhosis with splenomegaly and ascites indicating portal hypertension.
- For malignancy, combine the primary tumor, treatment response or progression, local invasion, and tumor thrombus or vascular invasion in the first item.
- Keep the direct answer to the clinical question in its own item when clinically important.
- Keep suspicious or indeterminate nodal or distant metastatic disease separate from unrelated background disease.
- Include pertinent negatives only when they directly answer the clinical question.
- Do not expand a negative statement into additional specific negatives unless each is documented.
- Omit patent or normal structures, supporting anatomy, and minor incidental findings unless they change diagnosis, staging, management, or prognosis.
- Never omit a clinically important complication solely because it is uncertain; retain it concisely with an uncertainty qualifier.
- Preserve measurements only when they communicate meaningful size or interval change.
- Preserve uncertainty and negation. Do not upgrade possible or indeterminate findings into definite disease.
- Do not add follow-up recommendations unless the report explicitly recommends them.
- Keep each numbered item focused on one clinical problem. Do not append an unrelated second sentence merely to reduce the item count.`;

export const DEFAULT_PALETTE = {
  text: ["#2b2526", "#8f4d57", "#7f5f3b", "#52654d"],
  highlight: ["#fff0a8", "#ffd4dc", "#dcefc8", "#efe2c3", "#d9edf0"]
};

export const TEMPLATE_TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "normal", label: "Normal" },
  { value: "disease", label: "Disease" }
];
export const INSIGHT_SETTINGS_KEY = "templateInsights";
export const FEATURE_USAGE_SETTINGS_KEY = "featureUsageV1";
export const REPORT_NOTES_SETTINGS_KEY = "reportNotesV1";
export const PERSONAL_NOTES_SETTINGS_KEY = "personalNotesV1";
export const FEATURE_USAGE_DAYS = 90;
export const REPORT_NOTES_LIMIT = 2000;
export const PERSONAL_NOTES_LIMIT = 100;
export const PERSONAL_NOTE_BOARD_WIDTH = 1800;
export const PERSONAL_NOTE_BOARD_HEIGHT = 1200;
export const PERSONAL_NOTE_CARD_WIDTH = 240;
export const PERSONAL_NOTE_CARD_HEIGHT = 190;
export const PERSONAL_NOTE_CARD_MIN_WIDTH = 180;
export const PERSONAL_NOTE_CARD_MIN_HEIGHT = 130;
export const PERSONAL_NOTE_CARD_MAX_SIZE = 720;

export const TRACKED_FEATURES = new Set([
  "navigation.template_builder",
  "navigation.report_writer",
  "navigation.work_log",
  "navigation.interesting_cases",
  "navigation.insights",
  "reference.templates",
  "reference.snippets",
  "reference.ai_assist",
  "template.new",
  "template.save.created",
  "template.save.updated",
  "template.use",
  "old_report.preview",
  "old_report.use_as_template",
  "report.new",
  "report.copy",
  "report.interesting_toggle",
  "report.save.created",
  "report.save.updated",
  "work_log.preview",
  "work_log.edit_report",
  "work_log.calendar_filter",
  "report_note.open",
  "report_note.save",
  "always_notes.open",
  "always_notes.add",
  "always_notes.edit",
  "always_notes.move",
  "always_notes.resize",
  "always_notes.collapse",
  "always_notes.delete",
  "interesting.preview",
  "interesting.edit_report",
  "interesting.toggle",
  "insight.refresh",
  "insight.copy_prompt",
  "insight.dismiss",
  "snippet.add_finding.tirads",
  "snippet.add_finding.birads",
  "snippet.copy.tirads",
  "snippet.copy.birads",
  "snippet.insert.tirads",
  "snippet.insert.birads",
  "ai.generate",
  "ai.accept.impression",
  "ai.accept.metadata"
]);

export const INSIGHT_MIN_REPORTS = 3;
export const INSIGHT_SIMILARITY_THRESHOLD = 0.44;
export const INSIGHT_MIN_COHESION = 0.34;
export const INSIGHT_MAX_EXAMPLES = 5;
