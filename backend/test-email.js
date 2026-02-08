require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // Trying a different port (TLS)
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function main() {
    try {
        console.log("Testing email credentials...");
        console.log("User:", process.env.EMAIL_USER);
        
        let info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Sending to yourself
            subject: "Test Email from Localhost",
            text: "If you see this, your password and code are working! The issue is the Cloud Server."
        });

        console.log("✅ Message sent: %s", info.messageId);
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();