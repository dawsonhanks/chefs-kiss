import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function requireApiKey(req, res, next) {
  const client = getGroqClient();
  if (!client) {
    return res.status(503).json({
      error: "GROQ_API_KEY is not configured on the server.",
    });
  }
  req.groq = client;
  next();
}

app.post("/api/chat", requireApiKey, async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const response = await req.groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: system
        ? [{ role: "system", content: system }, ...messages]
        : messages,
    });

    res.json(response.choices[0].message);
  } catch (err) {
    console.error("Groq API error:", err);
    res.status(500).json({ error: err.message || "Groq request failed" });
  }
});

app.post("/api/parse-recipe", requireApiKey, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url is required" });
    }

    let pageText = "";
    try {
      const pageRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ChefsAssistant/1.0; +https://github.com/chefs-kiss)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!pageRes.ok) {
        throw new Error(`Failed to fetch URL (${pageRes.status})`);
      }
      const html = await pageRes.text();
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 20000);
    } catch (fetchErr) {
      return res.status(400).json({
        error: `Could not fetch recipe page: ${fetchErr.message}`,
      });
    }

    const response = await req.groq.chat.completions.create({
      model: GROQ_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract recipes from web page text. Return JSON only with this shape:
{
  "name": "string",
  "cookTime": "string e.g. 30 min",
  "servings": number,
  "ingredients": [{ "name": "string", "quantity": number, "unit": "g|kg|ml|L|cups|oz|tbsp|tsp|whole" }],
  "steps": ["string"]
}
Use reasonable defaults if data is missing. Normalize ingredient names (lowercase, simple).`,
        },
        {
          role: "user",
          content: `Recipe URL: ${url}\n\nPage text:\n${pageText}`,
        },
      ],
    });

    const raw = response.choices[0].message.content;
    const recipe = JSON.parse(raw);
    res.json({ recipe });
  } catch (err) {
    console.error("Parse recipe error:", err);
    res.status(500).json({ error: err.message || "Recipe parsing failed" });
  }
});

const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Chef's Assistant API running on http://localhost:${PORT}`);
});
