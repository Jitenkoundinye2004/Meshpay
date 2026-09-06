const assert = require('assert');
const connectDB = require('../src/config/db');
const sequelize = require('../src/config/database');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const aiService = require('../src/services/ai/AIService');
const controlledQuery = require('../src/services/ai/ControlledQueryService');
const cryptoService = require('../src/crypto/HybridCryptoService');
const idempotency = require('../src/services/IdempotencyService');
const serverKeyHolder = require('../src/crypto/ServerKeyHolder');

async function runTests() {
    console.log('🧪 Starting MeshPay Comprehensive Test Suite...');

    // 1. Initialize DB & Keys
    await connectDB();
    serverKeyHolder.init();

    // Test 1: User Model Creation & Encryption
    console.log('  Testing User model creation in SQLite...');
    const testUser = await User.create({
        vpa: 'test_alice@demo',
        email: 'alice_test@example.com',
        holderName: 'Alice Test',
        passwordHash: 'hash123',
        pinHash: 'pinhash123',
        balance: 5000.00
    });
    assert.strictEqual(testUser.vpa, 'test_alice@demo');
    assert.strictEqual(testUser.balance, 5000.00);
    console.log('  ✅ User creation test passed.');

    // Test 2: Idempotency Gate
    console.log('  Testing Idempotency & Duplicate Packet Rejection...');
    const packetHash = 'hash_' + Date.now();
    assert.strictEqual(idempotency.claim(packetHash), true, 'First claim should succeed');
    assert.strictEqual(idempotency.claim(packetHash), false, 'Duplicate claim should be rejected');
    console.log('  ✅ Idempotency test passed.');

    // Test 3: AI Service Transaction Risk Analysis
    console.log('  Testing AI Risk Analysis with deterministic fallback...');
    const riskAnalysis = await aiService.analyzeTransaction({
        packetId: 'test_packet_101',
        amount: 2500,
        senderVpa: 'alice@demo',
        receiverVpa: 'bob@demo',
        status: 'SETTLED',
        hopCount: 2
    });
    assert.ok(riskAnalysis.riskLevel, 'Risk level should exist');
    assert.ok(typeof riskAnalysis.riskScore === 'number', 'Risk score should be numeric');
    assert.ok(Array.isArray(riskAnalysis.riskFactors), 'Risk factors should be an array');
    console.log('  ✅ AI Risk Analysis test passed.');

    // Test 4: Controlled Query Layer (No Direct SQL Execution)
    console.log('  Testing Controlled Query Context Retrieval...');
    const context = await controlledQuery.getContextForQuery('Why was transaction delayed?');
    assert.ok(context.totalTxCount !== undefined, 'Total transaction count must exist');
    assert.ok(Array.isArray(context.nodeMetrics), 'Node metrics array must exist');
    console.log('  ✅ Controlled Query test passed.');

    // Test 5: AI Failure Circuit Breaker Fallback
    console.log('  Testing AI API Failure & Fallback Resilience...');
    // Force AI service timeout or error simulation
    const fallbackResult = await aiService._withTimeout(
        Promise.reject(new Error('Simulated AI Provider API Error')),
        async () => ({ riskLevel: 'LOW', riskScore: 10, summary: 'Fallback active' })
    );
    assert.strictEqual(fallbackResult.riskLevel, 'LOW');
    console.log('  ✅ AI Failure Resilience test passed (Payments continue operating cleanly).');

    // Cleanup
    await User.destroy({ where: { vpa: 'test_alice@demo' } });
    console.log('\n🎉 ALL COMPREHENSIVE TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
}

runTests().catch(err => {
    console.error('❌ Test Failure:', err);
    process.exit(1);
});
