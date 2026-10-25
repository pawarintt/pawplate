// Pawlet text notes are one rich document (ProseMirror JSON) where images sit
// between paragraphs, like Google Docs or Notion. These helpers build, read and
// clean that document; the Tiptap image block lives here too.

const MAX_DOC_JSON = 200000;
const IMAGE_MIN_WIDTH = 96;
const IMAGE_MAX_WIDTH = 640;

export function pawletImageNodeAttrs(asset) {
  return {
    recordId: String(asset?.recordId || ""),
    filename: String(asset?.filename || ""),
    alt: String(asset?.alt || ""),
    width: Number(asset?.width) > 0 ? Math.round(Number(asset.width)) : 0
  };
}

// Old notes stored plain text plus a separate image list: each line becomes a
// paragraph and the images follow the text, in their old order.
export function docFromTextAndImages(text, images = []) {
  const paragraphs = String(text || "").replace(/\r/g, "").split("\n").map(line => (
    line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" }
  ));
  const imageNodes = images.map(asset => ({ type: "pawletImage", attrs: pawletImageNodeAttrs(asset) }));
  const content = [...paragraphs, ...imageNodes];
  if (imageNodes.length) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  if (Array.isArray(node.content)) node.content.forEach(child => walk(child, visit));
}

export function docAssets(doc) {
  const assets = [];
  walk(doc, node => {
    if (node.type === "pawletImage" && node.attrs?.recordId && node.attrs?.filename) assets.push(pawletImageNodeAttrs(node.attrs));
  });
  return assets;
}

export function docText(doc) {
  const blocks = (Array.isArray(doc?.content) ? doc.content : []).filter(block => block?.type !== "pawletImage");
  return blocks.map(block => {
    let text = "";
    walk(block, node => {
      if (node.type === "text") text += String(node.text || "");
      if (node.type === "hardBreak") text += "\n";
    });
    return text;
  }).join("\n").replace(/\n+$/, "");
}

export function isValidDoc(doc) {
  if (doc?.type !== "doc" || !Array.isArray(doc.content)) return false;
  try {
    return JSON.stringify(doc).length <= MAX_DOC_JSON;
  } catch {
    return false;
  }
}

// An image block inside a note: shows the picture at its saved width (never
// wider than the note), with a remove button and a corner handle that resizes
// it proportionally.
export function createPawletImageNode(Node, { imageUrl, getZoom = () => 1 }) {
  return Node.create({
    name: "pawletImage",
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes() {
      return {
        recordId: { default: "" },
        filename: { default: "" },
        alt: { default: "" },
        width: { default: 0 }
      };
    },
    parseHTML() {
      return [{
        tag: "img[data-pawlet-record]",
        getAttrs: element => ({
          recordId: element.getAttribute("data-pawlet-record") || "",
          filename: element.getAttribute("data-pawlet-file") || "",
          alt: element.getAttribute("alt") || "",
          width: Number(element.getAttribute("data-width")) || 0
        })
      }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["img", {
        "data-pawlet-record": HTMLAttributes.recordId,
        "data-pawlet-file": HTMLAttributes.filename,
        "data-width": HTMLAttributes.width || null,
        alt: HTMLAttributes.alt
      }];
    },
    addNodeView() {
      return ({ node, getPos, editor }) => {
        let current = node;
        const figure = document.createElement("figure");
        figure.className = "personal-note-image personal-note-doc-image";
        figure.contentEditable = "false";
        const image = document.createElement("img");
        image.loading = "lazy";
        image.draggable = false;
        image.title = "Double-click to view full screen";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "personal-note-image-remove";
        remove.title = "Remove image";
        remove.innerHTML = "&times;";
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "personal-note-image-resize";
        handle.title = "Resize image";
        figure.append(image, remove, handle);

        const paint = () => {
          const attrs = current.attrs;
          const src = imageUrl(attrs);
          if (image.getAttribute("src") !== src) image.src = src;
          image.alt = attrs.alt || "";
          image.dataset.noteImageRecord = attrs.recordId;
          image.dataset.noteImageFile = attrs.filename;
          remove.setAttribute("aria-label", `Remove ${attrs.alt || "image"}`);
          handle.setAttribute("aria-label", `Resize ${attrs.alt || "image"}`);
          figure.style.width = attrs.width ? `${attrs.width}px` : "100%";
        };
        paint();

        remove.addEventListener("mousedown", event => event.preventDefault());
        remove.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const pos = getPos();
          if (typeof pos !== "number") return;
          editor.chain().focus().deleteRange({ from: pos, to: pos + current.nodeSize }).run();
        });

        handle.addEventListener("pointerdown", event => {
          event.preventDefault();
          event.stopPropagation();
          const startX = event.clientX;
          const startY = event.clientY;
          // Sizes are in note units; the board may be drawn zoomed in or out.
          const zoom = getZoom() || 1;
          const box = figure.getBoundingClientRect();
          const rect = { width: box.width / zoom, height: box.height / zoom };
          const aspect = rect.height / rect.width || 1;
          const maxWidth = Math.max(IMAGE_MIN_WIDTH, Math.min(IMAGE_MAX_WIDTH, figure.parentElement?.clientWidth || IMAGE_MAX_WIDTH));
          let width = Math.round(rect.width);
          figure.classList.add("is-resizing");
          const move = moveEvent => {
            const dx = (moveEvent.clientX - startX) / zoom;
            const dy = (moveEvent.clientY - startY) / zoom / aspect;
            width = Math.round(Math.min(maxWidth, Math.max(IMAGE_MIN_WIDTH, rect.width + (Math.abs(dx) > Math.abs(dy) ? dx : dy))));
            figure.style.width = `${width}px`;
          };
          const stop = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
            window.removeEventListener("pointercancel", stop);
            figure.classList.remove("is-resizing");
            const pos = getPos();
            if (typeof pos !== "number" || width === current.attrs.width) return;
            editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, width }));
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", stop);
          window.addEventListener("pointercancel", stop);
        });

        return {
          dom: figure,
          update: next => {
            if (next.type !== current.type) return false;
            current = next;
            paint();
            return true;
          },
          // Clicks on the buttons are ours, not the editor's.
          stopEvent: event => Boolean(event.target?.closest?.(".personal-note-image-remove, .personal-note-image-resize")),
          ignoreMutation: () => true,
          refreshSrc: paint
        };
      };
    }
  });
}
