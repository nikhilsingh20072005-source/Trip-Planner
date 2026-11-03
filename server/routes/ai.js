const router = require("express").Router();
const auth = require("../middleware/auth");
const Trip = require("../models/Trip");
const generate = require("../utils/llm");

// POST /api/ai/itinerary  { tripId, destination, days, budget, interests }
router.post("/itinerary", auth, async (req, res) => {
  try {
    const { tripId, destination, days, budget, interests = [] } = req.body;
    const text = await generate({
      maxTokens: 1500,
      messages: [
        {
          role: "user",
          content: `Plan a ${days}-day trip to ${destination}. Budget: Rs ${budget}. Interests: ${interests.join(", ")}. Give a day-by-day itinerary with approximate costs.`
        }
      ]
    });
    if (tripId) await Trip.updateOne({ _id: tripId, owner: req.user.id }, { itinerary: text });
    res.json({ itinerary: text });
  } catch (e) {
    console.error("AI itinerary error:", e);
    res.status(500).json({ message: e.message });
  }
});

// POST /api/ai/chat  { tripId, messages: [{ role, content }] }
router.post("/chat", auth, async (req, res) => {
  try {
    const { tripId, messages } = req.body;
    const trip = await Trip.findById(tripId);
    const uid = req.user.id;
    const allowed =
      trip && (String(trip.owner) === uid || trip.members.some((m) => String(m) === uid));
    if (!allowed) return res.status(404).json({ message: "Trip nahi mili" });

    let history = (Array.isArray(messages) ? messages : [])
      .filter((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
      .slice(-12);
    while (history.length && history[0].role !== "user") history.shift();
    if (!history.length) return res.status(400).json({ message: "Message khaali hai" });

    const system = `You are a friendly travel assistant inside a trip planner app. Reply in the same language the user writes in (Hinglish is fine). Keep answers short and practical.
Trip details:
- Destination: ${trip.destination}
- Budget: Rs ${trip.budget || "not set"}
- Interests: ${(trip.interests || []).join(", ") || "not set"}
- Current itinerary: ${trip.itinerary || "not generated yet"}`;

    const reply = await generate({ system, messages: history, maxTokens: 800 });
    res.json({ reply });
  } catch (e) {
    console.error("AI chat error:", e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;