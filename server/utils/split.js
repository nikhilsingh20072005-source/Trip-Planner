const Payment = require("../models/Payment");

const idOf = (x) => String(x._id || x);

// Trip ka split: har bande ka hissa, kitna paid, kitna baaki
async function getSplit(trip) {
  const ids = [idOf(trip.owner), ...trip.members.map(idOf)];
  const total = trip.budget || 0;
  const share = Math.ceil(total / ids.length);

  const paid = await Payment.aggregate([
    { $match: { trip: trip._id, status: "paid" } },
    { $group: { _id: "$user", total: { $sum: "$amount" } } }
  ]);
  const paidMap = Object.fromEntries(paid.map((p) => [String(p._id), p.total]));

  return {
    total,
    share,
    ids,
    paidOf: (uid) => paidMap[uid] || 0,
    dueOf: (uid) => Math.max(share - (paidMap[uid] || 0), 0)
  };
}

module.exports = { getSplit, idOf };