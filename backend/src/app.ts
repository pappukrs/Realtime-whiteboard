import express from 'express';
import cors from 'cors';
import boardRoutes from './routes/board.routes';

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middlewares
app.use(cors({ origin: CLIENT_URL, methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
app.use(express.json());

// Main App Routes
app.use('/api/board', boardRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

export default app;
