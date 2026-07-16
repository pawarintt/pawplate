routerAdd("POST", "/api/pawplate/ai-draft", (e) => {
  const apiKey = $os.getenv("OPENAI_API_KEY");
  if (!apiKey) {
    return e.json(503, { message: "AI Draft is not configured on this server." });
  }

  const data = new DynamicModel({
    report: "",
    title: "",
    modality: "",
    topic: "",
    bodyPart: "",
    keywords: ""
  });
  e.bindBody(data);

  const report = String(data.report || "").trim();
  if (!report) {
    return e.json(400, { message: "A report is required to create an AI draft." });
  }
  if (report.length > 30000) {
    return e.json(400, { message: "The report is too long for an AI draft." });
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      impression: { type: "string" },
      title: { type: "string" },
      modality: { type: "string" },
      topic: { type: "string" },
      bodyPart: { type: "string" },
      keywords: { type: "string" },
      uncertainties: { type: "string" }
    },
    required: ["impression", "title", "modality", "topic", "bodyPart", "keywords", "uncertainties"]
  };

  const response = $http.send({
    url: "https://api.openai.com/v1/responses",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    timeout: 90,
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "pawplate_report_draft", strict: true, schema: schema } },
      input: [
        {
          role: "developer",
          content: [{
            type: "input_text",
            text: "You are a radiology reporting assistant. Draft only from the supplied report. Do not invent, infer, or omit clinically material facts. Preserve uncertainty and negation. Do not include patient identifiers, accession numbers, or HN. The impression should be concise, clinically useful, and use literal dash lines if multiple points are needed. This is a draft for radiologist review, not a final report. Metadata must use PawPlate labels exactly: modality is one of CT, MRI, US, Film, RF, MG, NM/PT; topic and bodyPart are one of Neuro, Abdomen, Chest/CVS, MSK, Ped, Breast, General. Return an empty string when a label is not supported by the report."
          }]
        },
        {
          role: "user",
          content: [{
            type: "input_text",
            text: "Current metadata:\nTitle: " + data.title + "\nModality: " + data.modality + "\nTopic: " + data.topic + "\nBody part: " + data.bodyPart + "\nKeywords: " + data.keywords + "\n\nReport:\n" + report
          }]
        }
      ]
    })
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    return e.json(502, { message: "The AI service could not create a draft." });
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
  if (!outputText) return e.json(502, { message: "The AI service returned an empty draft." });

  try {
    return e.json(200, JSON.parse(outputText));
  } catch (_) {
    return e.json(502, { message: "The AI service returned an invalid draft." });
  }
}, $apis.requireAuth());
