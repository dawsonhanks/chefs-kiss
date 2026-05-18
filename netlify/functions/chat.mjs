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
    const { messages, system } = await req.json();
    if (!Array.isArray(messages)) {
      return errorResponse("messages array is required", 400);
    }

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: system
        ? [{ role: "system", content: system }, ...messages]
        : messages,
    });

    return jsonResponse(response.choices[0].message);
  } catch (err) {
    console.error("Groq API error:", err);
    return errorResponse(err.message || "Groq request failed", 500);
  }
};
