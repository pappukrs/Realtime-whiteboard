import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import Board from './models/Board';

export const setupSocket = (io: SocketIOServer, redisPub: Redis, redisSub: Redis) => {
    // Use Redis adapter for multi-instance scaling
    io.adapter(createAdapter(redisPub, redisSub));

    io.on('connection', (socket: Socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join a whiteboard room
        socket.on('join-room', async (roomId: string) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room: ${roomId}`);

            // Broadcast to other users in the room
            socket.to(roomId).emit('user-joined', socket.id);

            // Fetch the latest board state from MongoDB and send it to the newly joined user
            try {
                const board = await Board.findOne({ roomId });
                if (board) {
                    socket.emit('board-state', board.elements);
                }
            } catch (err) {
                console.error('Error fetching board state:', err);
            }
        });

        // Handle real-time drawing/element updates
        socket.on('draw', async (data: { roomId: string; element: any }) => {
            const { roomId, element } = data;
            // Broadcast the new element to others in the room
            socket.to(roomId).emit('draw-update', element);

            // Optionally, accumulate updates in Redis or memory, then bulk write to MongoDB
            // For simplicity in the initial setup, we will just broadcast. 
            // Persistence can be handled on specific save triggers or debounced server-side.
        });

        // Handle cursor movement
        socket.on('cursor-move', (data: { roomId: string; cursor: any }) => {
            socket.to(data.roomId).emit('cursor-update', {
                userId: socket.id,
                cursor: data.cursor,
            });
        });

        // Save full board state
        socket.on('save-board', async (data: { roomId: string; elements: any[] }) => {
            const { roomId, elements } = data;
            try {
                await Board.findOneAndUpdate(
                    { roomId },
                    { elements },
                    { upsert: true, new: true }
                );
            } catch (error) {
                console.error('Error saving board:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            // Consider broadcasting user-left to rooms the user was in
        });
    });
};
