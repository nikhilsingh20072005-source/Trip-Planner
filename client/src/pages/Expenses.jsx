import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

const CATS = ["food", "stay", "travel", "tickets", "shopping", "other"];
const rupee = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function Expenses() {
  const { id } = useParams();
  const me = JSON.parse(localStorage.getItem("user") || "null");
  const [trip, setTrip] = useState(null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ description: "", amount: "", category: "food", paidBy: me?.id || "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get(`/expenses/trip/${id}`).then((r) => setData(r.data)).catch(() => setError("Expenses load nahi hue"));

  useEffect(() => {
    api.get(`/trips/${id}`).then((r) => setTrip(r.data)).catch(() => setError("Trip nahi mili"));
    load();
  }, [id]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/expenses", {
        tripId: id,
        description: form.description,
        amount: Number(form.amount),
        category: form.category,
        paidBy: form.paidBy
      });
      setForm({ ...form, description: "", amount: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Kharcha add nahi hua");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (eid) => {
    if (!confirm("Ye kharcha delete karna hai?")) return;
    try {
      await api.delete(`/expenses/${eid}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete nahi hua");
    }
  };

  if (!trip || !data) return <div className="container">{error || "Loading..."}</div>;
  const people = [trip.owner, ...trip.members];

  return (
    <div className="container">
      <Link to={`/trip/${id}`}>← Back to trip</Link>
      <h2>Expenses: {trip.destination}</h2>

      <div className="card">
        <h3>Kharcha add karo</h3>
        <form onSubmit={add}>
          <label>Kis cheez pe</label>
          <input name="description" value={form.description} onChange={change} placeholder="Dinner at beach shack" required />
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Amount (₹)</label>
              <input name="amount" type="number" min="1" step="0.01" value={form.amount} onChange={change} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Category</label>
              <select name="category" value={form.category} onChange={change} style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Kisne diya</label>
              <select name="paidBy" value={form.paidBy} onChange={change} style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}>
                {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <button disabled={busy}>{busy ? "Adding..." : "Add expense"}</button>
          <span className="muted"> Kharcha sab members mein barabar baantega.</span>
        </form>
      </div>

      <div className="card">
        <h3>Kaun kisko dega</h3>
        {data.settlements.length === 0 && <p className="muted">Sab barabar hai ✅</p>}
        {data.settlements.map((s, i) => (
          <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
            <strong>{s.from.name}</strong> → <strong>{s.to.name}</strong>: <span style={{ color: "#16a34a" }}>{rupee(s.amount)}</span>
          </div>
        ))}
        {data.balances.length > 0 && (
          <p className="muted" style={{ marginTop: 10 }}>
            {data.balances.map((b) => `${b.name}: ${b.net >= 0 ? "+" : "-"}${rupee(Math.abs(b.net))}`).join("  ·  ")}
          </p>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>Saare kharche</h3>
          <strong>Total {rupee(data.total)}</strong>
        </div>
        {data.expenses.length === 0 && <p className="muted">Abhi koi kharcha nahi.</p>}
        {data.expenses.map((e) => (
          <div key={e._id} className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <span>
              {e.description} <span className="muted">· {e.category} · {e.paidBy.name} ne diya</span>
            </span>
            <span className="row">
              <strong>{rupee(e.amount)}</strong>
              {e.canDelete && (
                <button className="danger" style={{ padding: "4px 10px" }} onClick={() => remove(e._id)}>
                  Delete
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}