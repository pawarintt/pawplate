// Report name suggestions for Save Report. Only the exam title and the
// impression are sent to OpenAI (no HN, note, findings or patient details).
routerAdd("POST", "/api/pawplate/report-title", (e) => {
  const apiKey = $os.getenv("OPENAI_API_KEY");
  if (!apiKey) {
    return e.json(503, { message: "Title suggestions are not configured on this server." });
  }

  const data = new DynamicModel({ title: "", impression: "" });
  e.bindBody(data);
  const title = String(data.title || "").trim().slice(0, 200);
  const impression = String(data.impression || "").trim();
  if (!impression) {
    return e.json(400, { message: "An impression is required." });
  }
  if (impression.length > 4000) {
    return e.json(400, { message: "The impression is too long." });
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      names: { type: "array", items: { type: "string" } }
    },
    required: ["names"]
  };

  const response = $http.send({
    url: "https://api.openai.com/v1/responses",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    timeout: 30,
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "pawplate_report_title", strict: true, schema: schema } },
      input: [
        {
          role: "developer",
          content: [{
            type: "input_text",
            text: [
              "You name saved radiology reports so a radiologist can find them later in a work log and search.",
              "",
              "Return exactly 3 different names, best first:",
              "1. Exam + main diagnosis, e.g. \"CT Brain - Acute left MCA infarct\".",
              "2. Exam + the main diagnosis and the next most important one, e.g. \"CT Abdomen - HCC with portal vein thrombosis, cirrhosis\".",
              "3. The diagnosis alone, without the exam.",
              "",
              "- Use the exam from the current title when it names one (drop any old \" - diagnosis\" part); otherwise leave the exam out.",
              "- Name the diagnosis the way a radiologist would say it: short, specific, standard terms and abbreviations (HCC, PE, MCA, s/p). No full sentences, no filler such as \"findings consistent with\", no trailing period.",
              "- Keep laterality, location, and acuity when they matter. Keep important uncertainty short (\"suspected\", \"?\").",
              "- For a normal study, use \"Normal\" or the pertinent negative (e.g. \"No acute intracranial abnormality\").",
              "- Each name under 80 characters.",
              "- Use only facts in the impression. Never include patient identifiers, HN, accession numbers, dates, or names of people."
            ].join("\n")
          }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: "Current title: " + (title || "(none)") + "\n\nImpression:\n" + impression }]
        }
      ]
    })
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    return e.json(502, { message: "The AI service could not suggest names." });
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
  try {
    const result = JSON.parse(outputText);
    const names = (result.names || [])
      .map(name => String(name || "").replace(/\s+/g, " ").trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 3);
    if (!names.length) throw new Error("empty");
    return e.json(200, { names: names, hookVersion: "20261022.1" });
  } catch (_) {
    return e.json(502, { message: "The AI service returned no names." });
  }
}, $apis.requireAuth());
