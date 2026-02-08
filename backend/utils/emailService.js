const nodemailer = require('nodemailer');



const sendEmail = async (to, subject, text) => {

    console.log("Attempting to send email from:", process.env.EMAIL_USER);
    console.log("Using Password (First 3 chars):", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.substring(0, 3) : "UNDEFINED");
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text
        };

        await transporter.sendMail(mailOptions);
        console.log("📧 Email sent successfully to " + to);
    } catch (error) {
        console.error("Email error:", error);
    }
};

module.exports = sendEmail;