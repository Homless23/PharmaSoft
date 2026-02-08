const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    try {
        console.log("🔌 Connecting to Gmail SMTP (forcing IPv4)...");
        
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            family: 4 // <--- THIS FIXES THE CRASH (Forces IPv4)
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