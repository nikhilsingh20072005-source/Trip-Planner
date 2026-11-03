import { useState, useRef, useEffect } from "react";
import api from "../api";

export default function TripChat({ tripId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/ai/chat", { tripId, messages: next });
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.response?.data?.message || "Bot se jawab nahi aaya");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h3>Trip Assistant 🤖</h3>
      <div
        style={{
          height: 280,
          overflowY: "auto",
          background: "#f9fafb",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 10,
          marginBottom: 10
        }}
      >
        {messages.length === 0 && (
          <p className="muted">
            Kuch bhi poocho, jaise "Day 2 mein kya change karein?" ya "Saste hotel kahan milenge?"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === "user" ? "right" : "left", margin: "8px 0" }}>
            <span
              style={{
                display: "inline-block",
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius: 12,
                whiteSpace: "pre-wrap",
                textAlign: "left",
                background: m.role === "user" ? "#2563eb" : "#e5e7eb",
                color: m.role === "user" ? "#fff" : "#222"
              }}
            >
              {m.content}
            </span>
          </div>
        ))}
        {busy && <p className="muted">Soch raha hai...</p>}
        <div ref={endRef} />
      </div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={send} className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Apna sawal likho..."
          style={{ flex: 1, margin: 0 }}
        />
        <button disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}