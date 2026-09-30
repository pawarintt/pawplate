// Combine a template into the report that is already open. "append" stacks
// it at the end; "merge" moves each section of the added template under the
// matching heading of the current report (FINDINGS into FINDINGS, and so on)
// and falls back to append when the two share no headings.
//
// Reports are HTML from the editor (or plain text from older records), so the
// document is flattened into lines: one per paragraph, split again on <br>.
// Lists, headings and other blocks stay whole. Each line remembers whether it
// was followed by a <br> or a paragraph break so the output keeps its spacing.
import { reportHtml } from "./utils.js?v=20260930-tokens";

// Headings recognised as sections, grouped by the section they mean.
const SECTION_ALIASES = {
  EXAMINATION: ["EXAMINATION", "EXAM", "STUDY", "PROCEDURE"],
  HISTORY: ["CLINICAL HISTORY", "HISTORY", "CLINICAL INFORMATION", "CLINICAL INDICATION", "INDICATION", "INDICATIONS", "REASON FOR EXAM"],
  TECHNIQUE: ["TECHNIQUE", "TECHNIQUES", "PROTOCOL"],
  COMPARISON: ["COMPARISON", "COMPARISONS", "PRIOR", "PRIORS"],
  FINDINGS: ["FINDINGS", "FINDING"],
  IMPRESSION: ["IMPRESSION", "IMPRESSIONS", "CONCLUSION", "CONCLUSIONS", "OPINION"],
  RECOMMENDATION: ["RECOMMENDATION", "RECOMMENDATIONS"]
};
const SECTION_ORDER = Object.keys(SECTION_ALIASES);
const SECTION_BY_ALIAS = new Map(
  Object.entries(SECTION_ALIASES).flatMap(([key, aliases]) => aliases.map(alias => [alias, key]))
);
const HEADING_PATTERN = /^\s*([A-Za-z][A-Za-z ]{1,30}?)\s*(:|$)/;
const NUMBERED_PATTERN = /^(\s*)(\d+)([.)]\s)/;

function htmlToLines(value) {
  const container = document.createElement("template");
  container.innerHTML = reportHtml(value);
  const lines = [];
  const pushLine = (html, block = false) => {
    const probe = document.createElement("template");
    probe.innerHTML = html;
    lines.push({ html, text: (probe.content.textContent || "").replace(/\u00a0/g, " "), block, sep: "block" });
  };
  container.content.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim()) pushLine(node.textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;"));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName !== "P") {
      pushLine(node.outerHTML, true);
      return;
    }
    const parts = node.innerHTML.split(/<br\s*\/?>/i);
    // A trailing <br> is the editor's placeholder for an empty paragraph.
    if (parts.length > 1 && !parts[parts.length - 1].trim()) parts.pop();
    parts.forEach((part, index) => {
      pushLine(part);
      if (index < parts.length - 1) lines[lines.length - 1].sep = "br";
    });
  });
  return lines;
}

function linesToHtml(lines) {
  let html = "";
  let paragraph = null;
  lines.forEach(line => {
    if (line.block) {
      if (paragraph) html += `<p>${paragraph.join("<br>")}</p>`;
      paragraph = null;
      html += line.html;
      return;
    }
    if (!paragraph) paragraph = [];
    paragraph.push(line.html);
    if (line.sep !== "br") {
      html += `<p>${paragraph.join("<br>")}</p>`;
      paragraph = null;
    }
  });
  if (paragraph) html += `<p>${paragraph.join("<br>")}</p>`;
  return html;
}

function isBlankLine(line) {
  return !line.block && !line.text.trim();
}

// "FINDINGS:" is a section; "NECK FINDINGS:" is the neck part of it.
function headingOf(line) {
  if (line.block && !/^<h[1-6]/i.test(line.html)) return null;
  const match = line.text.match(HEADING_PATTERN);
  if (!match) return null;
  const label = match[1].trim().replace(/\s+/g, " ").toUpperCase();
  const rest = line.text.slice(match[0].length).trim();
  const key = SECTION_BY_ALIAS.get(label);
  if (key) return { key, region: "", rest };
  const regional = label.match(/^(.+) FINDINGS?$/);
  return regional ? { key: "FINDINGS", region: regional[1], rest } : null;
}

