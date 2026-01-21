


const { supabase } = require("../lib/supabase");
const { sendWelcomeMail } = require("../utils/sendMail");


exports.register = async (req, res) => {

  

  const { teamName, email, password } = req.body;

  if (!teamName || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
   

  try {
    const { teamName, email, password } = req.body;

    
    if (!teamName || !email || !password) {
      return res.status(400).json({
        message: "All fields (teamName, email, password) are required"
      });
    }

  

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, 

      user_metadata: { teamName }
    });

    if (error) {
      console.error(" Supabase error:", error.message);
      return res.status(400).json({ message: error.message });
    }

    

    //Send welcome mail manually
    try {
      await sendWelcomeMail(email, teamName);
      console.log(" Welcome email sent to:", email);
    } catch (mailErr) {
      console.error(" Email sending failed:", mailErr.message);
      
    }

    return res.status(201).json({
      message: "Registered successfully. Welcome email sent.",

      user_metadata: {
        teamName
      }
    });

    if (error) {
      return res.status(400).json({
        message: error.message
      });
    }

    
    return res.status(201).json({
      message: "Registered successfully. Welcome email sent!",

      userId: data.user.id
    });

  } catch (err) {

    console.error("Register crash:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

    console.error("Register error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }


  const accessToken = data.session.access_token;

  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000
  });

  res.json({
    message: "Login successful",
    email: data.user.email,
    teamName: data.user.user_metadata?.teamName
  });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        message: error.message
      });
    }

    // Supabase access token
    const accessToken = data.session.access_token;

    // Store token in HttpOnly cookie
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: false, // true in production (HTTPS)
      sameSite: "strict",
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    return res.json({
      message: "Login successful",
      email: data.user.email,
      teamName: data.user.user_metadata?.teamName
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  }

};


exports.logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "strict",
    secure: false
  });

  return res.json({
    message: "Logout successful"
  });
};
