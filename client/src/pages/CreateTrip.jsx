import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function CreateTrip() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    destination: "",
    days: 3,
    budget: "",
    startDate: "",
    interests: ""
  });
  const [useAI, setUseAI] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const interests = form.interests.split(",").map((s) => s.trim()).filter(Boolean);
      let endDate;
      if (form.startDate) {
        const d = new Date(form.startDate);
        d.setDate(d.getDate() + Number(form.days) - 1);
        endDate = d;
      }
      const { data: trip } = await api.post("/trips", {
        destination: form.destination,
        budget: Number(form.budget) || 0,
        startDate: form.startDate || undefined,
        endDate,
        interests
      });

      if (useAI) {
        try {
          await api.post("/ai/itinerary", {
            tripId: trip._id,
            destination: form.destination,
            days: Number(form.days),
            budget: Number(form.budget) || 0,
            interests
          });
        } catch (err) {
          alert(
            "Trip ban gayi, par AI plan nahi bana: " +
              (err.response?.data?.message || err.message)
          );
        }
      }
      nav(`/trip/${trip._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Trip nahi ban payi");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>New Trip</h2>
      <div className="card">
        <form onSubmit={submit}>
          <label>Destination</label>
          <input name="destination" value={form.destination} onChange={change} placeholder="Goa" required />
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Kitne din</label>
              <input name="days" type="number" min="1" max="30" value={form.days} onChange={change} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Budget (₹)</label>
              <input name="budget" type="number" min="0" value={form.budget} onChange={change} placeholder="15000" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Start date</label>
              <input name="startDate" type="date" value={form.startDate} onChange={change} />
            </div>
          </div>
          <label>Interests (comma se alag karo)</label>
          <input name="interests" value={form.interests} onChange={change} placeholder="beach, food, history" />
          <label className="row" style={{ marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              style={{ width: "auto", margin: 0 }}
            />
            AI se itinerary banao
          </label>
          {error && <div className="error">{error}</div>}
          <button disabled={loading}>
            {loading ? "Ban raha hai... (AI mein 10-20 sec lag sakte hain)" : "Create Trip"}
          </button>
        </form>
      </div>
    </div>
  );
}