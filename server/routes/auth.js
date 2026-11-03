const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");
const validate = require("../middleware/validate");

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const email = z.string().trim().toLowerCase().email("sahi email daalo");
const registerSchema = z.object({
  name: z.string().trim().min(2, "kam se kam 2 akshar").max(50),
  email,
  password: z.string().min(6, "kam se kam 6 characters").max(100)
});
const loginSchema = z.object({ email, password: z.string().min(1).max(100) });

router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: "Email already used" });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.json({ token: sign(user), user: { id: user._id, name, email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Wrong email or password" });
    res.json({ token: sign(user), user: { id: user._id, name: user.name, email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;