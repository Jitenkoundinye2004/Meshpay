const AIProviderFactory = require('./AIProviderFactory');
const AIResponseValidator = require('./AIResponseValidator');
const MockAIProvider = require('./providers/MockAIProvider');
const {
    AITransactionAnalysis,
    AIRouteRecommendation,
    AINetworkInsight,
    AIIncident
} = require('../../models/AIModels');

class AIService {
    constructor() {
        this.provider = AIProviderFactory.createProvider();
        this.fallbackProvider = new MockAIProvider();
        this.cache = new Map(); // Simple in-memory LRU/TTL cache
        this.timeoutMs = 5000;
    }

    _withTimeout(promise, fallbackFn) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('AI API Timeout (5000ms limit reached)'));
            }, this.timeoutMs);
        });

        return Promise.race([promise, timeoutPromise])
            .then(result => {
                clearTimeout(timeoutId);
                return result;
            })
            .catch(async (err) => {
                clearTimeout(timeoutId);
                console.warn(`⚠️ AI Service fallback triggered: ${err.message}`);
                return await fallbackFn();
            });
    }

    async analyzeTransaction(context) {
        const cacheKey = `tx_analysis_${context.packetId || context.nonce || JSON.stringify(context)}`;
        
        // 1. Check in-memory cache
        if (this.cache.has(cacheKey)) {
            const item = this.cache.get(cacheKey);
            if (Date.now() < item.expiresAt) {
                return item.data;
            }
        }

        // 2. Check Database persistent cache if packetId provided
        if (context.packetId) {
            const dbRecord = await AITransactionAnalysis.findOne({ where: { packetId: context.packetId } });
            if (dbRecord) {
                const data = {
                    riskLevel: dbRecord.riskLevel,
                    riskScore: dbRecord.riskScore,
                    summary: dbRecord.summary,
                    riskFactors: dbRecord.riskFactors,
                    recommendation: dbRecord.recommendation,
                    evidence: dbRecord.evidence,
                    anomalyDetected: dbRecord.anomalyDetected
                };
                this.cache.set(cacheKey, { data, expiresAt: Date.now() + 300000 });
                return data;
            }
        }

        // 3. Execute with timeout & fallback
        const result = await this._withTimeout(
            (async () => {
                const raw = await this.provider.analyzeTransaction(context);
                return AIResponseValidator.validateTransactionAnalysis(raw);
            })(),
            async () => {
                const fallbackRaw = await this.fallbackProvider.analyzeTransaction(context);
                return AIResponseValidator.validateTransactionAnalysis(fallbackRaw);
            }
        );

        // 4. Save to persistent cache if packetId exists
        if (context.packetId) {
            try {
                await AITransactionAnalysis.create({
                    packetId: context.packetId,
                    riskLevel: result.riskLevel,
                    riskScore: result.riskScore,
                    summary: result.summary,
                    riskFactors: result.riskFactors,
                    recommendation: result.recommendation,
                    evidence: result.evidence,
                    anomalyDetected: result.anomalyDetected,
                    rawAIResponse: result
                });
            } catch (e) {
                // Ignore unique constraint race conditions
            }
        }

        this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + 300000 });
        return result;
    }

    async recommendRoute(context) {
        return await this._withTimeout(
            (async () => {
                const raw = await this.provider.recommendRoute(context);
                return AIResponseValidator.validateRouteRecommendation(raw);
            })(),
            async () => {
                const raw = await this.fallbackProvider.recommendRoute(context);
                return AIResponseValidator.validateRouteRecommendation(raw);
            }
        );
    }

    async analyzeIncident(context) {
        return await this._withTimeout(
            (async () => {
                const raw = await this.provider.analyzeIncident(context);
                return AIResponseValidator.validateIncident(raw);
            })(),
            async () => {
                const raw = await this.fallbackProvider.analyzeIncident(context);
                return AIResponseValidator.validateIncident(raw);
            }
        );
    }

    async answerQuery(question, contextData) {
        return await this._withTimeout(
            (async () => {
                return await this.provider.answerQuery(question, contextData);
            })(),
            async () => {
                return await this.fallbackProvider.answerQuery(question, contextData);
            }
        );
    }
}

module.exports = new AIService();
