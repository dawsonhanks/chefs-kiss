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

export async function suggestSubstitutions(recipe, missing, pantry) {
  const pantryList = pantry.length
    ? pantry.map((p) => `${p.name} (${p.quantity} ${p.unit})`).join(", ")
    : "empty";

  const missingList = missing
    .map((m) => `${m.quantity} ${m.unit} ${m.name}`)
    .join(", ");

  const system = `You are a practical home cooking assistant. The user's pantry contains: ${pantryList}.
For the recipe "${recipe.name}", they are missing: ${missingList}.
Suggest 2–3 realistic substitutions per missing ingredient using what they likely have or common pantry staples.
Be concise: use a short bullet list. Mention if they can skip an ingredient. No preamble.`;

  const reply = await chatAI(
    [{ role: "user", content: "What substitutions can I use?" }],
    system
  );
  return reply.content;
}
