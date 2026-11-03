const router = require("express").Router();
const mongoose = require("mongoose");
const { z } = require("zod");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const Trip = require("../models/Trip");
const User = require("../models/User");
const { getSplit, idOf } = require("../utils/split");

router.use(auth);
router.param("id", (req, res, next, id) =>
  mongoose.isValidObjectId(id) ? next() : res.status(404).json({ message: "Not found" })
);

const hasAccess = (trip, uid) =>
  idOf(trip.owner) === uid || trip.members.some((m) => idOf(m) === uid);

const tripSchema = z.object({
  destination: z.string().trim().min(2).max(80),
  budget: z.number().min(0).max(10000000).default(0),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  interests: z.array(z.string().trim().min(1).max(30)).max(10).default([])
});
const memberSchema = z.object({ email: z.string().trim().toLowerCase().email("sahi email daalo") });

router.post("/", validate(tripSchema), async (req, res) => {
  const trip = await Trip.create({ ...req.body, owner: req.user.id });
  res.json(trip);
});

router.get("/", async (req, res) => {
  res.json(
    await Trip.find({ $or: [{ owner: req.user.id }, { members: req.user.id }] }).sort("-createdAt")
  );
});

router.get("/:id", async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate("owner members", "name email");
  if (!trip || !hasAccess(trip, req.user.id)) return res.status(404).json({ message: "Not found" });
  res.json(trip);
});

router.delete("/:id", async (req, res) => {
  await Trip.deleteOne({ _id: req.params.id, owner: req.user.id });
  res.json({ ok: true });
});

router.post("/:id/members", validate(memberSchema), async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, owner: req.user.id });
  if (!trip) return res.status(404).json({ message: "Trip nahi mili ya aap owner nahi ho" });

  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "Is email se koi user registered nahi hai" });

  const uid = String(user._id);
  if (uid === String(trip.owner) || trip.members.some((m) => String(m) === uid))
    return res.status(400).json({ message: "Ye user pehle se trip mein hai" });

  trip.members.push(user._id);
  await trip.save();
  res.json({ ok: true });
});

router.delete("/:id/members/:userId", async (req, res) => {
  const trip = await Trip.findOne({ _id: req.params.id, owner: req.user.id });
  if (!trip) return res.status(404).json({ message: "Trip nahi mili ya aap owner nahi ho" });
  trip.members = trip.members.filter((m) => String(m) !== req.params.userId);
  await trip.save();
  res.json({ ok: true });
});

router.get("/:id/split", async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate("owner members", "name email");
  if (!trip || !hasAccess(trip, req.user.id)) return res.status(404).json({ message: "Not found" });

  const split = await getSplit(trip);
  const people = [trip.owner, ...trip.members];
  res.json({
    total: split.total,
    share: split.share,
    isOwner: idOf(trip.owner) === req.user.id,
    members: people.map((p) => {
      const uid = String(p._id);
      return {
        _id: p._id,
        name: p.name,
        email: p.email,
        isOwner: uid === idOf(trip.owner),
        share: split.share,
        paid: split.paidOf(uid),
        due: split.dueOf(uid)
      };
    })
  });
});

module.exports = router;