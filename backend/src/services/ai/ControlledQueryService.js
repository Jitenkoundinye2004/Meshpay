const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const mesh = require('../MeshSimulatorService');

class ControlledQueryService {
    async getContextForQuery(question) {
        const q = question.toLowerCase();

        // 1. Fetch aggregated stats safely
        const totalTxCount = await Transaction.count();
        const settledTxCount = await Transaction.count({ where: { status: 'SETTLED' } });
        const rejectedTxCount = await Transaction.count({ where: { status: 'REJECTED' } });
        const invalidTxCount = await Transaction.count({ where: { status: 'INVALID' } });

        const devices = mesh.getDevices();
        const nodeMetrics = devices.map(d => ({
            deviceId: d.deviceId,
            hasInternet: d.hasInternet,
            packetCount: d.packetCount(),
            status: d.hasInternet ? 'BRIDGE' : (d.packetCount() > 3 ? 'CONGESTED' : 'HEALTHY')
        }));

        let recentTransactions = [];
        if (q.includes('tx-') || q.includes('transaction') || q.includes('recent') || q.includes('delayed') || q.includes('failed')) {
            recentTransactions = await Transaction.findAll({
                order: [['createdAt', 'DESC']],
                limit: 10,
                attributes: ['id', 'packetId', 'senderVpa', 'receiverVpa', 'amount', 'status', 'hopCount', 'bridgeNodeId', 'createdAt', 'riskLevel', 'riskScore']
            });
        }

        return {
            totalTxCount,
            settledTxCount,
            failedTxCount: rejectedTxCount + invalidTxCount,
            activeNodesCount: devices.length,
            nodeMetrics,
            recentTransactions: recentTransactions.map(t => t.toJSON()),
            avgRetryCount: 1.2,
            networkReliabilityScore: 0.96
        };
    }
}

module.exports = new ControlledQueryService();
