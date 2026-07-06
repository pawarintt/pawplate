const baseUrl = process.env.PB_URL || "https://pawplatepb.tossatree.com";
const adminEmail = process.env.PB_ADMIN_EMAIL;
const adminPassword = process.env.PB_ADMIN_PASSWORD;
const ownerRule = 'owner = @request.auth.id';

if (!adminEmail || !adminPassword) {
  throw new Error("Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD before running this script.");
}

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.message || text || response.statusText);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function adminToken() {
  try {
    const auth = await request("/api/admins/auth-with-password", {
      method: "POST",
      body: JSON.stringify({ identity: adminEmail, password: adminPassword })
    });
    return auth.token;
  } catch {
    const auth = await request("/api/collections/_superusers/auth-with-password", {
      method: "POST",
      body: JSON.stringify({ identity: adminEmail, password: adminPassword })
    });
    return auth.token;
  }
}

function textField(name, required = false) {
  return { name, type: "text", required, hidden: false, values: { min: null, max: null, pattern: "" } };
}

function markdownField() {
  return { name: "markdown", type: "text", required: false, hidden: false, values: { min: null, max: null, pattern: "" } };
}

function imageFileField() {
  return {
    name: "images",
    type: "file",
    required: false,
    hidden: false,
    maxSelect: 50,
    maxSize: 8388608,
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    thumbs: ["320x0", "900x0"],
    protected: true
  };
}

function legacyTextField(name, required = false) {
  return { name, type: "text", required, options: { min: null, max: null, pattern: "" } };
}

function legacyImageFileField() {
  return {
    name: "images",
    type: "file",
    required: false,
    options: {
      maxSelect: 50,
      maxSize: 8388608,
      mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      thumbs: ["320x0", "900x0"],
      protected: true
    }
  };
}

async function ensureGuidelines(token) {
  let collection = null;
  try {
    collection = await request("/api/collections/guidelines", {
      headers: { Authorization: token }
    });
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  if (!collection) {
    await request("/api/collections", {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify({
        name: "guidelines",
        type: "base",
        fields: [
          textField("owner", true),
          textField("title", true),
          textField("modality"),
          textField("topic"),
          textField("bodyPart"),
          textField("tags"),
          markdownField(),
          imageFileField(),
          textField("keywords")
        ],
        listRule: ownerRule,
        viewRule: ownerRule,
        createRule: ownerRule,
        updateRule: ownerRule,
        deleteRule: ownerRule
      })
    });
    console.log("guidelines ready");
    return;
  }

  const usesFields = Array.isArray(collection.fields);
  const fieldKey = usesFields ? "fields" : "schema";
  const fields = collection[fieldKey] || [];
  const names = new Set(fields.map(field => field.name));
  const missing = [];
  const nextFields = fields.map(field => (
    field.name === "images"
      ? { ...field, ...imageFileField(), id: field.id, system: field.system, presentable: field.presentable }
      : field.name === "markdown"
        ? { ...field, required: false }
        : field
  ));
  const addText = (name, required = false) => {
    if (names.has(name)) return;
    missing.push(usesFields ? textField(name, required) : legacyTextField(name, required));
  };
  addText("owner", true);
  addText("title", true);
  addText("modality");
  addText("topic");
  addText("bodyPart");
  addText("tags");
  addText("markdown");
  addText("keywords");
  if (!names.has("images")) {
    missing.push(usesFields ? imageFileField() : legacyImageFileField());
  }

  await request(`/api/collections/${collection.id}`, {
    method: "PATCH",
    headers: { Authorization: token },
    body: JSON.stringify({
      [fieldKey]: [...nextFields, ...missing],
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: ownerRule,
      updateRule: ownerRule,
      deleteRule: ownerRule
    })
  });
  console.log("guidelines ready");
}

const token = await adminToken();
await ensureGuidelines(token);
