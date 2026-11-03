const mongoose = require("mongoose");
module.exports = mongoose.model("Payment", new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  status: { type: String, enum: ["created", "paid", "failed"], default: "created" }
}, { timestamps: true }));
