import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { setupSocket } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Environment setup
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/collaborative-board';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Middlewares
app.use(cors({ origin: CLIENT_URL, methods: ['GET', 'POST'] }));
app.use(express.json());

// Initialize Redis for Socket.io Adapter (scaling Pub/Sub)
const pubClient = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
subClient.on('error', (err) => console.error('Redis Sub Error:', err));

// Database connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Socket.io initialization
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

setupSocket(io, pubClient, subClient);

// Simple health check API
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// REST API for board persistence
app.get('/api/board/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const Board = (await import('./models/Board')).default;
        const board = await Board.findOne({ roomId });
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }
        res.json(board);
    } catch (error) {
        console.error('Error fetching board REST:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start Server
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
