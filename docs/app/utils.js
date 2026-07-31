export function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

export function escapeFilter(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

export function plainText(value) {
  const raw = String(value || "");
  if (!isHtml(raw)) return raw;
  const div = document.createElement("div");
  div.innerHTML = raw;
  return div.textContent || "";
}

export function reportHtml(value) {
  const raw = String(value || "");
  if (isHtml(raw)) return raw;
  return escapeHtml(raw)
    .replace(/\t/g, "&#9;")
    .replace(/ {2,}/g, spaces => "&nbsp;".repeat(spaces.length))
    .replace(/\n/g, "<br>");
}

export function friendlyErrorMessage(error) {
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

export async function copyText(value) {
  const text = String(value || "");
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through for browsers that deny the async clipboard API.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy is unavailable in this browser.");
}

export function debounce(fn, ms = 250) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}
