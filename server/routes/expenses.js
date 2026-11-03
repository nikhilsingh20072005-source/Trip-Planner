const router = require("express").Router();
const mongoose = require("mongoose");
const { z } = require("zod");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const Trip = require("../models/Trip");
const User = require("../models/User");
const Expense = require("../models/Expense");
const { idOf } = require("../utils/split");
const { computeBalances, settle } = require("../utils/settle");

router.use(auth);

const memberIds = (trip) => [idOf(trip.owner), ...trip.members.map(idOf)];

// Trip tabhi milegi jab user owner ya member ho
async function loadTrip(tripId, uid) {
  if (!mongoose.isValidObjectId(tripId)) return null;
  const trip = await Trip.findById(tripId);
  return trip && memberIds(trip).includes(uid) ? trip : null;
}

const expenseSchema = z.object({
  tripId: z.string(),
  description: z.string().trim().min(1, "kharche ka naam likho").max(100),
  amount: z.number().positive("amount 0 se zyada ho").max(10000000),
  category: z.enum(["food", "stay", "travel", "tickets", "shopping", "other"]).default("other"),
  paidBy: z.string().optional()
});

// POST /api/expenses : kharcha add (sab current members mein barabar bantega)
router.post("/", validate(expenseSchema), async (req, res) => {
  try {
    const { tripId, description, amount, category } = req.body;
    const trip = await loadTrip(tripId, req.user.id);
    if (!trip) return res.status(404).json({ message: "Trip nahi mili" });

    const ids = memberIds(trip);
    const paidBy = req.body.paidBy || req.user.id;
    if (!ids.includes(paidBy)) return res.status(400).json({ message: "paidBy trip ka member hona chahiye" });

    const expense = await Expense.create({
      trip: trip._id,
      description,
      amount,
      category,
      paidBy,
      splitAmong: ids,
      createdBy: req.user.id
    });
    res.json(expense);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Kharcha add nahi hua" });
  }
});

// GET /api/expenses/trip/:tripId : list + balances + settlements
router.get("/trip/:tripId", async (req, res) => {
  try {
    const trip = await loadTrip(req.params.tripId, req.user.id);
    if (!trip) return res.status(404).json({ message: "Trip nahi mili" });

    const expenses = await Expense.find({ trip: trip._id }).sort("-createdAt");
    const net = computeBalances(expenses);

    // Naam dikhane ke liye: members + wo log jo kharche mein aaye (hata diye gaye members bhi)
    const allIds = new Set([...memberIds(trip), ...Object.keys(net)]);
    const users = await User.find({ _id: { $in: [...allIds] } }, "name");
    const name = Object.fromEntries(users.map((u) => [String(u._id), u.name]));
    const who = (id) => ({ id, name: name[id] || "Removed user" });

    const byCategory = {};
    let total = 0;
    expenses.forEach((e) => {
      total += e.amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    const isOwner = idOf(trip.owner) === req.user.id;
    res.json({
      total,
      byCategory,
      expenses: expenses.map((e) => ({
        _id: e._id,
        description: e.description,
        amount: e.amount,
        category: e.category,
        paidBy: who(String(e.paidBy)),
        date: e.createdAt,
        canDelete: isOwner || String(e.createdBy) === req.user.id
      })),
      balances: Object.entries(net).map(([id, v]) => ({ ...who(id), net: v / 100 })),
      settlements: settle(net).map((s) => ({ from: who(s.from), to: who(s.to), amount: s.amount }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Expenses load nahi hue" });
  }
});

// DELETE /api/expenses/:id : jisne daala wo ya trip owner
router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Not found" });
  const trip = await loadTrip(String(expense.trip), req.user.id);
  if (!trip) return res.status(404).json({ message: "Not found" });
  if (idOf(trip.owner) !== req.user.id && String(expense.createdBy) !== req.user.id)
    return res.status(403).json({ message: "Aap ye kharcha delete nahi kar sakte" });
  await expense.deleteOne();
  res.json({ ok: true });
});

module.exports = router;