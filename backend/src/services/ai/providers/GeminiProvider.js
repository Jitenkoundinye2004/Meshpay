const https = require('https');
const http = require('http');
const { URL } = require('url');

class GeminiProvider {
    constructor(apiKey, model = 'gemini-1.5-flash', baseUrl = 'https://generativelanguage.googleapis.com/v1beta') {
        this.apiKey = apiKey;
        this.model = model || 'gemini-1.5-flash';
        this.baseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        this.name = 'GeminiProvider';
    }

    async _request(prompt, systemInstruction = '') {
        const fullUrl = new URL(`${this.baseUrl.replace(/\/$/, '')}/models/${this.model}:generateContent?key=${this.apiKey}`);
        
        const contents = [{ role: 'user', parts: [{ text: prompt }] }];
        const bodyObj = { contents };

        if (systemInstruction) {
            bodyObj.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const requestData = JSON.stringify(bodyObj);

        const options = {
            hostname: fullUrl.hostname,
            port: fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
            path: fullUrl.pathname + fullUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData)
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
                            const text = parsed.candidates[0].content.parts[0].text;
                            resolve(text);
                        } catch (e) {
                            reject(new Error(`Failed to parse Gemini response: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`Gemini API error ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Gemini API request timed out'));
            });

            req.write(requestData);
            req.end();
        });
    }

    async analyzeTransaction(context) {
        const prompt = `Analyze this real transaction context:
${JSON.stringify(context, null, 2)}

Return ONLY valid JSON (no markdown formatting):
{
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "riskScore": 20,
  "summary": "description",
  "riskFactors": [],
  "recommendation": "advice",
  "evidence": [],
  "anomalyDetected": false
}`;

        const raw = await this._request(prompt, "You are MeshPay Risk Analyzer. Output raw JSON strictly.");
        const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    }

    async recommendRoute(context) {
        const prompt = `Node telemetry: ${JSON.stringify(context, null, 2)}
Return ONLY valid JSON:
{
  "recommendedRoute": ["NodeA", "NodeB", "Bridge"],
  "alternativeRoute": ["NodeA", "NodeC", "Bridge"],
  "expectedLatencyMs": 150,
  "reliabilityScore": 0.95,
  "reasoning": "text"
}`;

        const raw = await this._request(prompt, "Output raw JSON strictly.");
        const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    }

    async analyzeIncident(context) {
        const prompt = `System telemetry: ${JSON.stringify(context, null, 2)}
Return ONLY valid JSON:
{
  "incidentCode": "INC-101",
  "severity": "HIGH",
  "title": "title",
  "probableCause": "cause",
  "affectedNodes": [],
  "affectedTransactionsCount": 0,
  "evidence": [],
  "recommendedAction": "action"
}`;

        const raw = await this._request(prompt, "Output raw JSON strictly.");
        const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    }

    async answerQuery(question, contextData) {
        const prompt = `Question: "${question}"\nData Context:\n${JSON.stringify(contextData, null, 2)}`;
        return await this._request(prompt, "Answer MeshPay questions using only the provided context.");
    }
}

module.exports = GeminiProvider;
