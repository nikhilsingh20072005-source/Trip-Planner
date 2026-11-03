// Request body ko zod schema se check karta hai; sirf allowed fields aage jaate hain
module.exports = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) {
    const i = r.error.issues[0];
    const field = i.path.join(".") || "input";
    return res.status(400).json({ message: `${field}: ${i.message}` });
  }
  req.body = r.data;
  next();
};