function splitSections(lines) {
  const preamble = [];
  const sections = [];
  lines.forEach(line => {
    const heading = headingOf(line);
    if (heading && !sections.some(section => section.key === heading.key && section.region === heading.region)) {
      sections.push({ key: heading.key, region: heading.region, heading: line, rest: heading.rest, body: [] });
    } else if (sections.length) {
      sections[sections.length - 1].body.push(line);
    } else {
      preamble.push(line);
    }
  });
  return { preamble, sections };
}

function trimBlankLines(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && isBlankLine(lines[start])) start += 1;
  while (end > start && isBlankLine(lines[end - 1])) end -= 1;
  return lines.slice(start, end);
}

// Drop the "TECHNIQUE:" label from an inline heading line, keeping the text
// (and any formatting) that follows it on the same line.
function stripHeadingLabel(line) {
  const container = document.createElement("template");
  container.innerHTML = line.html;
  const labelLength = line.text.indexOf(":") + 1;
  let remaining = labelLength;
  const walker = document.createTreeWalker(container.content, NodeFilter.SHOW_TEXT);
  const touched = [];
  while (remaining > 0 && walker.nextNode()) {
    const node = walker.currentNode;
    const take = Math.min(remaining, node.textContent.length);
    node.textContent = node.textContent.slice(take);
    remaining -= take;
    touched.push(node);
  }
  const last = touched[touched.length - 1];
  if (last) last.textContent = last.textContent.replace(/^[\s\u00a0]+/, "");
  touched.forEach(node => {
    let element = node.parentNode;
    if (!node.textContent) node.remove();
    while (element && element !== container.content && !element.textContent && !element.querySelector?.("img, br")) {
      const parent = element.parentNode;
      element.remove();
      element = parent;
    }
  });
  const html = container.innerHTML;
  return { ...line, html, text: (container.content.textContent || "").replace(/\u00a0/g, " ") };
}

// Continue "1. 2." numbering (plain text or an <ol>) from the current
// impression into the added one.
function continueNumbering(targetBody, addedLines) {
  const lastList = [...targetBody].reverse().find(line => line.block && /^<ol/i.test(line.html));
  const numbers = targetBody
    .filter(line => !line.block)
    .map(line => line.text.match(NUMBERED_PATTERN))
    .filter(Boolean)
    .map(match => Number(match[2]));
  let next = numbers.length ? Math.max(...numbers) + 1 : 0;
  let listCount = 0;
  if (lastList) {
    const probe = document.createElement("template");
    probe.innerHTML = lastList.html;
    const list = probe.content.firstElementChild;
    listCount = (Number(list.getAttribute("start")) || 1) + list.querySelectorAll(":scope > li").length;
  }
  return addedLines.map(line => {
    if (line.block && /^<ol/i.test(line.html) && listCount) {
      const probe = document.createElement("template");
      probe.innerHTML = line.html;
      const list = probe.content.firstElementChild;
      list.setAttribute("start", String(listCount));
      listCount += list.querySelectorAll(":scope > li").length;
      return { ...line, html: list.outerHTML };
    }
    if (!next || line.block || !NUMBERED_PATTERN.test(line.text)) return line;
    const container = document.createElement("template");
    container.innerHTML = line.html;
    const walker = document.createTreeWalker(container.content, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      node.textContent = node.textContent.replace(/^(\s*)\d+/, `$1${next}`);
      break;
    }
    next += 1;
    return { ...line, html: container.innerHTML, text: container.content.textContent || "" };
  });
}

