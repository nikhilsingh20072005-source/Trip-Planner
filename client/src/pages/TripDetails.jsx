import { useEffect, useState } from "react";
import TripChat from "../components/TripChat";
import { useParams, Link } from "react-router-dom";
import api from "../api";

export default function TripDetails() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/trips/${id}`)
      .then((r) => {
        setTrip(r.data);
        if (r.data.startDate && r.data.endDate) {
          const diff =
            Math.round((new Date(r.data.endDate) - new Date(r.data.startDate)) / 86400000) + 1;
          if (diff > 0) setDays(diff);
        }
      })
      .catch(() => setError("Trip nahi mili"));
  }, [id]);

  const generate = async () => {
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/ai/itinerary", {
        tripId: id,
        destination: trip.destination,
        days: Number(days),
        budget: trip.budget,
        interests: trip.interests
      });
      setTrip({ ...trip, itinerary: data.itinerary });
    } catch (err) {
      setError(err.response?.data?.message || "AI plan nahi bana");
    } finally {
      setBusy(false);
    }
  };

  if (error && !trip) return <div className="container error">{error}</div>;
  if (!trip) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <Link to="/">← Back</Link>
      <h2>{trip.destination}</h2>
      <div className="card">
        <div className="muted">
          Budget: ₹{trip.budget || "-"} · Status: {trip.status}
          {trip.interests?.length > 0 && <> · Interests: {trip.interests.join(", ")}</>}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <input
            type="number"
            min="1"
            max="30"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            style={{ width: 80, margin: 0 }}
          />
          <span className="muted">din</span>
          <button disabled={busy} onClick={generate}>
            {busy ? "AI soch raha hai..." : trip.itinerary ? "Plan dobara banao" : "AI se plan banao"}
          </button>
          <Link className="btn" to={`/pay/${trip._id}`} style={{ background: "#16a34a" }}>
            Pay
          </Link>
          <Link className="btn" to={`/expenses/${trip._id}`} style={{ background: "#7c3aed" }}>
            Expenses
          </Link>
        </div>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="card">
        <h3>Itinerary</h3>
        {trip.itinerary ? (
          <div className="itinerary">{trip.itinerary}</div>
        ) : (
          <p className="muted">Abhi plan nahi bana. Upar button se AI plan banao.</p>
        )}
      </div>
      <TripChat tripId={id} />
    </div>
  );
}