const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

exports.sendWelcomeMail = async (email, teamName) => {
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Welcome to CyberGauntlet 🎉",
    html: `
      <h2>Welcome to CyberGauntlet 🎯</h2>
      <p>Hi <b>${teamName}</b>,</p>
      <p>Your registration was successful.</p>
      <p>You can now log in and access your dashboard.</p>
      <br/>
      <p>🚀 Happy hacking!<br/>CyberGauntlet Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};
