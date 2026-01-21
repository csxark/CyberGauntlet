const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { teamName, email, password } = req.body;

  if (!teamName || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const exists = await User.findOne({ $or: [{ email }, { teamName }] });
  if (exists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    teamName,
    email,
    password: hashedPassword
  });

  res.status(201).json({ message: "Registered successfully" });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid email" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid password" });
  }

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      teamName: user.teamName
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,        // true in production (HTTPS)
    sameSite: "strict",
    maxAge: 60 * 60 * 1000
  });

  res.json({
    message: "Login successful",
    teamName: user.teamName,
    email: user.email
  });
};
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "strict",
    secure: false
  });

  res.json({ message: "Logout successful" });
};
