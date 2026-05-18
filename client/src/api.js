export async function chatAI(messages, system) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Chat request failed");
  return json;
}

export async function parseRecipeUrl(url) {
  const res = await fetch("/api/parse-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Recipe parse failed");
  return json.recipe;
}
