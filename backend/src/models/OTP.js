const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OTP = sequelize.define('OTP', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        set(val) {
            this.setDataValue('email', val ? val.toLowerCase().trim() : val);
        }
    },
    otp: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('REGISTER', 'RESET_PASSWORD', 'RESET_PIN'),
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'otps',
    timestamps: true
});

module.exports = OTP;
