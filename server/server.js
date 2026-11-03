require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const app = express();
app.set("trust proxy", 1); // Render jaise hosting ke peeche sahi IP milne ke liye

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));

// Razorpay webhook ko raw body chahiye (signature check ke liye), isliye json se pehle
app.use("/api/payments/webhook", express.raw({ type: "*/*" }));
app.use(express.json({ limit: "100kb" }));

const limiter = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { message } });

app.use("/api", limiter(15 * 60 * 1000, 300, "Bahut zyada requests, thodi der baad try karo"));
app.use("/api/auth", limiter(15 * 60 * 1000, 20, "Bahut zyada login attempts, baad mein try karo"));
app.use("/api/ai", limiter(60 * 1000, 10, "AI requests bahut tez hain, ek minute ruko"));

app.get("/", (req, res) => res.send("Trip Planner API running"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/trips", require("./routes/trips"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/expenses", require("./routes/expenses"));

app.use((req, res) => res.status(404).json({ message: "Route nahi mila" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

connectDB()
  .then(() => app.listen(process.env.PORT || 5000, () => console.log("Server started")))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });