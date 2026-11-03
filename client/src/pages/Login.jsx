import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/${mode}`, form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Server se connect nahi ho paya");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 400 }}>
      <div className="card">
        <h2>{mode === "login" ? "Login" : "Register"}</h2>
        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>Name</label>
              <input name="name" value={form.name} onChange={change} required />
            </>
          )}
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={change} required />
          <label>Password</label>
          <input name="password" type="password" value={form.password} onChange={change} required />
          {error && <div className="error">{error}</div>}
          <button disabled={loading} style={{ width: "100%" }}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
        <p className="muted" style={{ textAlign: "center" }}>
          {mode === "login" ? "Naya user?" : "Pehle se account hai?"}{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login" ? "Register karo" : "Login karo"}
          </a>
        </p>
      </div>
    </div>
  );
}