const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    vpa: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        set(val) {
            this.setDataValue('vpa', val ? val.toLowerCase().trim() : val);
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        set(val) {
            this.setDataValue('email', val ? val.toLowerCase().trim() : val);
        }
    },
    holderName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    pinHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    balance: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.00
    },
    publicKey: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true
});

module.exports = User;
