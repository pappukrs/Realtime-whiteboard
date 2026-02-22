import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBoardStore } from '../store/useBoardStore';

const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const useSocket = (roomId: string) => {
    const socketRef = useRef<Socket | null>(null);
    const { setElements, addElement, updateCursor, removeCursor } = useBoardStore();

    useEffect(() => {
        socketRef.current = io(SOCKET_SERVER_URL, {
            withCredentials: true,
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to socket server');
            socket.emit('join-room', roomId);
        });

        socket.on('board-state', (elements: any[]) => {
            setElements(elements);
        });

        socket.on('draw-update', (element: any) => {
            // Optimistic update already handles local draw, so we only add foreign elements
            // For simplicity, we assume 'draw-update' means a new element. If it's an update,
            // we'd need to check if element exists and update/add accordingly.
            addElement(element);
        });

        socket.on('cursor-update', (data: { userId: string; cursor: any }) => {
            updateCursor(data.userId, data.cursor);
        });

        socket.on('user-left', (userId: string) => {
            removeCursor(userId);
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId, setElements, addElement, updateCursor, removeCursor]);

    const emitDraw = (element: any) => {
        if (socketRef.current) {
            socketRef.current.emit('draw', { roomId, element });
        }
    };

    const emitCursorMove = (cursor: { x: number; y: number }) => {
        if (socketRef.current) {
            socketRef.current.emit('cursor-move', { roomId, cursor });
        }
    };

    const saveBoard = (elements: any[]) => {
        if (socketRef.current) {
            socketRef.current.emit('save-board', { roomId, elements });
        }
    };

    return { emitDraw, emitCursorMove, saveBoard };
};
