import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function Payment() {
  const { id } = useParams();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [trip, setTrip] = useState(null);
  const [split, setSplit] = useState(null);
  const [amount, setAmount] = useState("");
  const [payments, setPayments] = useState([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const loadPayments = () =>
    api.get(`/payments/trip/${id}`).then((r) => setPayments(r.data)).catch(() => {});

  const loadSplit = () =>
    api
      .get(`/trips/${id}/split`)
      .then((r) => {
        setSplit(r.data);
        const me = r.data.members.find((m) => String(m._id) === user?.id);
        setAmount(me && me.due > 0 ? me.due : "");
      })
      .catch(() => {});

  useEffect(() => {
    api.get(`/trips/${id}`).then((r) => setTrip(r.data)).catch(() => setError("Trip nahi mili"));
    loadPayments();
    loadSplit();
  }, [id]);

  const addMember = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/trips/${id}/members`, { email });
      setEmail("");
      loadSplit();
    } catch (err) {
      setError(err.response?.data?.message || "Member add nahi hua");
    }
  };

  const removeMember = async (uid) => {
    if (!confirm("Is member ko hataana hai?")) return;
    await api.delete(`/trips/${id}/members/${uid}`);
    loadSplit();
  };

  const pay = async () => {
    setError("");
    setMsg("");
    if (!amount || Number(amount) < 1) return setError("Kam se kam ₹1 daalo");
    setBusy(true);
    try {
      if (!(await loadRazorpay()))
        throw new Error("Razorpay script load nahi hui (internet check karo)");

      const { data } = await api.post("/payments/order", { tripId: id, amount: Number(amount) });

      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.order.amount,
        currency: "INR",
        order_id: data.order.id,
        name: "TripPlanner",
        description: `Share for ${trip.destination}`,
        prefill: { name: user?.name, email: user?.email },
        handler: async (resp) => {
          try {
            await api.post("/payments/verify", resp);
            setMsg("Payment successful ✅");
          } catch {
            setError("Payment verify nahi hui");
          }
          loadPayments();
          loadSplit();
          setBusy(false);
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            loadPayments();
          }
        }
      });
      rzp.on("payment.failed", () => {
        setError("Payment fail ho gayi");
        loadPayments();
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setBusy(false);
    }
  };

  if (!trip) return <div className="container">{error || "Loading..."}</div>;

  return (
    <div className="container">
      <Link to={`/trip/${id}`}>← Back to trip</Link>
      <h2>Payment: {trip.destination}</h2>

      {/* Group split */}
      <div className="card">
        <h3>Group split</h3>
        {split && split.total === 0 && (
          <p className="error">Trip ka budget 0 hai. Split ke liye trip banate waqt total budget daalna zaroori hai.</p>
        )}
        {split && (
          <>
            <p className="muted">
              Total: ₹{split.total} · {split.members.length} log · Har ek ka hissa: ₹{split.share}
            </p>
            {split.members.map((m) => (
              <div
                key={m._id}
                className="row"
                style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}
              >
                <span>
                  {m.name} {m.isOwner && <span className="muted">(owner)</span>}
                  {String(m._id) === user?.id && <span className="muted"> (you)</span>}
                </span>
                <span className="muted">Paid ₹{m.paid}</span>
                <strong style={{ color: m.due === 0 ? "#16a34a" : "#d97706" }}>
                  {m.due === 0 ? "Done ✅" : `Baaki ₹${m.due}`}
                </strong>
                {split.isOwner && !m.isOwner && (
                  <button className="danger" style={{ padding: "4px 10px" }} onClick={() => removeMember(m._id)}>
                    Remove
                  </button>
                )}
              </div>
            ))}

            {split.isOwner && (
              <form onSubmit={addMember} className="row" style={{ marginTop: 14 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Dost ki registered email"
                  style={{ flex: 1, margin: 0 }}
                  required
                />
                <button>Add member</button>
              </form>
            )}
          </>
        )}
      </div>

      {/* Pay */}
      <div className="card">
        <label>Amount (₹)</label>
        <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button disabled={busy} onClick={pay}>
          {busy ? "Processing..." : `Pay ₹${amount || 0}`}
        </button>
        {msg && <div style={{ color: "#16a34a", marginTop: 8 }}>{msg}</div>}
        {error && <div className="error">{error}</div>}
        <p className="muted">
          Test mode: card 4111 1111 1111 1111, koi bhi future expiry aur CVV, ya UPI id success@razorpay
        </p>
      </div>

      {/* History */}
      <div className="card">
        <h3>Meri payment history</h3>
        {payments.length === 0 && <p className="muted">Abhi koi payment nahi.</p>}
        {payments.map((p) => (
          <div
            key={p._id}
            className="row"
            style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}
          >
            <span>₹{p.amount}</span>
            <span className="muted">{new Date(p.createdAt).toLocaleString()}</span>
            <strong
              style={{
                color: p.status === "paid" ? "#16a34a" : p.status === "failed" ? "#dc2626" : "#d97706"
              }}
            >
              {p.status}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}