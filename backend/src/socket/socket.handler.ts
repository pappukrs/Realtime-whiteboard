import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { BoardService } from '../services/board.service';

export const setupSocket = (io: SocketIOServer, redisPub: Redis, redisSub: Redis) => {
    io.adapter(createAdapter(redisPub, redisSub));

    io.on('connection', (socket: Socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('join-room', async (roomId: string) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room: ${roomId}`);
            socket.to(roomId).emit('user-joined', socket.id);

            try {
                const board = await BoardService.getBoardState(roomId);
                if (board) {
                    socket.emit('board-state', board.elements);
                }
            } catch (err) {
                console.error('Socket join-room error:', err);
            }
        });

        socket.on('draw', async (data: { roomId: string; element: any }) => {
            socket.to(data.roomId).emit('draw-update', data.element);
        });

        socket.on('remove-element', (data: { roomId: string; id: string }) => {
            socket.to(data.roomId).emit('element-removed', data.id);
        });

        socket.on('remove-elements', (data: { roomId: string; ids: string[] }) => {
            socket.to(data.roomId).emit('elements-removed', data.ids);
        });

        socket.on('clear-board', (data: { roomId: string }) => {
            socket.to(data.roomId).emit('board-cleared');
        });

        socket.on('sync-board', (data: { roomId: string; elements: any[] }) => {
            socket.to(data.roomId).emit('sync-board', data.elements);
        });

        socket.on('cursor-move', (data: { roomId: string; cursor: any }) => {
            socket.to(data.roomId).emit('cursor-update', {
                userId: socket.id,
                cursor: data.cursor,
            });
        });

        socket.on('save-board', async (data: { roomId: string; elements: any[] }) => {
            try {
                await BoardService.saveBoardState(data.roomId, data.elements);
            } catch (error) {
                console.error('Socket save-board error:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};
