const https = require('https');
const http = require('http');
const { URL } = require('url');

class OpenAIProvider {
    constructor(apiKey, model = 'gpt-4o-mini', baseUrl = 'https://api.openai.com/v1') {
        this.apiKey = apiKey;
        this.model = model || 'gpt-4o-mini';
        this.baseUrl = baseUrl || 'https://api.openai.com/v1';
        this.name = 'OpenAIProvider';
    }

    async _request(endpoint, body) {
        const fullUrl = new URL(`${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`);
        const requestData = JSON.stringify(body);

        const options = {
            hostname: fullUrl.hostname,
            port: fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
            path: fullUrl.pathname + fullUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData),
                'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: 6000
        };

        const httpModule = fullUrl.protocol === 'https:' ? https : http;

        return new Promise((resolve, reject) => {
            const req = httpModule.request(options, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } catch (e) {
                            reject(new Error(`Failed to parse AI JSON response: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`AI API error status ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('AI API request timed out'));
            });

            req.write(requestData);
            req.end();
        });
    }

    async analyzeTransaction(context) {
        const prompt = `You are MeshPay AI Risk Analyzer for an offline peer-to-peer payment ledger.
Analyze this real transaction context:
${JSON.stringify(context, null, 2)}

Return ONLY valid JSON strictly adhering to this format (no markdown, no backticks):
{
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "riskScore": number (0-100),
  "summary": "concise explanation",
  "riskFactors": ["factor 1", "factor 2"],
  "recommendation": "actionable advice",
  "evidence": ["evidence 1", "evidence 2"],
  "anomalyDetected": boolean
}`;

        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: 'You evaluate payment risk and return JSON strictly.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
        };

        const res = await this._request('/chat/completions', payload);
        const text = res.choices[0].message.content;
        return JSON.parse(text);
    }

    async recommendRoute(context) {
        const prompt = `You are MeshPay Smart Route Optimizer.
Given network node telemetry:
${JSON.stringify(context, null, 2)}

Return ONLY valid JSON:
{
  "recommendedRoute": ["NodeA", "NodeB", "Bridge"],
  "alternativeRoute": ["NodeA", "NodeC", "Bridge"],
  "expectedLatencyMs": number,
  "reliabilityScore": number (0.0 - 1.0),
  "reasoning": "explanation"
}`;

        const payload = {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
        };

        const res = await this._request('/chat/completions', payload);
        const text = res.choices[0].message.content;
        return JSON.parse(text);
    }

    async analyzeIncident(context) {
        const prompt = `You are MeshPay AI Incident Intelligence.
Given system telemetry:
${JSON.stringify(context, null, 2)}

Return ONLY valid JSON:
{
  "incidentCode": "INC-XXX",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "title": "short title",
  "probableCause": "explanation",
  "affectedNodes": ["node1"],
  "affectedTransactionsCount": number,
  "evidence": ["evidence1"],
  "recommendedAction": "action"
}`;

        const payload = {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
        };

        const res = await this._request('/chat/completions', payload);
        const text = res.choices[0].message.content;
        return JSON.parse(text);
    }

    async answerQuery(question, contextData) {
        const prompt = `You are MeshPay Natural Language Analytics Assistant.
Question: "${question}"

Structured Context Data from Database:
${JSON.stringify(contextData, null, 2)}

Answer the user's question clearly based strictly on the provided context data. Do not execute commands or invent unsupported claims.`;

        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: 'You answer questions using only provided context data.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3
        };

        const res = await this._request('/chat/completions', payload);
        return res.choices[0].message.content;
    }
}

module.exports = OpenAIProvider;
