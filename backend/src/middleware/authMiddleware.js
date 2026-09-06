const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_meshpay_jwt_token_key_2026');

            // Find user by VPA or ID in Sequelize
            const vpaOrId = decoded.vpa || decoded.id;
            req.user = await User.findOne({
                where: { vpa: vpaOrId },
                attributes: { exclude: ['passwordHash', 'pinHash'] }
            });
            
            if (!req.user) {
                return res.status(401).json({ error: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            console.error('Auth middleware error:', error.message);
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ error: 'Not authorized, no token provided' });
    }
};

module.exports = { authMiddleware };
