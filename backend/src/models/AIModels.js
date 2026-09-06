const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AITransactionAnalysis = sequelize.define('AITransactionAnalysis', {
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
    riskLevel: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        allowNull: false
    },
    riskScore: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    riskFactors: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    recommendation: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    evidence: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    anomalyDetected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    rawAIResponse: {
        type: DataTypes.JSON,
        allowNull: true
    },
    cachedUntil: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'ai_transaction_analyses',
    timestamps: true
});

const AIRouteRecommendation = sequelize.define('AIRouteRecommendation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sourceNode: {
        type: DataTypes.STRING,
        allowNull: false
    },
    destinationNode: {
        type: DataTypes.STRING,
        allowNull: false
    },
    recommendedRoute: {
        type: DataTypes.JSON,
        allowNull: false
    },
    alternativeRoute: {
        type: DataTypes.JSON,
        allowNull: false
    },
    expectedLatencyMs: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    reliabilityScore: {
        type: DataTypes.FLOAT,
        defaultValue: 1.0
    },
    reasoning: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'ai_route_recommendations',
    timestamps: true
});

const AINetworkInsight = sequelize.define('AINetworkInsight', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    insightType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        defaultValue: 'LOW'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    evidence: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    recommendation: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'ai_network_insights',
    timestamps: true
});

const AIIncident = sequelize.define('AIIncident', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    incidentCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    severity: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    probableCause: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    affectedNodes: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    affectedTransactionsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    evidence: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    recommendedAction: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'INVESTIGATING', 'RESOLVED'),
        defaultValue: 'OPEN'
    }
}, {
    tableName: 'ai_incidents',
    timestamps: true
});

const AIConversation = sequelize.define('AIConversation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sessionId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userVpa: {
        type: DataTypes.STRING,
        allowNull: true
    },
    question: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    intent: {
        type: DataTypes.STRING,
        allowNull: true
    },
    retrievedContext: {
        type: DataTypes.JSON,
        allowNull: true
    },
    aiResponse: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    latencyMs: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'ai_conversations',
    timestamps: true
});

module.exports = {
    AITransactionAnalysis,
    AIRouteRecommendation,
    AINetworkInsight,
    AIIncident,
    AIConversation
};
