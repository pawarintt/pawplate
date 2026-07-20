const baseUrl = process.env.PB_URL || "https://pawplatepb.tossatree.com";
const adminEmail = process.env.PB_ADMIN_EMAIL || process.env.PB_SUPERUSER_EMAIL;
const adminPassword = process.env.PB_ADMIN_PASSWORD || process.env.PB_SUPERUSER_PASSWORD;
const ownerRule = "owner = @request.auth.id";
const ownerIndex = "CREATE UNIQUE INDEX `idx_report_drafts_owner` ON `report_drafts` (`owner`)";

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

function jsonField(name) {
  return { name, type: "json", required: true, hidden: false, values: { maxSize: 2000000 } };
}

async function ensureReportDrafts(token) {
  let collection = null;
  try {
    collection = await request("/api/collections/report_drafts", {
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
        name: "report_drafts",
        type: "base",
        fields: [textField("owner", true), jsonField("payload")],
        listRule: ownerRule,
        viewRule: ownerRule,
        createRule: ownerRule,
        updateRule: ownerRule,
        deleteRule: ownerRule,
        indexes: [ownerIndex]
      })
    });
    console.log("report_drafts ready");
    return;
  }

  const usesFields = Array.isArray(collection.fields);
  const fieldKey = usesFields ? "fields" : "schema";
  const fields = collection[fieldKey] || [];
  const names = new Set(fields.map(field => field.name));
  const missing = [];
  if (!names.has("owner")) missing.push(textField("owner", true));
  if (!names.has("payload")) missing.push(jsonField("payload"));
  await request(`/api/collections/${collection.id}`, {
    method: "PATCH",
    headers: { Authorization: token },
    body: JSON.stringify({
      ...(missing.length ? { [fieldKey]: [...fields, ...missing] } : {}),
      listRule: ownerRule,
      viewRule: ownerRule,
      createRule: ownerRule,
      updateRule: ownerRule,
      deleteRule: ownerRule,
      indexes: [ownerIndex]
    })
  });
  console.log("report_drafts ready");
}

const token = await adminToken();
await ensureReportDrafts(token);
