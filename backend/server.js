const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

connectDB();

const app = express();

app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.get("/test", (req, res) => {
  res.send("Server OK");
});


app.listen(process.env.PORT, () =>
  console.log(`Server running on ${process.env.PORT}`)
);
