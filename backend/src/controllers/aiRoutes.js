const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const aiService = require('../services/ai/AIService');
const controlledQuery = require('../services/ai/ControlledQueryService');
const incidentService = require('../services/ai/AIIncidentService');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mesh = require('../services/MeshSimulatorService');

// 1. Transaction AI Risk Analysis & Explanation
router.get('/transaction/:packetId', async (req, res) => {
    try {
        const { packetId } = req.params;
        const tx = await Transaction.findOne({ where: { packetId } });

        const context = tx ? {
            packetId: tx.packetId,
            amount: tx.amount,
            senderVpa: tx.senderVpa,
            receiverVpa: tx.receiverVpa,
            status: tx.status,
            hopCount: tx.hopCount,
            bridgeNodeId: tx.bridgeNodeId,
            signedAt: tx.signedAt,
            createdAt: tx.createdAt
        } : { packetId, amount: 100, status: 'SETTLED', hopCount: 1 };

        const analysis = await aiService.analyzeTransaction(context);
        res.json(analysis);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Smart Route Recommendation
router.post('/route', async (req, res) => {
    try {
        const { sourceNode, destinationNode } = req.body;
        const users = await User.findAll({ attributes: ['vpa', 'holderName'] });
        mesh.syncWithUsers(users);

        const devices = mesh.getDevices();
        const offlineDevices = devices.filter(d => !d.hasInternet);
        const bridgeDevices = devices.filter(d => d.hasInternet);

        const defaultSource = offlineDevices.length > 0 ? offlineDevices[0].deviceId : (devices.length > 0 ? devices[0].deviceId : 'node-client');
        const defaultDest = bridgeDevices.length > 0 ? bridgeDevices[0].deviceId : 'gateway-bridge-node';

        const context = {
            sourceNode: sourceNode || defaultSource,
            destinationNode: destinationNode || defaultDest,
            nodes: devices.map(d => ({ deviceId: d.deviceId, hasInternet: d.hasInternet, count: d.packetCount() }))
        };

        const routeRec = await aiService.recommendRoute(context);
        res.json(routeRec);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Network Intelligence Assessment
router.get('/network', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['vpa', 'holderName'] });
        mesh.syncWithUsers(users);

        const devices = mesh.getDevices();
        const totalTx = await Transaction.count();
        const settledTx = await Transaction.count({ where: { status: 'SETTLED' } });
        const failedTx = await Transaction.count({ where: { status: 'REJECTED' } });
        const pendingTx = await Transaction.count({ where: { status: 'PENDING' } });

        const deliveryRate = totalTx > 0 ? (((totalTx - failedTx) / totalTx) * 100).toFixed(1) : '99.2';
        const netReliability = totalTx > 0 ? (((settledTx + 1) / (totalTx + 1)) * 100).toFixed(1) : '98.5';
        const avgLatency = Math.max(25, Math.min(250, Math.round(35 + (pendingTx * 15))));

        const nodeStates = await Promise.all(devices.map(async d => {
            let status = 'HEALTHY';
            if (d.hasInternet) status = 'HEALTHY';
            else if (d.packetCount() > 4) status = 'CONGESTED';
            else if (d.packetCount() > 2) status = 'DEGRADED';

            const vpaMatch = d.deviceId.replace(/^(node-|phone-)/, '');
            const txCount = await Transaction.count({
                where: {
                    [Op.or]: [
                        { senderVpa: { [Op.like]: `%${vpaMatch}%` } },
                        { receiverVpa: { [Op.like]: `%${vpaMatch}%` } }
                    ]
                }
            });

            const nodeRel = d.hasInternet ? 0.99 : Math.min(0.98, Math.max(0.85, 0.95 - (d.packetCount() * 0.03)));
            const nodeLat = d.hasInternet ? 35 : Math.round(80 + (d.packetCount() * 25));

            return {
                nodeId: d.deviceId,
                hasInternet: d.hasInternet,
                status,
                reliability: parseFloat(nodeRel.toFixed(2)),
                latencyMs: nodeLat,
                queueSize: d.packetCount(),
                successRate: `${(nodeRel * 100).toFixed(1)}%`,
                failureRate: `${((1 - nodeRel) * 100).toFixed(1)}%`,
                retryRate: `${(d.packetCount() * 1.5).toFixed(1)}%`,
                transactionsRouted: txCount
            };
        }));

        res.json({
            totalNodes: devices.length,
            activeNodes: devices.length,
            offlineNodes: devices.filter(d => !d.hasInternet).length,
            unstableNodes: devices.filter(d => d.packetCount() > 3).length,
            networkReliability: `${netReliability}%`,
            transactionDeliveryRate: `${deliveryRate}%`,
            averageLatencyMs: avgLatency,
            queueLoadRatio: `${Math.min(100, pendingTx * 10)}%`,
            packetRetryRate: '2.1%',
            bridgeNodeHealth: 'OPTIMAL',
            failedTransactions: failedTx,
            suspiciousTransactions: 0,
            nodes: nodeStates
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Incident Intelligence
router.get('/incidents', async (req, res) => {
    try {
        const incidents = await incidentService.getActiveIncidents();
        res.json(incidents);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 5. AI Natural Language Analytics Assistant
router.post('/assistant', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Question parameter is required' });

        const contextData = await controlledQuery.getContextForQuery(question);
        const answer = await aiService.answerQuery(question, contextData);

        res.json({
            question,
            answer,
            retrievedContext: {
                totalTx: contextData.totalTxCount,
                settledTx: contextData.settledTxCount,
                failedTx: contextData.failedTxCount,
                activeNodes: contextData.activeNodesCount
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. AI Health Endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        aiProvider: aiService.provider.name,
        cachedItems: aiService.cache.size,
        timeoutMs: aiService.timeoutMs,
        hasApiKey: !!process.env.AI_API_KEY
    });
});

module.exports = router;
