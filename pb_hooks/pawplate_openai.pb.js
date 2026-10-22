// Generic OpenAI call for PawPlate features. The app sends the instructions,
// the input text and (optionally) a JSON schema for the answer; the server
// adds the API key and model. Signed-in users only; nothing is stored at
// OpenAI (store: false).
//
// POST /api/pawplate/openai
//   { instructions, input, schema?, reasoning? ("low" | "medium" | "high") }
// -> { output } (parsed JSON when a schema was given, otherwise text)
routerAdd("POST", "/api/pawplate/openai", (e) => {
  const MODEL = "gpt-5.6-luna";
  const apiKey = $os.getenv("OPENAI_API_KEY");
  if (!apiKey) {
    return e.json(503, { message: "OpenAI is not configured on this server." });
  }

  const data = new DynamicModel({ instructions: "", input: "", schema: {}, reasoning: "" });
  e.bindBody(data);
  const instructions = String(data.instructions || "").trim();
  const input = String(data.input || "").trim();
  if (!instructions || !input) {
    return e.json(400, { message: "Instructions and input are required." });
  }
  if (instructions.length > 12000 || input.length > 30000) {
    return e.json(400, { message: "The request is too long." });
  }
  const reasoning = ["low", "medium", "high"].indexOf(String(data.reasoning || "")) >= 0 ? String(data.reasoning) : "low";
  // Round-trip through JSON so an empty or missing schema reads as a plain {}.
  const schemaValue = JSON.parse(JSON.stringify(data.schema || {})) || {};
  const schema = typeof schemaValue === "object" && Object.keys(schemaValue).length ? schemaValue : null;

  const request = {
    model: MODEL,
    store: false,
    reasoning: { effort: reasoning },
    input: [
      { role: "developer", content: [{ type: "input_text", text: instructions }] },
      { role: "user", content: [{ type: "input_text", text: input }] }
    ]
  };
  if (schema) {
    request.text = { format: { type: "json_schema", name: "pawplate_output", strict: true, schema: schema } };
  }

  const response = $http.send({
    url: "https://api.openai.com/v1/responses",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    timeout: 90,
    body: JSON.stringify(request)
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    return e.json(502, { message: "The AI service could not answer." });
  }

  const body = response.json || {};
  let outputText = String(body.output_text || "");
  if (!outputText && body.output) {
    for (let i = 0; i < body.output.length; i += 1) {
      const content = body.output[i].content || [];
      for (let j = 0; j < content.length; j += 1) {
        if (content[j].type === "output_text") outputText += content[j].text || "";
      }
    }
  }
  if (!outputText) return e.json(502, { message: "The AI service returned an empty answer." });
  if (!schema) return e.json(200, { output: outputText });
  try {
    return e.json(200, { output: JSON.parse(outputText) });
  } catch (_) {
    return e.json(502, { message: "The AI service returned an invalid answer." });
  }
}, $apis.requireAuth());
