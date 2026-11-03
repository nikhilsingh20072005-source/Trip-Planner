const router = require("express").Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const auth = require("../middleware/auth");
const Trip = require("../models/Trip");
const Payment = require("../models/Payment");
const { getSplit, idOf } = require("../utils/split");

// Keys na hone par bhi server start ho jaye
const getRzp = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// POST /api/payments/order  { tripId, amount? }
// Amount server tay karta hai: apna baaki hissa. Usse zyada allowed nahi.
router.post("/order", auth, async (req, res) => {
  try {
    const { tripId, amount } = req.body;
    if (!mongoose.isValidObjectId(tripId)) return res.status(400).json({ message: "Galat tripId" });

    const trip = await Trip.findById(tripId);
    const uid = req.user.id;
    const isMember = trip && (idOf(trip.owner) === uid || trip.members.some((m) => idOf(m) === uid));
    if (!isMember) return res.status(404).json({ message: "Trip nahi mili" });

    const split = await getSplit(trip);
    const due = split.dueOf(uid);
    if (due <= 0)
      return res.status(400).json({ message: "Aapka hissa pehle se paid hai (ya trip ka budget set nahi hai)" });

    const pay = amount === undefined || amount === "" ? due : Number(amount);
    if (!Number.isFinite(pay) || pay < 1)
      return res.status(400).json({ message: "Amount kam se kam ₹1 hona chahiye" });
    if (pay > due)
      return res.status(400).json({ message: `Amount aapke baaki hisse (₹${due}) se zyada nahi ho sakta` });

    const order = await getRzp().orders.create({
      amount: Math.round(pay * 100),
      currency: "INR",
      receipt: `${String(trip._id).slice(-8)}-${Date.now()}`
    });
    await Payment.create({ trip: trip._id, user: uid, amount: pay, razorpayOrderId: order.id });
    res.json({ order, key: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error("Razorpay error:", e);
    res.status(500).json({ message: e.error?.description || e.message || "Order nahi bana" });
  }
});

// POST /api/payments/verify : browser se payment ke baad
router.post("/verify", auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, user: req.user.id });
    if (!payment) return res.status(404).json({ message: "Payment record nahi mila" });

    // Webhook pehle paid kar chuka ho to dobara kuch mat badlo
    if (payment.status === "paid") return res.json({ success: true });

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const ok = safeEqual(expected, razorpay_signature);

    payment.status = ok ? "paid" : "failed";
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();
    res.status(ok ? 200 : 400).json({ success: ok });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Verify nahi ho paya" });
  }
});

// POST /api/payments/webhook : Razorpay khud call karta hai (raw body, login nahi)
// Popup beech mein band ho gaya ho tab bhi payment record ho jati hai
router.post("/webhook", async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: "Webhook secret set nahi hai" });

  const sig = req.headers["x-razorpay-signature"];
  const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
  if (!sig || !safeEqual(sig, expected)) return res.status(400).json({ message: "Invalid signature" });

  try {
    const event = JSON.parse(req.body.toString());
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const entity = event.payload?.payment?.entity;
      if (entity?.order_id) {
        await Payment.updateOne(
          { razorpayOrderId: entity.order_id, status: { $ne: "paid" } },
          { status: "paid", razorpayPaymentId: entity.id }
        );
      }
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Bad payload" });
  }
});

// GET /api/payments/trip/:tripId : meri payments
router.get("/trip/:tripId", auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.tripId)) return res.json([]);
  res.json(await Payment.find({ trip: req.params.tripId, user: req.user.id }).sort("-createdAt"));
});

module.exports = router;