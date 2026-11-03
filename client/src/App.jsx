import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateTrip from "./pages/CreateTrip";
import TripDetails from "./pages/TripDetails";
import Payment from "./pages/Payment";
import Expenses from "./pages/Expenses";

const Private = ({ children }) =>
  localStorage.getItem("token") ? children : <Navigate to="/login" />;

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Private><Dashboard /></Private>} />
        <Route path="/create" element={<Private><CreateTrip /></Private>} />
        <Route path="/trip/:id" element={<Private><TripDetails /></Private>} />
        <Route path="/expenses/:id" element={<Private><Expenses /></Private>} />
        <Route path="/pay/:id" element={<Private><Payment /></Private>} />
      </Routes>
    </>
  );
}