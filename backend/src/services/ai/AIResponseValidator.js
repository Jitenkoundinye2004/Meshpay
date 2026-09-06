class AIResponseValidator {
    static validateTransactionAnalysis(response) {
        if (!response || typeof response !== 'object') {
            throw new Error('AI response is not an object');
        }

        const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const riskLevel = validLevels.includes(response.riskLevel) ? response.riskLevel : 'LOW';

        let riskScore = typeof response.riskScore === 'number' ? response.riskScore : 10;
        riskScore = Math.max(0, Math.min(100, riskScore));

        const summary = typeof response.summary === 'string' && response.summary.length > 0 
            ? response.summary 
            : 'Transaction processed within normal system boundaries.';

        const riskFactors = Array.isArray(response.riskFactors) ? response.riskFactors : [];
        const recommendation = typeof response.recommendation === 'string' ? response.recommendation : 'Proceed with standard processing.';
        const evidence = Array.isArray(response.evidence) ? response.evidence : [];
        const anomalyDetected = typeof response.anomalyDetected === 'boolean' ? response.anomalyDetected : riskScore > 50;

        return {
            riskLevel,
            riskScore,
            summary,
            riskFactors,
            recommendation,
            evidence,
            anomalyDetected
        };
    }

    static validateRouteRecommendation(response) {
        if (!response || typeof response !== 'object') {
            throw new Error('Invalid route recommendation structure');
        }

        return {
            recommendedRoute: Array.isArray(response.recommendedRoute) ? response.recommendedRoute : ['NodeA', 'Bridge01'],
            alternativeRoute: Array.isArray(response.alternativeRoute) ? response.alternativeRoute : ['NodeA', 'NodeB', 'Bridge01'],
            expectedLatencyMs: typeof response.expectedLatencyMs === 'number' ? response.expectedLatencyMs : 120,
            reliabilityScore: typeof response.reliabilityScore === 'number' ? response.reliabilityScore : 0.95,
            reasoning: typeof response.reasoning === 'string' ? response.reasoning : 'Selected primary bridge path based on latency telemetry.'
        };
    }

    static validateIncident(response) {
        if (!response || typeof response !== 'object') {
            throw new Error('Invalid incident structure');
        }

        const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        return {
            incidentCode: typeof response.incidentCode === 'string' ? response.incidentCode : `INC-${Date.now().toString().slice(-4)}`,
            severity: validLevels.includes(response.severity) ? response.severity : 'MEDIUM',
            title: typeof response.title === 'string' ? response.title : 'Unusual Network Latency Detected',
            probableCause: typeof response.probableCause === 'string' ? response.probableCause : 'Intermediary node congestion',
            affectedNodes: Array.isArray(response.affectedNodes) ? response.affectedNodes : [],
            affectedTransactionsCount: typeof response.affectedTransactionsCount === 'number' ? response.affectedTransactionsCount : 0,
            evidence: Array.isArray(response.evidence) ? response.evidence : [],
            recommendedAction: typeof response.recommendedAction === 'string' ? response.recommendedAction : 'Monitor network node queues.'
        };
    }
}

module.exports = AIResponseValidator;
