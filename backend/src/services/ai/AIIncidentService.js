const aiService = require('./AIService');
const { AIIncident } = require('../../models/AIModels');
const Transaction = require('../../models/Transaction');
const mesh = require('../MeshSimulatorService');

class AIIncidentService {
    async getActiveIncidents() {
        const dbIncidents = await AIIncident.findAll({
            where: { status: ['OPEN', 'INVESTIGATING'] },
            order: [['createdAt', 'DESC']]
        });

        if (dbIncidents.length > 0) {
            return dbIncidents.map(i => i.toJSON());
        }

        // Evaluate live telemetry to trigger incident if needed
        const failedCount = await Transaction.count({ where: { status: 'REJECTED' } });
        const devices = mesh.getDevices();
        const offlineDevices = devices.filter(d => !d.hasInternet);
        const targetNode = offlineDevices.length > 0 ? offlineDevices[offlineDevices.length - 1].deviceId : 'node-relay';

        const incident = await aiService.analyzeIncident({
            metrics: {
                failedTxCount: failedCount,
                avgLatency: 110,
                nodesCount: devices.length,
                affectedNode: targetNode
            }
        });

        try {
            const created = await AIIncident.create({
                incidentCode: incident.incidentCode,
                severity: incident.severity,
                title: incident.title,
                probableCause: incident.probableCause,
                affectedNodes: incident.affectedNodes,
                affectedTransactionsCount: incident.affectedTransactionsCount,
                evidence: incident.evidence,
                recommendedAction: incident.recommendedAction,
                status: 'OPEN'
            });
            return [created.toJSON()];
        } catch (e) {
            return [incident];
        }
    }
}

module.exports = new AIIncidentService();
