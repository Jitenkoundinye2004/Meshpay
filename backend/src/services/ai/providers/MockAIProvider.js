class MockAIProvider {
    constructor() {
        this.name = 'MockAIProvider';
    }

    async analyzeTransaction(context) {
        const { amount, retryCount = 0, hopCount = 0, status, senderVpa, receiverVpa, nodeReliability = 1.0, isStale = false } = context;

        let riskScore = 10;
        const riskFactors = [];
        let anomalyDetected = false;

        if (amount > 10000) {
            riskScore += 25;
            riskFactors.push(`High transaction value (₹${amount.toLocaleString()})`);
        }
        if (retryCount > 1) {
            riskScore += retryCount * 15;
            riskFactors.push(`Multiple packet forwarding retries detected (${retryCount})`);
        }
        if (hopCount > 3) {
            riskScore += (hopCount - 3) * 10;
            riskFactors.push(`Extended mesh hop path length (${hopCount} hops)`);
        }
        if (nodeReliability < 0.8) {
            riskScore += 20;
            riskFactors.push(`Intermediary node reliability below threshold (${(nodeReliability * 100).toFixed(0)}%)`);
        }
        if (isStale) {
            riskScore += 30;
            riskFactors.push("Transaction payload timestamp near maximum 24h expiration");
            anomalyDetected = true;
        }

        if (riskScore > 60) {
            anomalyDetected = true;
        }

        let riskLevel = 'LOW';
        if (riskScore >= 75) riskLevel = 'CRITICAL';
        else if (riskScore >= 50) riskLevel = 'HIGH';
        else if (riskScore >= 25) riskLevel = 'MEDIUM';

        let summary = "Transaction behavior aligns with standard offline mesh routing metrics.";
        let recommendation = "Proceed with standard settlement and ledger sync.";

        if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
            summary = `Elevated risk detected due to ${riskFactors.join(', ')}.`;
            recommendation = "Verify intermediary node logs and monitor bridge node ingestion latency.";
        }

        return {
            riskLevel,
            riskScore: Math.min(100, riskScore),
            summary,
            riskFactors,
            recommendation,
            evidence: [
                `Amount: ₹${amount}`,
                `Hops: ${hopCount}`,
                `Retries: ${retryCount}`,
                `Node Reliability: ${(nodeReliability * 100).toFixed(0)}%`
            ],
            anomalyDetected
        };
    }

    async recommendRoute(context) {
        const { sourceNode, destinationNode, nodes = [] } = context;

        const availableNodeIds = nodes.map(n => typeof n === 'string' ? n : (n.deviceId || n.nodeId)).filter(Boolean);
        const src = sourceNode || (availableNodeIds.length > 0 ? availableNodeIds[0] : 'client-node');
        const dest = destinationNode || 'phone-bridge';

        const intermediates = availableNodeIds.filter(id => id !== src && id !== dest);
        const relay1 = intermediates.length > 0 ? intermediates[0] : 'relay-node-1';
        const relay2 = intermediates.length > 1 ? intermediates[1] : 'relay-node-2';

        const recommended = [src, relay1, dest];
        const alternative = intermediates.length > 1 ? [src, relay2, dest] : [src, dest];

        return {
            recommendedRoute: recommended,
            alternativeRoute: alternative,
            expectedLatencyMs: Math.round(90 + (intermediates.length * 15)),
            reliabilityScore: 0.96,
            reasoning: `Selected forwarding path via ${relay1} due to lower queue congestion and higher historical packet delivery success rates.`
        };
    }

    async analyzeIncident(context) {
        const { metrics = {} } = context;
        const nodeName = metrics.affectedNode || 'node-mesh-relay';

        return {
            incidentCode: `INC-${Math.floor(100 + Math.random() * 900)}`,
            severity: (metrics.failedTxCount || 0) > 3 ? 'HIGH' : 'MEDIUM',
            title: "Bridge Synchronization Latency Spike",
            probableCause: `Intermediary mesh node '${nodeName}' experiencing elevated queue buffer depth and delayed packet relay.`,
            affectedNodes: [nodeName, "phone-bridge"],
            affectedTransactionsCount: metrics.failedTxCount || 1,
            evidence: [
                `Queue load ratio > 80%`,
                `Gossip relay delay: ${metrics.avgLatency || 120}ms`
            ],
            recommendedAction: `Reroute offline packets through available healthy neighbor nodes to bypass '${nodeName}'.`
        };
    }

    async answerQuery(question, contextData = {}) {
        const q = question.toLowerCase();

        if (q.includes("delayed") || q.includes("delay")) {
            return `Based on network analysis, delay was primarily caused by intermediary gossip retry cycles (average ${contextData.avgRetryCount || 1.2} retries per packet) before hitting an online bridge node.`;
        }
        if (q.includes("failure") || q.includes("failed")) {
            return `Current ledger metrics show ${contextData.failedTxCount || 0} failed transactions out of ${contextData.totalTxCount || 0} total packets. Top failure causes include signature invalidation and stale payload expiration.`;
        }
        if (q.includes("node") || q.includes("reliable")) {
            return `Internet Bridge Node 'phone-bridge' maintains the highest delivery reliability (99.0%) with an average ingestion latency of 35ms across ${contextData.activeNodesCount || 4} monitored active nodes.`;
        }

        return `System Telemetry Summary: Total Transactions: ${contextData.totalTxCount || 0}, Settled: ${contextData.settledTxCount || 0}, Active Monitored Nodes: ${contextData.activeNodesCount || 0}. Network health is operating within nominal parameters.`;
    }
}

module.exports = MockAIProvider;
