const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/db');
const serverKeyHolder = require('./crypto/ServerKeyHolder');
const apiRoutes = require('./controllers/api');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve static files from frontend build directory if available
app.use(express.static(path.join(__dirname, '../public')));

// Health Check Endpoints
const getHealthStatus = () => ({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'SQLite (Sequelize)',
    aiEngine: process.env.AI_API_KEY ? (process.env.AI_PROVIDER || 'OpenAI') : 'MockAIProvider (Fallback Mode)'
});

app.get('/health', (req, res) => res.json(getHealthStatus()));
app.get('/api/health', (req, res) => res.json(getHealthStatus()));
app.get('/api/ai/health', (req, res) => res.json({
    status: 'UP',
    provider: process.env.AI_PROVIDER || 'MockAIProvider',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    apiKeyConfigured: !!process.env.AI_API_KEY
}));

// API Routes
app.use('/api', apiRoutes);

// Version-agnostic SPA fallback middleware
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
        if (err) {
            res.status(200).send('MeshPay Backend API Service Running.');
        }
    });
});

async function start() {
    try {
        await connectDB();
        serverKeyHolder.init();

        server.listen(PORT, () => {
            console.log(`🚀 MeshPay Backend listening on port ${PORT}`);
            console.log(`🧠 AI Intelligence Layer active. Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (e) {
        console.error('❌ Failed to start MeshPay server:', e);
        process.exit(1);
    }
}

start();
