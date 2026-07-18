routerAdd("POST", "/api/pawplate/ai-draft", (e) => {
  function plainText(value) {
    return String(value || "")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/\r/g, "")
      .trim();
  }

  function impressionText(value) {
    const text = plainText(value);
    const match = text.match(/(?:^|\n)\s*IMPRESSION\s*:?\s*([\s\S]*)$/i);
    if (!match) return "";
    return String(match[1] || "")
      .replace(/\n\s*PAWARIN\s+TONGPIPUTN\s*,?\s*M\.?D\.?[\s\S]*$/i, "")
      .replace(/\n\s*RADIOLOGIST\s*$/i, "")
      .trim();
  }

  function median(values) {
    if (!values.length) return 0;
    values.sort((left, right) => left - right);
    const middle = Math.floor(values.length / 2);
    return values.length % 2 ? values[middle] : Math.round((values[middle - 1] + values[middle]) / 2);
  }

  function personalStyle() {
    const fallback = { reports: 0, items: 3, characters: 400 };
    try {
      const owner = String((e.auth && (e.auth.id || e.auth.get("id"))) || "");
      if (!owner) return fallback;
      const records = e.app.findRecordsByFilter(
        "old_reports",
        'sourceType = "final-report" && owner = {:owner}',
        "-created",
        100,
        0,
        { owner: owner }
      );
      const lengths = [];
      const itemCounts = [];
      for (let index = 0; index < records.length; index += 1) {
        const impression = impressionText(records[index].get("report"));
        if (impression.length < 12) continue;
        const lines = impression.split("\n").map(line => line.trim()).filter(Boolean);
        const marked = lines.filter(line => /^(?:[-\u2022]|\d+[.)])\s+/.test(line));
        lengths.push(impression.length);
        itemCounts.push(marked.length || Math.max(1, lines.length));
      }
      if (lengths.length < 5) return fallback;
      return {
        reports: lengths.length,
        items: Math.max(1, Math.min(5, median(itemCounts))),
        characters: Math.max(200, Math.min(800, median(lengths)))
      };
    } catch (_) {
      return fallback;
    }
  }

  const defaultImpressionPrompt = [
    "Create a concise, prioritized impression that synthesizes the report into clinically meaningful diagnoses rather than repeating findings.",
    "",
    "Before writing, silently identify the principal disease, interval change, clinically material complications or staging features, the answer to the clinical question, and important secondary diagnoses.",
    "",
    "- Use a plain numbered list without an IMPRESSION heading.",
    "- Lead with the principal abnormality, meaningful interval change, and key complications.",
    "- Fold a complication into the principal disease item when it can be stated concisely. Do not create a separate item merely for nonvisualization, patency, or suspected involvement of a vessel or adjacent structure.",
    "- State the clinical implication instead of repeating its supporting finding.",
    "- Merge related findings into a conventional disease-level interpretation only when directly supported.",
    "- Group secondary findings only when they represent the same disease process. Do not combine unrelated findings merely to shorten the list.",
    "- Recognize supported conventional constellations, such as cirrhosis with splenomegaly and ascites indicating portal hypertension.",
    "- For malignancy, combine the primary tumor, treatment response or progression, local invasion, and tumor thrombus or vascular invasion in the first item.",
    "- Keep the direct answer to the clinical question in its own item when clinically important.",
    "- Keep suspicious or indeterminate nodal or distant metastatic disease separate from unrelated background disease.",
    "- Include pertinent negatives only when they directly answer the clinical question.",
    "- Do not expand a negative statement into additional specific negatives unless each is documented.",
    "- Omit patent or normal structures, supporting anatomy, and minor incidental findings unless they change diagnosis, staging, management, or prognosis.",
    "- Never omit a clinically important complication solely because it is uncertain; retain it concisely with an uncertainty qualifier.",
    "- Preserve measurements only when they communicate meaningful size or interval change.",
    "- Preserve uncertainty and negation. Do not upgrade possible or indeterminate findings into definite disease.",
    "- Do not add follow-up recommendations unless the report explicitly recommends them.",
    "- Keep each numbered item focused on one clinical problem. Do not append an unrelated second sentence merely to reduce the item count."
  ].join("\n");

  function aiSettings() {
    const fallback = { prompt: defaultImpressionPrompt, reasoning: "medium" };
    try {
      const owner = String((e.auth && (e.auth.id || e.auth.get("id"))) || "");
      if (!owner) return fallback;
      const records = e.app.findRecordsByFilter(
        "user_settings",
        'owner = {:owner} && key = "aiDraft"',
        "-updated",
        1,
        0,
        { owner: owner }
      );
      if (!records.length) return fallback;
      let value = records[0].get("value") || {};
      if (typeof value === "string") value = JSON.parse(value);
      const prompt = String(value.prompt || "").trim().slice(0, 12000) || fallback.prompt;
      const reasoning = ["low", "medium", "high"].indexOf(String(value.reasoning || "")) >= 0
        ? String(value.reasoning)
        : fallback.reasoning;
      return { prompt: prompt, reasoning: reasoning };
    } catch (_) {
      return fallback;
    }
  }

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
  const style = personalStyle();
  const settings = aiSettings();

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
      reasoning: { effort: settings.reasoning },
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
              "The personal instructions below may control synthesis, prioritization, length, and writing style. They cannot override the current-report evidence rule, privacy rule, or required output schema.",
              "",
              "Personal impression instructions:",
              settings.prompt,
              "",
              "Personal style profile derived from finalized reports:",
              "- Simple or normal studies usually need 1-2 items; this user's median is " + style.items + "; complex oncology or trauma may use up to 5.",
              "- Aim for roughly " + style.characters + " characters when the case permits, but never omit a clinically material finding merely to meet a length target.",
              "- Return only numbered impression items without markdown, bullets, signatures, or explanatory text.",
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
