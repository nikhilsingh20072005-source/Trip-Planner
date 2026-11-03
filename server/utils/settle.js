// Sab hisaab paise (integer) mein hota hai, taaki decimal ki galti na ho.

// net[user] > 0 : usse paise milne hain, net[user] < 0 : usse dene hain
function computeBalances(expenses) {
  const net = {};
  const add = (id, v) => (net[id] = (net[id] || 0) + v);

  for (const e of expenses) {
    const paise = Math.round(e.amount * 100);
    const people = e.splitAmong.map(String);
    const base = Math.floor(paise / people.length);
    let rem = paise - base * people.length; // bache hue paise pehle logon mein bante hain
    people.forEach((id) => {
      add(id, -(base + (rem > 0 ? 1 : 0)));
      if (rem > 0) rem--;
    });
    add(String(e.paidBy), paise);
  }
  return net;
}

// Kam se kam transactions mein settle: sabse bade debtor ko sabse bade creditor se match karo
function settle(net) {
  const debtors = [];
  const creditors = [];
  for (const [id, v] of Object.entries(net)) {
    if (v < 0) debtors.push({ id, amt: -v });
    else if (v > 0) creditors.push({ id, amt: v });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const out = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].amt, creditors[j].amt);
    out.push({ from: debtors[i].id, to: creditors[j].id, amount: x / 100 });
    debtors[i].amt -= x;
    creditors[j].amt -= x;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return out;
}

module.exports = { computeBalances, settle };