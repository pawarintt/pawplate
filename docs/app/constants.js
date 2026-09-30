const CONFIG = window.PAWPLATE_CONFIG || {};

export const POCKETBASE_URL = CONFIG.pocketbaseUrl || window.location.origin;
export const API = `${POCKETBASE_URL.replace(/\/$/, "")}/api/collections`;
export const AUTH_KEY = "pawplate.auth";
export const PALETTE_KEY_PREFIX = "pawplate.palette.";
export const PERSONAL_DICTIONARY_KEY_PREFIX = "pawplate.dictionary.";
export const REPORT_DRAFT_KEY_PREFIX = "pawplate.report-draft.";
export const AUTH_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
export const AUTH_REFRESH_LEEWAY_MS = 60 * 60 * 1000;

// Network resilience tuning for unstable connections. Reads and the auth
// refresh are idempotent so they get timeouts plus a couple of retries with
// backoff; mutations get a timeout only (a blind retry could duplicate them).
export const READ_TIMEOUT_MS = 15 * 1000;
export const MUTATION_TIMEOUT_MS = 25 * 1000;
export const READ_MAX_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 400;

export const MODE_ROUTES = {
  builder: "template-builder",
  writer: "report-writer",
  worklog: "work-log",
  interesting: "interesting-cases"
};
export const ROUTE_MODES = Object.fromEntries(Object.entries(MODE_ROUTES).map(([mode, route]) => [route, mode]));
export const REFERENCE_ROUTES = {
  templates: "templates",
  snippets: "snippets",
  "old-reports": "old-reports"
};
export const ROUTE_REFERENCES = Object.fromEntries(Object.entries(REFERENCE_ROUTES).map(([tab, route]) => [route, tab]));

export class AuthSessionError extends Error {
  constructor(message = "Your session expired. Sign in again; your draft is safe.") {
    super(message);
    this.name = "AuthSessionError";
  }
}

// Editor and spellcheck files ship from docs/vendor/ (same origin as the app)
// so a stalled CDN on weak wifi cannot drop the editor to its plain fallback.
// See docs/vendor/README.md to rebuild them.
export const SPELLCHECK_DICTIONARY_URL = new URL("../vendor/typo-en_US", import.meta.url).href;
export const TIPTAP_BUNDLE_URL = new URL("../vendor/tiptap-2.11.7.js", import.meta.url).href;
export const DEFAULT_PALETTE = {
  text: ["#2b2526", "#8f4d57", "#7f5f3b", "#52654d"],
  highlight: ["#fff0a8", "#ffd4dc", "#dcefc8", "#efe2c3", "#d9edf0"]
};

export const FEATURE_USAGE_SETTINGS_KEY = "featureUsageV1";
export const TEMPLATE_ORDER_SETTINGS_KEY = "templateOrderV1";
export const SHORTHAND_SETTINGS_KEY = "shorthandV1";
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
export const PERSONAL_NOTE_IMAGE_MIN_WIDTH = 96;
export const PERSONAL_NOTE_IMAGE_MIN_HEIGHT = 80;
export const PERSONAL_NOTE_IMAGE_MAX_WIDTH = 640;
export const PERSONAL_NOTE_IMAGE_MAX_HEIGHT = 600;

export const TRACKED_FEATURES = new Set([
  "navigation.template_builder",
  "navigation.report_writer",
  "navigation.work_log",
  "navigation.interesting_cases",
  "reference.templates",
  "reference.snippets",
  "reference.old_reports",
  "template.new",
  "template.save.created",
  "template.save.updated",
  "template.use",
  "template.add_end",
  "template.merge",
  "template.merge.fallback",
  "template.merge.switch_to_end",
  "template.combine.undo",
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
  "work_log.trends",
  "work_log.modality_filter",
  "report_note.open",
  "report_note.save",
  "always_notes.open",
  "always_notes.add",
  "always_notes.image_card",
  "always_notes.image_embed",
  "always_notes.image_delete",
  "always_notes.image_resize",
  "always_notes.image_view",
  "always_notes.edit",
  "always_notes.move",
  "always_notes.resize",
  "always_notes.collapse",
  "always_notes.delete",
  "interesting.preview",
  "interesting.edit_report",
  "interesting.toggle",
  "snippet.add_finding.tirads",
  "snippet.add_finding.birads",
  "snippet.copy.tirads",
  "snippet.copy.birads",
  "snippet.insert.tirads",
  "snippet.insert.birads",
  "shorthand.open",
  "shorthand.insert",
  "shorthand.save",
  "shorthand.delete",
  "writer_old_report.preview",
  "writer_old_report.match",
  "writer_old_report.copy",
  // Retired with AI Assist; kept so past usage counts are not dropped.
  "reference.ai_assist",
  "ai.generate",
  "ai.accept.impression",
  "ai.accept.metadata"
]);
