const mongoose = require("mongoose");
module.exports = mongoose.model("Trip", new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  destination: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  budget: Number,
  interests: [String],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  itinerary: { type: String, default: "" },
  status: { type: String, enum: ["planning", "booked", "completed"], default: "planning" }
}, { timestamps: true }));
