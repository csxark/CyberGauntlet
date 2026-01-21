const express = require("express");
const { register, login, logout } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);

router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({
    message: "Dashboard data",
    user: req.user
  });
});

module.exports = router;
