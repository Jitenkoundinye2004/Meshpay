const MockAIProvider = require('./providers/MockAIProvider');
const OpenAIProvider = require('./providers/OpenAIProvider');
const GeminiProvider = require('./providers/GeminiProvider');

class AIProviderFactory {
    static createProvider() {
        const apiKey = process.env.AI_API_KEY;
        const model = process.env.AI_MODEL;
        const baseUrl = process.env.AI_BASE_URL;
        const providerName = (process.env.AI_PROVIDER || '').toLowerCase();

        if (!apiKey) {
            console.log('ℹ️ No AI_API_KEY detected. Utilizing deterministic MockAIProvider fallback.');
            return new MockAIProvider();
        }

        if (providerName === 'gemini') {
            console.log(`🤖 Initializing GeminiProvider (${model || 'gemini-1.5-flash'})`);
            return new GeminiProvider(apiKey, model, baseUrl);
        }

        console.log(`🤖 Initializing OpenAIProvider (${model || 'gpt-4o-mini'})`);
        return new OpenAIProvider(apiKey, model, baseUrl);
    }
}

module.exports = AIProviderFactory;
