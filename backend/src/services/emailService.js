const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = async () => {
    if (transporter) return transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log('📧 Nodemailer configured with production SMTP server');
    } else {
        // Fast local mock transporter for development (Zero external network delay)
        transporter = nodemailer.createTransport({
            jsonTransport: true
        });
        console.log('📧 Nodemailer configured with fast local dev transport');
    }
    return transporter;
};

const sendEmail = async (to, subject, text, html) => {
    try {
        const mailTransporter = await initTransporter();
        const info = await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || '"MeshPay" <noreply@meshpay.test>',
            to,
            subject,
            text,
            html,
        });

        console.log(`📧 Email sent to ${to}: ${subject}`);
        return info;
    } catch (error) {
        console.warn("⚠️ Email delivery warning (falling back to console OTP): ", error.message);
        return { messageId: 'mock-dev-id' };
    }
};

module.exports = {
    sendEmail
};
