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
  // Preserve line breaks: <br> becomes \n and block ends become \n,
  // so empty paragraphs survive as blank lines instead of vanishing.
  div.querySelectorAll("br").forEach(node => node.replaceWith(document.createTextNode("\n")));
  div.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6").forEach(node => node.append(document.createTextNode("\n")));
  return (div.textContent || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n");
}

export function reportHtml(value) {
  const raw = String(value || "");
  if (isHtml(raw)) return raw;
  // Build real paragraphs so blank lines become empty <p> blocks.
  // Single newlines stay as <br> inside a paragraph; blank lines split paragraphs.
  // This keeps empty lines visible in the editor AND intact on native copy-paste.
  const escapeLine = line => escapeHtml(line)
    .replace(/\t/g, "&#9;")
    .replace(/ {2,}/g, spaces => "&nbsp;".repeat(spaces.length));
  const blocks = raw.replace(/\r/g, "").split(/\n{2,}/);
  const html = blocks.map(block => {
    const lines = block.split("\n").map(escapeLine).join("<br>");
    return `<p>${lines || "<br>"}</p>`;
  }).join("");
  return html || "<p><br></p>";
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