// Insert lines after the last non-blank line of `lines` (or at the start when
// there is none), giving them the spacing that followed that line.
function insertAfterContent(lines, addedLines, anchorLine = null) {
  const added = trimBlankLines(addedLines).map(line => ({ ...line }));
  if (!added.length) return;
  let index = lines.length;
  while (index > 0 && isBlankLine(lines[index - 1])) index -= 1;
  const anchor = index ? lines[index - 1] : anchorLine;
  const previous = index > 1 ? lines[index - 2] : index === 1 ? anchorLine : null;
  added[added.length - 1].sep = anchor ? anchor.sep : "block";
  // Lines written as one paragraph with line breaks keep going that way.
  if (anchor && !anchor.block && !added[0].block && (anchor.sep === "br" || previous?.sep === "br")) anchor.sep = "br";
  if (!anchor && lines.length) added.push(blankLine());
  lines.splice(index, 0, ...added);
}

function blankLine() {
  return { html: "", text: "", block: false, sep: "block" };
}

function appendHtml(currentHtml, addedHtml) {
  const current = trimBlankLines(htmlToLines(currentHtml));
  const added = trimBlankLines(htmlToLines(addedHtml));
  if (!current.length) return linesToHtml(added);
  if (!added.length) return linesToHtml(current);
  current[current.length - 1].sep = "block";
  return linesToHtml([...current, blankLine(), ...added]);
}

