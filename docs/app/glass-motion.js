// Glass motion (design system, 2026-11-21).
// 1. A soft shine that follows the mouse across buttons and tabs: sets
//    --mx/--my on the hovered control; CSS draws the highlight.
// 2. Tab strips (.mode-tabs, .reference-tabs) get one glass "lens" that
//    slides to the active tab instead of each tab drawing its own pill.
// Both are skipped when the system asks for reduced motion.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const CONTROL = "button, .mode-tabs > a";

let pending = null;
document.addEventListener("pointermove", event => {
  if (reduceMotion.matches) return;
  const control = event.target instanceof Element ? event.target.closest(CONTROL) : null;
  if (!control) return;
  pending = { control, x: event.clientX, y: event.clientY };
  if (pending.queued) return;
  pending.queued = true;
  requestAnimationFrame(() => {
    const { control: el, x, y } = pending;
    pending = null;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    el.style.setProperty("--mx", `${((x - box.left) / box.width) * 100}%`);
    el.style.setProperty("--my", `${((y - box.top) / box.height) * 100}%`);
  });
}, { passive: true });

function activeTab(strip) {
  return strip.querySelector(":scope > .active");
}

function placeLens(strip, lens, animate) {
  const tab = activeTab(strip);
  if (!tab || tab.offsetParent === null) {
    lens.style.opacity = "0";
    return;
  }
  const tint = getComputedStyle(tab).getPropertyValue("--tab-tint").trim();
  if (tint) lens.style.setProperty("--lens-tint", tint);
  lens.classList.toggle("no-slide", !animate || reduceMotion.matches);
  lens.style.opacity = "1";
  lens.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
  lens.style.width = `${tab.offsetWidth}px`;
  lens.style.height = `${tab.offsetHeight}px`;
}

function setUpStrip(strip) {
  if (strip.querySelector(":scope > .tab-lens")) return;
  const lens = document.createElement("span");
  lens.className = "tab-lens";
  lens.setAttribute("aria-hidden", "true");
  strip.prepend(lens);
  strip.classList.add("has-lens");
  placeLens(strip, lens, false);
  new MutationObserver(() => placeLens(strip, lens, true))
    .observe(strip, { subtree: true, attributes: true, attributeFilter: ["class"] });
  new ResizeObserver(() => placeLens(strip, lens, false)).observe(strip);
}

function setUpStrips() {
  document.querySelectorAll(".mode-tabs, .reference-tabs").forEach(setUpStrip);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setUpStrips);
} else {
  setUpStrips();
}
