import { useRef, useState } from "react";
import { chatAI } from "../api";

function buildSystemPrompt(data) {
  const pantry = data.pantry.length
    ? data.pantry
        .map((p) => `${p.name} (${p.quantity} ${p.unit})`)
        .join(", ")
    : "empty";

  const recipes = data.recipes.length
    ? data.recipes.map((r) => r.name).join(", ")
    : "none saved";

  return `You are a personal chef's assistant. The user's current pantry contains: ${pantry}. Their saved recipes are: ${recipes}. Help them decide what to cook, suggest substitutions, plan meals, and answer any food-related questions. Be warm, practical, and concise.`;
}

export default function ChefChatTab({ data }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello, chef! I'm here to help you cook with what's in your pantry. What are you in the mood for today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const apiMessages = nextMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const reply = await chatAI(apiMessages, buildSystemPrompt(data));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.content },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    }
  };

  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[400px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--color-kitchen-amber)] text-[#0f0f0f]"
                  : "border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] text-[var(--color-kitchen-cream)]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-xs text-[var(--color-kitchen-muted)]">
            Chef is thinking…
          </p>
        )}
        {error && (
          <p className="text-xs text-[var(--color-kitchen-danger)]">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="sticky bottom-0 flex gap-2 border-t border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-bg)] pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your chef anything…"
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] px-4 py-3 text-sm outline-none focus:border-[var(--color-kitchen-amber)]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl bg-[var(--color-kitchen-amber)] px-5 py-3 text-sm font-semibold text-[#0f0f0f] disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