function lineWithText(line, text) {
  const container = document.createElement("template");
  container.innerHTML = line.html;
  const walker = document.createTreeWalker(container.content, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  if (!nodes.length) return { ...line, html: text.replace(/&/g, "&amp;").replace(/</g, "&lt;"), text };
  nodes[0].textContent = text;
  nodes.slice(1).forEach(node => { node.textContent = ""; });
  return { ...line, html: container.innerHTML, text };
}

// "CT SCAN OF CHEST" + "CT SCAN OF NECK WITH CONTRAST" gives
// "CT SCAN OF CHEST AND NECK WITH CONTRAST", with the regions in the order the
// templates were opened. The title is null when they ask for different
// contrast; the whole result is null when the exams don't share a prefix.
const TITLE_MODIFIER = /\s+((?:WITH|WITHOUT)\b.*|NON[- ]?CONTRAST.*|\(.*\))$/i;
const REGION_SPLIT = /\s*(?:,|&|\bAND\b)\s*/i;

function combineExamTitles(currentTitle, addedTitle) {
  const split = title => {
    const text = title.replace(/\s+/g, " ").trim();
    const modifier = text.match(TITLE_MODIFIER);
    return { base: modifier ? text.slice(0, modifier.index) : text, modifier: modifier ? modifier[1].trim() : "" };
  };
  const current = split(currentTitle);
  const added = split(addedTitle);
  const currentWords = current.base.split(" ");
  const addedWords = added.base.split(" ");
  let shared = 0;
  while (shared < currentWords.length - 1 && shared < addedWords.length - 1
    && currentWords[shared].toUpperCase() === addedWords[shared].toUpperCase()) shared += 1;
  if (!shared) return null;
  const currentRegions = currentWords.slice(shared).join(" ").split(REGION_SPLIT).filter(Boolean);
  const addedRegions = addedWords.slice(shared).join(" ").split(REGION_SPLIT).filter(Boolean);
  const regions = [...currentRegions];
  addedRegions.forEach(region => {
    if (!regions.some(item => item.toUpperCase() === region.toUpperCase())) regions.push(region);
  });
  const and = /[a-z]/.test(current.base) ? "and" : "AND";
  const list = items => items.length > 1 ? `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}` : items[0];
  const modifier = current.modifier || added.modifier;
  const conflict = current.modifier && added.modifier && current.modifier.toUpperCase() !== added.modifier.toUpperCase();
  return {
    title: conflict ? null : `${currentWords.slice(0, shared).join(" ")} ${list(regions)}${modifier ? ` ${modifier}` : ""}`,
    currentRegions,
    addedRegion: list(addedRegions)
  };
}

function firstContentIndex(lines) {
  return lines.findIndex(line => !isBlankLine(line));
}

// Put the region in front of FINDINGS in a heading line, matching its case.
function regionHeading(line, region) {
  const container = document.createElement("template");
  container.innerHTML = line.html;
  const walker = document.createTreeWalker(container.content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const match = node.textContent.match(/findings?/i);
    if (!match) continue;
    const upper = match[0] === match[0].toUpperCase();
    const label = upper ? region.toUpperCase() : region.charAt(0).toUpperCase() + region.slice(1).toLowerCase();
    node.textContent = `${node.textContent.slice(0, match.index)}${label} ${node.textContent.slice(match.index)}`;
    break;
  }
  return { ...line, html: container.innerHTML, text: container.content.textContent || "" };
}

function trailingBlankCount(lines) {
  let count = 0;
  while (count < lines.length && isBlankLine(lines[lines.length - 1 - count])) count += 1;
  return count;
}

// Lines both reports end with (the signature) stay once, at the end.
function commonTailLength(currentLines, addedLines) {
  const current = currentLines.filter(line => !isBlankLine(line));
  const added = addedLines.filter(line => !isBlankLine(line));
  let count = 0;
  while (count < current.length && count < added.length
    && current[current.length - 1 - count].text.trim() === added[added.length - 1 - count].text.trim()) count += 1;
  return count;
}

// Drop the last `count` non-blank lines (and the blanks around them).
function withoutTail(lines, count) {
  if (!count) return { head: lines, tail: [] };
  let seen = 0;
  let index = lines.length;
  while (index > 0 && seen < count) {
    index -= 1;
    if (!isBlankLine(lines[index])) seen += 1;
  }
  while (index > 0 && isBlankLine(lines[index - 1])) index -= 1;
  return { head: lines.slice(0, index), tail: lines.slice(index) };
}

function mergeHtml(currentHtml, addedHtml) {
  const current = splitSections(htmlToLines(currentHtml));
  const added = splitSections(htmlToLines(addedHtml));
  const shared = added.sections.filter(section => current.sections.some(item => item.key === section.key));
  if (!shared.length) return null;
  const merged = [];
  const addedSections = [];

  // One exam title line for both, when they are the same kind of exam.
  const currentPreamble = [...current.preamble];
  let addedPreamble = [...added.preamble];
  const currentTitleIndex = firstContentIndex(currentPreamble);
  const addedTitleIndex = firstContentIndex(addedPreamble);
  const titles = currentTitleIndex >= 0 && addedTitleIndex >= 0
    ? combineExamTitles(currentPreamble[currentTitleIndex].text, addedPreamble[addedTitleIndex].text)
    : null;
  if (titles?.title) {
    currentPreamble[currentTitleIndex] = lineWithText(currentPreamble[currentTitleIndex], titles.title);
    addedPreamble = addedPreamble.filter((line, index) => index !== addedTitleIndex);
  }

  const lastCurrent = current.sections[current.sections.length - 1];
  const lastAdded = added.sections[added.sections.length - 1];
  const tailLength = lastCurrent && lastAdded ? commonTailLength(lastCurrent.body, lastAdded.body) : 0;
  const currentTail = lastCurrent ? withoutTail(lastCurrent.body, tailLength) : { head: [], tail: [] };
  if (lastCurrent) lastCurrent.body = currentTail.head;
  if (lastAdded) lastAdded.body = withoutTail(lastAdded.body, tailLength).head;

  added.sections.forEach(section => {
    const body = section.rest ? [stripHeadingLabel(section.heading), ...section.body] : section.body;
    if (!trimBlankLines(body).length && current.sections.some(item => item.key === section.key)) return;
    const findings = current.sections.filter(item => item.key === "FINDINGS");
    // Findings of a different region get their own "NECK FINDINGS:" part.
    if (section.key === "FINDINGS" && !section.region && titles?.addedRegion && findings.length) {
      const plain = findings.find(item => !item.region);
      if (plain && findings.length === 1 && titles.currentRegions.length === 1) {
        plain.region = titles.currentRegions[0].toUpperCase();
        plain.heading = regionHeading(plain.heading, titles.currentRegions[0]);
      }
      if (findings.every(item => item.region)) {
        const last = findings[findings.length - 1];
        const blanks = Array.from({ length: trailingBlankCount(last.body) }, blankLine);
        const content = trimBlankLines(body).map(line => ({ ...line }));
        if (blanks.length && content.length) content[content.length - 1].sep = "block";
        const copy = {
          key: "FINDINGS",
          region: titles.addedRegion.toUpperCase(),
          heading: regionHeading(section.heading.text.includes(":") && section.rest ? lineWithText(section.heading, section.heading.text.slice(0, section.heading.text.indexOf(":") + 1)) : section.heading, titles.addedRegion),
          body: [...content, ...blanks]
        };
        if (!blanks.length && last.body.length) last.body[last.body.length - 1].sep = "block";
        current.sections.splice(current.sections.indexOf(last) + 1, 0, copy);
        addedSections.push(`${titles.addedRegion} findings`);
        return;
      }
    }
    const target = current.sections.find(item => item.key === section.key && item.region === section.region)
      || current.sections.find(item => item.key === section.key);
    if (target) {
      let lines = body;
      if (section.key === "IMPRESSION") {
        const existing = new Set(target.body.map(line => line.text.trim()).filter(Boolean));
        lines = continueNumbering(target.body, trimBlankLines(body).filter(line => !existing.has(line.text.trim())));
      }
      if (!trimBlankLines(lines).length) return;
      insertAfterContent(target.body, lines, target.heading);
      merged.push(target.region ? `${target.region} findings` : section.key);
      return;
    }
    // A section the current report lacks goes in at its usual place.
    const order = SECTION_ORDER.indexOf(section.key);
    const beforeIndex = current.sections.findIndex(item => SECTION_ORDER.indexOf(item.key) > order);
    const copy = { ...section, body: [...trimBlankLines(section.body), blankLine()] };
    current.sections.splice(beforeIndex < 0 ? current.sections.length : beforeIndex, 0, copy);
    addedSections.push(section.key);
  });
  if (lastCurrent && currentTail.tail.length) {
    const blanks = trailingBlankCount(currentTail.tail.slice(0, currentTail.tail.findIndex(line => !isBlankLine(line))));
    const content = trimBlankLines(lastCurrent.body);
    lastCurrent.body = [...lastCurrent.body.slice(0, lastCurrent.body.length - trailingBlankCount(lastCurrent.body))];
    if (content.length && !blanks) lastCurrent.body[lastCurrent.body.length - 1].sep = "block";
    lastCurrent.body.push(...currentTail.tail);
  }

  const hadPreamble = trimBlankLines(currentPreamble).length > 0;
  insertAfterContent(currentPreamble, addedPreamble);
  if (!hadPreamble && trimBlankLines(addedPreamble).length && !current.preamble.length) currentPreamble.push(blankLine());
  const lines = [
    ...currentPreamble,
    ...current.sections.flatMap(section => [section.heading, ...section.body])
  ];
  return { html: joinContinuedLists(linesToHtml(lines)), merged, added: addedSections, title: Boolean(titles?.title) };
}

// Join an <ol> onto the list just before it when it continues that list's
// numbering, so a merged impression reads as one list instead of two.
function joinContinuedLists(html) {
  const container = document.createElement("template");
  container.innerHTML = html;
  container.content.querySelectorAll("ol").forEach(list => {
    const previous = list.previousElementSibling;
    if (!previous || previous.tagName !== "OL" || previous.parentNode !== list.parentNode) return;
    const expected = (Number(previous.getAttribute("start")) || 1) + previous.querySelectorAll(":scope > li").length;
    if ((Number(list.getAttribute("start")) || 1) !== expected) return;
    previous.append(...list.children);
    list.remove();
  });
  return container.innerHTML;
}

export function combineTemplateHtml(currentHtml, addedHtml, mode = "append") {
  if (!trimBlankLines(htmlToLines(currentHtml)).length) {
    return { mode, fallback: false, empty: true, html: appendHtml(currentHtml, addedHtml), merged: [], added: [] };
  }
  if (mode === "merge") {
    const result = mergeHtml(currentHtml, addedHtml);
    if (result) return { mode: "merge", ...result };
    return { mode: "append", fallback: true, html: appendHtml(currentHtml, addedHtml), merged: [], added: [] };
  }
  return { mode: "append", fallback: false, html: appendHtml(currentHtml, addedHtml), merged: [], added: [] };
}

export function sectionLabel(key) {
  return key.charAt(0) + key.slice(1).toLowerCase();
}
