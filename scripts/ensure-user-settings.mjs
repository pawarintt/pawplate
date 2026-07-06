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

function fieldNames(collection) {
  return new Set((collection.fields || collection.schema || []).map(field => field.name));
}

function textField(name, required = false) {
  return { name, type: "text", required, hidden: false, values: { min: null, max: null, pattern: "" } };
}

function jsonField(name) {
  return { name, type: "json", required: false, hidden: false, values: { maxSize: 2000000 } };
}

async function ensureUserSettings(token) {
  let collection = null;
  try {
    collection = await request("/api/collections/user_settings", {
      headers: { Authorization: token }
    });
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  if (!collection) {
    collection = await request("/api/collections", {
      method: "POST",
      headers: { Authorization: token },
      body: JSON.stringify({
        name: "user_settings",
        type: "base",
        fields: [
          textField("owner", true),
          textField("key", true),
          jsonField("value")
        ],
        listRule: ownerRule,
        viewRule: ownerRule,
        createRule: ownerRule,
        updateRule: ownerRule,
        deleteRule: ownerRule
      })
    });
  } else {
    const usesFields = Array.isArray(collection.fields);
    const fieldKey = usesFields ? "fields" : "schema";
    const fields = collection[fieldKey] || [];
    const names = fieldNames(collection);
    const missing = [];
    if (!names.has("owner")) missing.push(usesFields ? textField("owner", true) : { name: "owner", type: "text", required: true, options: { min: null, max: null, pattern: "" } });
    if (!names.has("key")) missing.push(usesFields ? textField("key", true) : { name: "key", type: "text", required: true, options: { min: null, max: null, pattern: "" } });
    if (!names.has("value")) missing.push(usesFields ? jsonField("value") : { name: "value", type: "json", required: false, options: { maxSize: 2000000 } });
    await request(`/api/collections/${collection.id}`, {
      method: "PATCH",
      headers: { Authorization: token },
      body: JSON.stringify({
        ...(missing.length ? { [fieldKey]: [...fields, ...missing] } : {}),
        listRule: ownerRule,
        viewRule: ownerRule,
        createRule: ownerRule,
        updateRule: ownerRule,
        deleteRule: ownerRule
      })
    });
  }

  console.log("user_settings ready");
}

const token = await adminToken();
await ensureUserSettings(token);
