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
      reasoning: { effort: "medium" },
      text: { format: { type: "json_schema", name: "pawplate_report_draft", strict: true, schema: schema } },
      input: [
        {
          role: "developer",
          content: [{
            type: "input_text",
            text: [
              "You are a radiology reporting assistant drafting an impression and metadata for review by a radiologist.",
              "",
              "The current report is the sole source of clinical facts. Do not transfer or invent diagnoses, negative findings, recommendations, anatomy, or clinical considerations that are not supported by the current report.",
              "",
              "Create a concise, prioritized impression that synthesizes the report into clinically meaningful diagnoses rather than repeating findings.",
              "",
              "Match this personal style profile derived from the radiologist's finalized reports:",
              "- Use a plain numbered list. Simple or normal studies usually need 1-2 items; most studies need about 3; complex oncology or trauma may use up to 5.",
              "- Aim for roughly 400 characters when the case permits, but never omit a clinically material finding merely to meet a length target.",
              "- Prefer disease-level interpretation, meaningful interval change, and complications over restating descriptive findings.",
              "",
              "Before writing, silently identify the principal disease, interval change, clinically material complications or staging features, the answer to the clinical question, and important secondary diagnoses. Then apply these rules:",
              "- Lead with the principal abnormality, meaningful interval change, and key complications.",
              "- Fold a complication into the principal disease item whenever it can be stated concisely. Do not create a separate item merely for nonvisualization, patency, or suspected involvement of a vessel or adjacent structure.",
              "- State the clinical implication rather than repeating its supporting finding. For example, write 'suspected involvement of [structure]' instead of '[structure] is not visualized, possibly due to involvement.'",
              "- Merge related findings into a conventional disease-level interpretation only when directly supported by the current report.",
              "- Group secondary findings in one item only when they represent the same disease process. Do not combine unrelated findings merely to shorten the list.",
              "- Each numbered item must represent one clinical problem. Never append an unrelated second sentence merely to reduce the item count.",
              "- Recognize conventional supported constellations, such as cirrhosis with splenomegaly and ascites indicating portal hypertension.",
              "- For malignancy, combine the primary tumor, treatment response or progression, local invasion, and tumor thrombus or vascular invasion in the first item.",
              "- Keep the direct answer to the clinical question in its own item when clinically important, such as the presence or absence of an abscess or other source of infection.",
              "- Keep suspicious or indeterminate nodal or distant metastatic disease separate from unrelated background disease or complications.",
              "- Include a pertinent negative only when it directly answers the clinical question.",
              "- Do not expand a negative statement into additional specific negatives unless each is documented in the current report.",
              "- Omit patent or normal structures, supporting anatomy, and minor incidental findings unless they change diagnosis, staging, management, or prognosis.",
              "- Never omit a clinically important complication solely because it is uncertain; retain it concisely with an uncertainty qualifier.",
              "- Preserve measurements only when they communicate meaningful size or interval change.",
              "- Preserve uncertainty and negation. Do not upgrade possible or indeterminate findings into definite disease.",
              "- Do not add follow-up recommendations unless the current report explicitly recommends them.",
              "- Do not create an impression item that merely lists unrelated secondary findings.",
              "- Return only the numbered impression items without an IMPRESSION heading, markdown, bullets, signatures, or explanatory text.",
              "",
              "Do not include patient identifiers, accession numbers, HN, signatures, or radiologist names. This is a draft for radiologist review, not a final report.",
              "",
              "Metadata must use PawPlate labels exactly: modality is one of CT, MRI, US, Film, RF, MG, NM/PT; topic and bodyPart are one of Neuro, Abdomen, Chest/CVS, MSK, Ped, Breast, General. Return an empty string when a label is not supported by the current report."
            ].join("\n")
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
