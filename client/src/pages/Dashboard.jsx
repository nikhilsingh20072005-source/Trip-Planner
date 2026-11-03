import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get("/trips").then((r) => setTrips(r.data)).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm("Ye trip delete karni hai?")) return;
    await api.delete(`/trips/${id}`);
    load();
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>My Trips</h2>
        <Link className="btn" to="/create">+ New Trip</Link>
      </div>
      {trips.length === 0 && <p className="muted">Abhi koi trip nahi hai. Pehli trip bana lo!</p>}
      {trips.map((t) => (
        <div className="card" key={t._id}>
          <h3>{t.destination}</h3>
          <div className="muted">
            Budget: ₹{t.budget || "-"} · Status: {t.status} ·{" "}
            {t.itinerary ? "AI plan ready" : "Plan nahi bana"}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <Link className="btn" to={`/trip/${t._id}`}>Open</Link>
            <button className="danger" onClick={() => remove(t._id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}