const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const aiService = require('../src/services/ai/AIService');
const idempotency = require('../src/services/IdempotencyService');
const { v4: uuidv4 } = require('uuid');

async function runBenchmark() {
    console.log('==================================================');
    console.log('⚡ MESHPAY SYSTEM PERFORMANCE & AI BENCHMARK ⚡');
    console.log('==================================================');

    await connectDB();

    const ITERATIONS = 100;
    const latencies = [];

    console.log(`\n1. Running Deterministic Ledger Benchmark (${ITERATIONS} transactions)...`);
    const startTime = Date.now();

    for (let i = 0; i < ITERATIONS; i++) {
        const t0 = Date.now();
        const nonce = uuidv4();
        
        await Transaction.create({
            packetId: nonce,
            senderVpa: 'jiten@demo',
            receiverVpa: 'janhavi@demo',
            amount: 50 + (i % 100),
            status: 'SETTLED',
            bridgeNodeId: 'Benchmark-Bridge',
            signedAt: new Date(),
            settledAt: new Date(),
            riskLevel: 'LOW',
            riskScore: 10
        });

        latencies.push(Date.now() - t0);
    }

    const totalDurationMs = Date.now() - startTime;
    latencies.sort((a, b) => a - b);

    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const opsPerSec = ((ITERATIONS / totalDurationMs) * 1000).toFixed(2);

    console.log(`  ✓ Transactions Processed: ${ITERATIONS}`);
    console.log(`  ✓ Throughput: ${opsPerSec} tx/sec`);
    console.log(`  ✓ P50 Latency: ${p50} ms`);
    console.log(`  ✓ P95 Latency: ${p95} ms`);
    console.log(`  ✓ P99 Latency: ${p99} ms`);

    console.log(`\n2. Running Duplicate Packet Rejection Benchmark...`);
    const sampleHash = 'hash_bench_123';
    idempotency.claim(sampleHash);

    let rejectedCount = 0;
    for (let i = 0; i < 50; i++) {
        if (!idempotency.claim(sampleHash)) {
            rejectedCount++;
        }
    }
    console.log(`  ✓ Duplicate Rejection Rate: ${(rejectedCount / 50 * 100).toFixed(1)}% (${rejectedCount}/50 packets blocked)`);

    console.log(`\n3. Running AI Service Benchmark...`);
    const aiStart = Date.now();
    const aiAnalysis = await aiService.analyzeTransaction({
        packetId: 'bench_tx_99',
        amount: 15000,
        senderVpa: 'jiten@demo',
        receiverVpa: 'stranger@demo',
        status: 'SETTLED',
        hopCount: 4,
        retryCount: 2
    });
    const aiDuration = Date.now() - aiStart;

    console.log(`  ✓ AI Analysis Latency: ${aiDuration} ms`);
    console.log(`  ✓ AI Risk Score Assigned: ${aiAnalysis.riskScore}/100 (${aiAnalysis.riskLevel})`);
    console.log(`  ✓ Anomaly Flagged: ${aiAnalysis.anomalyDetected}`);

    console.log('\n==================================================');
    console.log('✅ BENCHMARK COMPLETE');
    console.log('==================================================');

    process.exit(0);
}

runBenchmark().catch(err => {
    console.error('Benchmark Error:', err);
    process.exit(1);
});
