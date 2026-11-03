const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Expense",
  new mongoose.Schema(
    {
      trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
      description: { type: String, required: true },
      amount: { type: Number, required: true }, // rupees
      category: { type: String, default: "other" },
      paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      splitAmong: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // us waqt ke members
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
    },
    { timestamps: true }
  )
);