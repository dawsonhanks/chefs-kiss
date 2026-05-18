import OpenAI from "openai";

export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

export function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}
