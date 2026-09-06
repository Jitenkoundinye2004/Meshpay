const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    packetId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    packetHash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    senderVpa: {
        type: DataTypes.STRING,
        allowNull: false
    },
    receiverVpa: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('SETTLED', 'REJECTED', 'INVALID', 'PENDING'),
        allowNull: false,
        defaultValue: 'SETTLED'
    },
    signedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    settledAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    bridgeNodeId: {
        type: DataTypes.STRING,
        defaultValue: 'Direct-Upload'
    },
    hopCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    failureReason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    riskLevel: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        defaultValue: 'LOW'
    },
    riskScore: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'transactions',
    timestamps: true
});

module.exports = Transaction;
