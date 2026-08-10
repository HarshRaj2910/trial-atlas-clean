import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";
import Groq from "groq-sdk";
import os from "os";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

// PDF text extraction helper using pdfjs-dist Node build (no worker needed)
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const uint8Array = new Uint8Array(buffer);
  const pdfDoc = await getDocument({
    data: uint8Array,
    useWorkerFetch: false,
    // @ts-ignore - pdfjs types are sometimes mismatched with the legacy build
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;
  const textParts: string[] = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as any[]).map((item) => item.str).join(" ");
    textParts.push(pageText);
  }
  return textParts.join("\n");
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/upload-medical", upload.single("bill"), async (req, res) => {
    const tmpId = crypto.randomUUID();
    const tmpPdf = path.join(os.tmpdir(), `${tmpId}.pdf`);
    const tmpPrefix = path.join(os.tmpdir(), tmpId);

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      if (!groq) {
        return res.status(503).json({ error: "GROQ_API_KEY not configured — add it to .env" });
      }

      let textContent = "";
      try {
        textContent = await extractTextFromPDF(req.file.buffer);
        console.log(`Extracted ${textContent.length} characters from PDF.`);
      } catch (err) {
        console.error("Failed to parse PDF:", err);
        return res.status(422).json({ error: "Could not read text from PDF." });
      }

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "You are a highly secure HIPAA-compliant AI Clinical Trial Screener. Extract all medical data and return ONLY raw JSON. No markdown, no explanation.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Here is the extracted text from the medical record:\n\n${textContent}\n\nExtract all relevant clinical data and return exactly this JSON structure (compute all values from what you see):
{
  "patient_id": "<patient identifier shown on the record>",
  "provider": "<name of the hospital or clinic>",
  "date": "<date of the record>",
  "summary": "<one sentence summary of findings>",
  "confidence": <0.0 to 1.0 representing your confidence in this extraction>,
  "a1c_level": <number representing Hemoglobin A1C percentage>,
  "has_cvd": <boolean true if patient has history of cardiovascular disease>,
  "has_kidney_disease": <boolean true if patient has kidney disease>,
  "eligible_for_trial": <boolean true if a1c >= 7.0 AND has_cvd is false AND has_kidney_disease is false>,
  "lab_results": [
    { "test": "<name of test>", "value": "<result value>", "flag": "NORMAL|HIGH|LOW", "date": "<test date>" }
  ],
  "diagnosed_conditions": [
    "<condition 1>",
    "<condition 2>"
  ]
}`,
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from GROQ" });
      }

      const analysis = JSON.parse(content);
      console.log(`Medical Analysis Complete -> Eligible: ${analysis.eligible_for_trial}`);
      res.json({ analysis });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to analyze PDF" });
    } finally {
      // Clean up temp files
      [tmpPdf, ...fs.readdirSync(os.tmpdir())
        .filter(f => f.startsWith(tmpId))
        .map(f => path.join(os.tmpdir(), f))
      ].forEach(f => { try { fs.unlinkSync(f); } catch { } });
    }
  });

  app.post("/api/analyze-medical", async (req, res) => {
    try {
      if (!groq) {
        return res.status(503).json({ error: "GROQ_API_KEY not configured" });
      }
      const { medicalData } = req.body;
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
          { role: "system", content: "You are a highly secure HIPAA-compliant AI Clinical Trial Screener. Return ONLY raw valid JSON." },
          {
            role: "user",
            content: `Analyze this patient medical data and extract the key markers required for Trial 884 eligibility.
Trial 884 requires:
1. Patient must have Type 2 Diabetes (A1C >= 7.0)
2. Patient must NOT have a history of cardiovascular disease (CVD)
3. Patient must NOT have kidney disease

Medical Data:
${JSON.stringify(medicalData)}

Return JSON: { 
  "summary": "<one sentence>",
  "confidence": <0-1>, 
  "a1c_level": <number>,
  "has_cvd": <boolean>,
  "has_kidney_disease": <boolean>,
  "eligible_for_trial": <boolean>
}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      res.json({ analysis: result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze medical data" });
    }
  });

  app.post("/api/run-cron", async (req, res) => {
    try {
      // Placeholder endpoint for later cron integration.
      // Cron jobs can invoke this endpoint to execute the same task.
      const taskName = req.body?.taskName ?? "default";
      res.json({
        success: true,
        task: taskName,
        message: "Cron endpoint reached successfully.",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Cron endpoint error:", error);
      res.status(500).json({ error: "Failed to invoke cron endpoint" });
    }
  });

  app.get("/api/demo-data", (req, res) => {
    res.json({
      analysis: {
        patient_id: "PT-884-X9",
        provider: "Atlas General Hospital",
        date: "May 2026",
        summary: "Patient displays elevated A1C levels consistent with Type 2 Diabetes, with no secondary cardiovascular complications.",
        confidence: 0.98,
        a1c_level: 7.4,
        has_cvd: false,
        has_kidney_disease: false,
        eligible_for_trial: true,
        lab_results: [
          { test: "Hemoglobin A1C", value: "7.4%", flag: "HIGH", date: "2026-05-10" },
          { test: "Fasting Glucose", value: "145 mg/dL", flag: "HIGH", date: "2026-05-10" },
          { test: "eGFR (Kidney)", value: "95 mL/min", flag: "NORMAL", date: "2026-05-10" },
          { test: "Troponin (Heart)", value: "<0.01 ng/mL", flag: "NORMAL", date: "2026-05-10" }
        ],
        diagnosed_conditions: [
          "Type 2 Diabetes Mellitus (E11.9)",
          "Essential Hypertension (I10)"
        ]
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
