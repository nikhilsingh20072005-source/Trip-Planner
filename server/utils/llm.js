const Anthropic = require("@anthropic-ai/sdk");

async function callGemini({ system, messages }) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        ...(system && { systemInstruction: { parts: [{ text: system }] } }),
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        })),
        generationConfig: { maxOutputTokens: 4096 }
      })
    }
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || "Gemini error");
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
}

async function callClaude({ system, messages, maxTokens }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5",
    max_tokens: maxTokens,
    ...(system && { system }),
    messages
  });
  return msg.content.map((b) => b.text || "").join("\n");
}

// Dono routes isi function ko use karenge
module.exports = async function generate({ system, messages, maxTokens = 1500 }) {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  return provider === "claude"
    ? callClaude({ system, messages, maxTokens })
    : callGemini({ system, messages });
};