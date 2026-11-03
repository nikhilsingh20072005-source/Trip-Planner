import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const nav = useNavigate();
  useLocation(); // route badalne par navbar dobara render ho
  const loggedIn = !!localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  return (
    <nav>
      <span className="brand">TripPlanner</span>
      {loggedIn && (
        <>
          <Link to="/">My Trips</Link>
          <Link to="/create">New Trip</Link>
          <span className="muted" style={{ marginLeft: "auto" }}>{user?.name}</span>
          <button className="secondary" onClick={logout}>Logout</button>
        </>
      )}
    </nav>
  );
}