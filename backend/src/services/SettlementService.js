const sequelize = require('../config/database');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const aiService = require('./ai/AIService');

class SettlementService {
    constructor() {
        this.mutex = Promise.resolve();
    }

    async settle(instruction, packetHash, bridgeNodeId, hopCount) {
        return new Promise((resolve, reject) => {
            this.mutex = this.mutex.then(async () => {
                const t = await sequelize.transaction();
                try {
                    const sender = await User.findOne({ where: { vpa: instruction.senderVpa.toLowerCase() }, transaction: t });
                    if (!sender) {
                        throw new Error(`Unknown sender VPA: ${instruction.senderVpa}`);
                    }

                    const receiver = await User.findOne({ where: { vpa: instruction.receiverVpa.toLowerCase() }, transaction: t });
                    if (!receiver) {
                        throw new Error(`Unknown receiver VPA: ${instruction.receiverVpa}`);
                    }

                    const amount = parseFloat(instruction.amount);
                    if (amount <= 0) {
                        throw new Error("Amount must be positive");
                    }

                    if (parseFloat(sender.balance) < amount) {
                        console.warn(`Insufficient balance: ${sender.vpa} has ₹${sender.balance}, tried to send ₹${amount}`);
                        const tx = await this.recordRejected(instruction, packetHash, bridgeNodeId, hopCount, t);
                        await t.commit();
                        resolve(tx);
                        return;
                    }

                    // Run AI risk analysis silently
                    let aiRisk = { riskLevel: 'LOW', riskScore: 10 };
                    try {
                        aiRisk = await aiService.analyzeTransaction({
                            packetId: instruction.nonce || packetHash,
                            amount,
                            senderVpa: sender.vpa,
                            receiverVpa: receiver.vpa,
                            status: 'SETTLED',
                            hopCount: hopCount || 1
                        });
                    } catch (e) {
                        console.warn(`AI Analysis skipped in settlement: ${e.message}`);
                    }

                    // Update balances
                    sender.balance = parseFloat(sender.balance) - amount;
                    receiver.balance = parseFloat(receiver.balance) + amount;
                    
                    await sender.save({ transaction: t });
                    await receiver.save({ transaction: t });

                    const tx = await Transaction.create({
                        packetId: instruction.nonce || packetHash,
                        packetHash,
                        senderVpa: instruction.senderVpa,
                        receiverVpa: instruction.receiverVpa,
                        amount: amount,
                        signedAt: new Date(instruction.signedAt),
                        settledAt: new Date(),
                        bridgeNodeId,
                        hopCount,
                        status: 'SETTLED',
                        riskLevel: aiRisk.riskLevel || 'LOW',
                        riskScore: aiRisk.riskScore || 10
                    }, { transaction: t });

                    await t.commit();

                    console.log(`SETTLED ₹${amount} from ${sender.vpa} to ${receiver.vpa} (packetHash=${packetHash.substring(0, 12)}..., bridge=${bridgeNodeId}, hops=${hopCount})`);
                    resolve(tx);
                } catch (error) {
                    await t.rollback();
                    reject(error);
                }
            }).catch(err => {
                reject(err);
            });
        });
    }

    async recordRejected(instruction, packetHash, bridgeNodeId, hopCount, t) {
        return await Transaction.create({
            packetId: instruction.nonce || packetHash,
            packetHash,
            senderVpa: instruction.senderVpa,
            receiverVpa: instruction.receiverVpa,
            amount: parseFloat(instruction.amount),
            signedAt: new Date(instruction.signedAt),
            settledAt: new Date(),
            bridgeNodeId,
            hopCount,
            status: 'REJECTED',
            failureReason: 'Insufficient Funds',
            riskLevel: 'HIGH',
            riskScore: 70
        }, { transaction: t });
    }
}

module.exports = new SettlementService();
