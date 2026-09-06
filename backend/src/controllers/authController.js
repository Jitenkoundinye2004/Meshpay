const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendEmail } = require('../services/emailService');

// Generate JWT
const generateToken = (vpa) => {
    return jwt.sign({ vpa, id: vpa }, process.env.JWT_SECRET || 'super_secret_meshpay_jwt_token_key_2026', {
        expiresIn: '30d',
    });
};

// Helper to generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Send OTP for Registration
// @route   POST /api/auth/send-register-otp
// @access  Public
const sendRegisterOtp = async (req, res) => {
    try {
        const { email, vpa } = req.body;
        
        if (!email || !vpa) {
            return res.status(400).json({ error: 'Please provide email and vpa' });
        }

        const emailLower = email.toLowerCase().trim();
        const vpaLower = vpa.toLowerCase().trim();
        
        // Check if user exists
        const emailExists = await User.findOne({ where: { email: emailLower } });
        if (emailExists) return res.status(400).json({ error: 'Email is already registered' });
        
        const vpaExists = await User.findOne({ where: { vpa: vpaLower } });
        if (vpaExists) return res.status(400).json({ error: 'VPA is already taken' });

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save/Update OTP in SQLite
        const existingOtp = await OTP.findOne({ where: { email: emailLower, type: 'REGISTER' } });
        if (existingOtp) {
            existingOtp.otp = otpCode;
            existingOtp.expiresAt = expiresAt;
            await existingOtp.save();
        } else {
            await OTP.create({
                email: emailLower,
                type: 'REGISTER',
                otp: otpCode,
                expiresAt
            });
        }

        // Send Email (Graceful fallback if SMTP is unconfigured)
        try {
            await sendEmail(
                emailLower, 
                'MeshPay - Registration Verification Code', 
                `Your MeshPay verification code is: ${otpCode}. It expires in 5 minutes.`,
                `<p>Your MeshPay verification code is: <strong>${otpCode}</strong>. It expires in 5 minutes.</p>`
            );
        } catch (mailErr) {
            console.warn(`⚠️ SMTP delivery unconfigured or failed (${mailErr.message}). Falling back to dev OTP logging.`);
        }

        console.log(`\n========================================`);
        console.log(`🔑 REGISTRATION OTP FOR ${emailLower}: ${otpCode}`);
        console.log(`========================================\n`);

        res.status(200).json({ 
            message: 'OTP sent successfully to email',
            devOtp: process.env.SMTP_HOST ? undefined : otpCode
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { vpa, email, holderName, password, pin, publicKey, otp } = req.body;

        if (!vpa || !email || !holderName || !password || !pin || !publicKey) {
            return res.status(400).json({ error: 'Please fill in all required registration fields.' });
        }

        const emailLower = email.toLowerCase().trim();
        const vpaLower = vpa.toLowerCase().trim();

        // Validations
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailLower)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        if (!/^\d{4}$/.test(pin.toString())) {
            return res.status(400).json({ error: 'Offline PIN must be exactly 4 digits' });
        }

        // Verify OTP if provided
        if (otp) {
            const validOtp = await OTP.findOne({ 
                where: {
                    email: emailLower, 
                    type: 'REGISTER',
                    otp: String(otp),
                    expiresAt: { [Op.gt]: new Date() }
                }
            });

            if (validOtp) {
                await OTP.destroy({ where: { id: validOtp.id } });
            }
        }

        // Check duplicate VPA / Email
        const vpaExists = await User.findOne({ where: { vpa: vpaLower } });
        const emailExists = await User.findOne({ where: { email: emailLower } });
        
        if (vpaExists) return res.status(400).json({ error: 'VPA is already taken' });
        if (emailExists) return res.status(400).json({ error: 'Email is already registered' });

        // Hash password & PIN
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const pinHash = await bcrypt.hash(pin.toString(), salt);

        // Create user
        const user = await User.create({
            vpa: vpaLower,
            email: emailLower,
            holderName,
            passwordHash,
            pinHash,
            publicKey,
            balance: 1000.00
        });

        if (user) {
            await OTP.destroy({ where: { email: emailLower, type: 'REGISTER' } });

            res.status(201).json({
                _id: user.vpa,
                vpa: user.vpa,
                email: user.email,
                holderName: user.holderName,
                balance: user.balance,
                token: generateToken(user.vpa)
            });
        } else {
            res.status(400).json({ error: 'Invalid user data' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

        if (user && (await bcrypt.compare(password, user.passwordHash))) {
            res.json({
                _id: user.vpa,
                vpa: user.vpa,
                email: user.email,
                holderName: user.holderName,
                balance: user.balance,
                token: generateToken(user.vpa)
            });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json(req.user);
};

// @desc    Forgot Password (Send OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const emailLower = email.toLowerCase().trim();
        const user = await User.findOne({ where: { email: emailLower } });
        if (!user) {
            return res.status(200).json({ message: 'If the email exists, an OTP has been sent' });
        }

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const existingOtp = await OTP.findOne({ where: { email: emailLower, type: 'RESET_PASSWORD' } });
        if (existingOtp) {
            existingOtp.otp = otpCode;
            existingOtp.expiresAt = expiresAt;
            await existingOtp.save();
        } else {
            await OTP.create({
                email: emailLower,
                type: 'RESET_PASSWORD',
                otp: otpCode,
                expiresAt
            });
        }

        try {
            await sendEmail(
                emailLower, 
                'MeshPay - Password Reset Code', 
                `Your password reset code is: ${otpCode}. It expires in 5 minutes.`,
                `<p>Your password reset code is: <strong>${otpCode}</strong>. It expires in 5 minutes.</p>`
            );
        } catch (mailErr) {
            console.warn(`⚠️ SMTP delivery unconfigured. Password Reset OTP logged to console.`);
        }

        console.log(`\n========================================`);
        console.log(`🔑 PASSWORD RESET OTP FOR ${emailLower}: ${otpCode}`);
        console.log(`========================================\n`);

        res.status(200).json({ 
            message: 'If the email exists, an OTP has been sent',
            devOtp: process.env.SMTP_HOST ? undefined : otpCode
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        const emailLower = email.toLowerCase().trim();
        const validOtp = await OTP.findOne({ 
            where: {
                email: emailLower, 
                type: 'RESET_PASSWORD',
                otp: String(otp),
                expiresAt: { [Op.gt]: new Date() }
            }
        });

        if (!validOtp) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const user = await User.findOne({ where: { email: emailLower } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        await OTP.destroy({ where: { id: validOtp.id } });

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Forgot UPI PIN (Send OTP)
// @route   POST /api/auth/forgot-pin
// @access  Public
const forgotPin = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const emailLower = email.toLowerCase().trim();
        const user = await User.findOne({ where: { email: emailLower } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const existingOtp = await OTP.findOne({ where: { email: emailLower, type: 'RESET_PIN' } });
        if (existingOtp) {
            existingOtp.otp = otpCode;
            existingOtp.expiresAt = expiresAt;
            await existingOtp.save();
        } else {
            await OTP.create({
                email: emailLower,
                type: 'RESET_PIN',
                otp: otpCode,
                expiresAt
            });
        }

        try {
            await sendEmail(
                emailLower, 
                'MeshPay - UPI PIN Reset Code', 
                `Your offline transaction PIN reset code is: ${otpCode}. It expires in 5 minutes.`,
                `<p>Your offline transaction PIN reset code is: <strong>${otpCode}</strong>. It expires in 5 minutes.</p>`
            );
        } catch (mailErr) {
            console.warn(`⚠️ SMTP delivery unconfigured. PIN Reset OTP logged to console.`);
        }

        console.log(`\n========================================`);
        console.log(`🔑 PIN RESET OTP FOR ${emailLower}: ${otpCode}`);
        console.log(`========================================\n`);

        res.status(200).json({ 
            message: 'OTP sent to email',
            devOtp: process.env.SMTP_HOST ? undefined : otpCode
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// @desc    Reset UPI PIN
// @route   POST /api/auth/reset-pin
// @access  Public
const resetPin = async (req, res) => {
    try {
        const { email, otp, newPin } = req.body;
        if (!email || !otp || !newPin) return res.status(400).json({ error: 'Missing required fields' });

        if (!/^\d{4}$/.test(newPin.toString())) {
            return res.status(400).json({ error: 'Offline PIN must be exactly 4 digits' });
        }

        const emailLower = email.toLowerCase().trim();
        const validOtp = await OTP.findOne({ 
            where: {
                email: emailLower, 
                type: 'RESET_PIN',
                otp: String(otp),
                expiresAt: { [Op.gt]: new Date() }
            }
        });

        if (!validOtp) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const user = await User.findOne({ where: { email: emailLower } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const salt = await bcrypt.genSalt(10);
        user.pinHash = await bcrypt.hash(newPin.toString(), salt);
        await user.save();

        await OTP.destroy({ where: { id: validOtp.id } });

        res.status(200).json({ message: 'UPI PIN reset successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    sendRegisterOtp,
    registerUser,
    loginUser,
    getMe,
    forgotPassword,
    resetPassword,
    forgotPin,
    resetPin
};
