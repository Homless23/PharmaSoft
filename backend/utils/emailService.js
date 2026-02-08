const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    try {
        console.log("🔌 Connecting to Gmail SMTP (Port 587)...");
        
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,              // <--- CHANGED TO 587 (TLS)
            secure: false,          // <--- CHANGED TO FALSE (StartTLS)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // Helps with some cloud SSL issues
            }
        });

        const mailOptions = {
            from: `"ExpenseTracker Admin" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text
        };

        console.log(`📤 Sending email to: ${to}`);
        const info = await transporter.sendMail(mailOptions);
        
        console.log("✅ Email sent successfully! Message ID:", info.messageId);
        return true;
    } catch (error) {
        console.error("❌ EMAIL FAILED:", error);
        return false;
    }
};

module.exports = sendEmail;