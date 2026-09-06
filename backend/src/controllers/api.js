const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const serverKeyHolder = require('../crypto/ServerKeyHolder');
const demo = require('../services/DemoService');
const mesh = require('../services/MeshSimulatorService');
const bridge = require('../services/BridgeIngestionService');
const idempotency = require('../services/IdempotencyService');
const aiService = require('../services/ai/AIService');

// Sequelize Models
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const sequelize = require('../config/database');

// Controllers & Middleware
const { sendRegisterOtp, registerUser, loginUser, getMe, forgotPassword, resetPassword, forgotPin, resetPin } = require('./authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const aiRoutes = require('./aiRoutes');

// Mount AI Routes
router.use('/ai', aiRoutes);

// ------------------------------------------------------------------ Auth
router.post('/auth/send-register-otp', sendRegisterOtp);
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.get('/auth/me', authMiddleware, getMe);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.post('/auth/forgot-pin', forgotPin);
router.post('/auth/reset-pin', resetPin);

// ------------------------------------------------------------------ Offline Crypto Engine
router.post('/transaction/offline', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { payload, signature } = req.body;
        const { senderVpa, receiverVpa, amount, nonce, timestamp } = payload;

        if (amount <= 0 || amount > 50000) {
            throw new Error("Transaction amount must be between ₹1 and ₹50,000.");
        }

        // --- IDEMPOTENCY CHECK ---
        const existingTx = await Transaction.findOne({ where: { packetId: nonce }, transaction: t });
        if (existingTx) {
            await t.rollback();
            return res.json({ message: "Transaction already processed successfully (Idempotency)", transaction: existingTx });
        }

        // 1. Find Sender and Receiver
        const sender = await User.findOne({ where: { vpa: senderVpa.toLowerCase() }, transaction: t });
        const receiver = await User.findOne({ where: { vpa: receiverVpa.toLowerCase() }, transaction: t });

        if (!sender) throw new Error("Sender not found in database");
        if (!receiver) throw new Error("Receiver VPA not found");

        // 1.5 Verify Transaction Deadline (24 Hours Maximum)
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp > TWENTY_FOUR_HOURS) {
            throw new Error("Transaction Expired: Offline packets must be synced within 24 hours.");
        }

        // 2. Verify Cryptographic Signature
        const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${sender.publicKey}\n-----END PUBLIC KEY-----`;
        const verify = crypto.createVerify('SHA256');
        verify.update(JSON.stringify(payload));
        verify.end();

        const isValid = verify.verify({
            key: publicKeyPem,
            dsaEncoding: 'ieee-p1363'
        }, Buffer.from(signature, 'base64'));

        if (!isValid) {
            throw new Error("Cryptographic Signature Invalid! Transaction rejected.");
        }

        // 3. Verify Balance
        if (sender.balance < amount) {
            throw new Error("Insufficient Funds");
        }

        // 4. Run AI Risk Analysis (Non-blocking fallback guarantee)
        let aiRisk = { riskLevel: 'LOW', riskScore: 10 };
        try {
            aiRisk = await aiService.analyzeTransaction({
                packetId: nonce,
                amount,
                senderVpa,
                receiverVpa,
                status: 'SETTLED',
                hopCount: 1
            });
        } catch (e) {
            console.warn(`AI Analysis skipped: ${e.message}`);
        }

        // 5. Create Transaction Record
        const tx = await Transaction.create({
            packetId: nonce,
            senderVpa: sender.vpa,
            receiverVpa: receiver.vpa,
            amount,
            status: 'SETTLED',
            bridgeNodeId: 'Direct-Upload',
            signedAt: new Date(timestamp),
            settledAt: new Date(),
            riskLevel: aiRisk.riskLevel || 'LOW',
            riskScore: aiRisk.riskScore || 10
        }, { transaction: t });

        // 6. Balance Transfer
        sender.balance -= Number(amount);
        receiver.balance += Number(amount);

        await sender.save({ transaction: t });
        await receiver.save({ transaction: t });

        await t.commit();

        res.json({ message: "Cryptographic Offline Signature Verified & Funds Settled!", transaction: tx });

    } catch (e) {
        await t.rollback();
        res.status(400).json({ error: e.message });
    }
});

// ------------------------------------------------------------------ Demo Add Money
router.post('/account/add-money', async (req, res) => {
    try {
        const { vpa, amount } = req.body;
        if (!vpa || !amount) return res.status(400).json({ error: "Missing data" });
        if (amount <= 0 || amount > 100000) return res.status(400).json({ error: "Amount must be between ₹1 and ₹1,00,000 per transaction." });

        const user = await User.findOne({ where: { vpa: vpa.toLowerCase() } });
        if (!user) return res.status(404).json({ error: "User not found" });

        user.balance += Number(amount);
        await user.save();

        res.json({ message: `Successfully added ₹${amount}`, balance: user.balance });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------------ Server Public Key
router.get('/server-key', (req, res) => {
    res.json({
        publicKey: serverKeyHolder.getPublicKeyBase64(),
        algorithm: "RSA-2048 / OAEP-SHA256",
        hybridScheme: "RSA-OAEP encrypts an AES-256-GCM session key"
    });
});

// ---------------------------------------------------------------- Demo Mesh Forwarding
router.post('/demo/send', async (req, res) => {
    try {
        const reqBody = req.body;
        const packet = await demo.createPacket(
            reqBody.senderVpa, 
            reqBody.receiverVpa, 
            reqBody.amount, 
            reqBody.pin,
            reqBody.ttl == null ? 5 : reqBody.ttl
        );

        const devices = mesh.getDevices();
        const fallbackDevice = devices.length > 0 ? devices[0].deviceId : "node-client";
        const startDevice = reqBody.startDevice || (reqBody.senderVpa ? `node-${reqBody.senderVpa.split('@')[0]}` : fallbackDevice);
        mesh.inject(startDevice, packet);

        res.json({
            packetId: packet.packetId,
            ciphertextPreview: packet.ciphertext.substring(0, 64) + "...",
            ttl: packet.ttl,
            injectedAt: startDevice
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// -------------------------------------------------------------- Mesh Simulator Endpoints
router.get('/mesh/state', (req, res) => {
    const deviceData = [];
    for (const d of mesh.getDevices()) {
        deviceData.push({
            deviceId: d.deviceId,
            hasInternet: d.hasInternet,
            packetCount: d.packetCount(),
            packetIds: d.getHeldPackets().map(p => p.packetId.substring(0, 8))
        });
    }
    res.json({
        devices: deviceData,
        idempotencyCacheSize: idempotency.size()
    });
});

router.post('/mesh/gossip', (req, res) => {
    const r = mesh.gossipOnce();
    res.json({
        transfers: r.transfers,
        deviceCounts: r.deviceCounts
    });
});

router.post('/mesh/flush', async (req, res) => {
    const uploads = mesh.collectBridgeUploads();
    const results = [];
    
    await Promise.all(uploads.map(async (up) => {
        const r = await bridge.ingest(up.packet, up.bridgeNodeId, 5 - up.packet.ttl);
        results.push({
            bridgeNode: up.bridgeNodeId,
            packetId: up.packet.packetId.substring(0, 8),
            outcome: r.outcome,
            reason: r.reason == null ? "" : r.reason,
            transactionId: r.transactionId == null ? -1 : r.transactionId
        });
    }));

    res.json({
        uploadsAttempted: uploads.length,
        results: results
    });
});

router.post('/mesh/reset', (req, res) => {
    mesh.resetMesh();
    idempotency.clear();
    res.json({ status: "mesh and idempotency cache cleared" });
});

// -------------------------------------------------------------- Bridge Node Ingestion
router.post('/bridge/ingest', async (req, res) => {
    const packet = req.body;
    const bridgeNodeId = req.header('X-Bridge-Node-Id') || 'unknown';
    const hopCount = parseInt(req.header('X-Hop-Count') || '0', 10);

    const r = await bridge.ingest(packet, bridgeNodeId, hopCount);
    res.json(r);
});

// ------------------------------------------------------------- Accounts & Transaction Ledger
router.get('/accounts', authMiddleware, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['passwordHash', 'pinHash'] }
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const transactions = await Transaction.findAll({
            where: {
                [Op.or]: [
                    { senderVpa: req.user.vpa },
                    { receiverVpa: req.user.vpa }
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: 30
        });
        res.json(transactions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
