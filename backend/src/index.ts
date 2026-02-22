import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/database';
import { setupRedis } from './config/redis';
import { setupSocket } from './socket/socket.handler';

dotenv.config();

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/collaborative-board';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

const bootstrap = async () => {
    // 1. Database connection
    await connectDB(MONGO_URI);

    // 2. Redis Setup
    const { pubClient, subClient } = setupRedis(REDIS_HOST, REDIS_PORT);

    // 3. Server Setup
    const server = http.createServer(app);

    // 4. Socket.io Setup
    const io = new Server(server, {
        cors: {
            origin: CLIENT_URL,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    setupSocket(io, pubClient, subClient);

    // 5. Start listening
    server.listen(PORT, () => {
        console.log(`Backend server running on port ${PORT}`);
    });
};

bootstrap().catch(console.error);
