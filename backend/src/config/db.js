const sequelize = require('./database');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const OTP = require('../models/OTP');
const {
    AITransactionAnalysis,
    AIRouteRecommendation,
    AINetworkInsight,
    AIIncident,
    AIConversation
} = require('../models/AIModels');

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ SQLite Database Connection Established (Sequelize)');
        
        // Sync models (creates tables if they don't exist)
        await sequelize.sync();
        console.log('✅ All Database Schemas & AI Tables Synchronized');
    } catch (error) {
        console.error(`❌ SQLite Database Connection Error: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB;
