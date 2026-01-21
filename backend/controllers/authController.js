


const { supabase } = require("../lib/supabase");


exports.register = async (req, res) => {
  const { teamName, email, password } = req.body;

  if (!teamName || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      teamName
    }
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  res.status(201).json({
    message: "Registered successfully",
    userId: data.user.id
  });
};

/**
 * LOGIN
 * Supabase validates credentials and returns session
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(401).json({ message: error.message });
  }

  // Access token from Supabase session
  const accessToken = data.session.access_token;

  // Store Supabase JWT in HttpOnly cookie
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: false, // true in production
    sameSite: "strict",
    maxAge: 60 * 60 * 1000
  });

  res.json({
    message: "Login successful",
    email: data.user.email,
    teamName: data.user.user_metadata.teamName
  });
};

/**
 * LOGOUT
 * Clear cookie (Supabase session is stateless on backend)
 */
exports.logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "strict",
    secure: false
  });

  res.json({ message: "Logout successful" });
};
