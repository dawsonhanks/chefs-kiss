import {
  GROQ_MODEL,
  errorResponse,
  getGroqClient,
  jsonResponse,
} from "./lib/groq.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const groq = getGroqClient();
  if (!groq) {
    return errorResponse("GROQ_API_KEY is not configured on the server.", 503);
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return errorResponse("url is required", 400);
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
      return errorResponse(
        `Could not fetch recipe page: ${fetchErr.message}`,
        400
      );
    }

    const response = await groq.chat.completions.create({
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
    return jsonResponse({ recipe });
  } catch (err) {
    console.error("Parse recipe error:", err);
    return errorResponse(err.message || "Recipe parsing failed", 500);
  }
};
