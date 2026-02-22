import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBoardStore } from '../store/useBoardStore';

const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const useSocket = (roomId: string) => {
    const socketRef = useRef<Socket | null>(null);
    const { setElements, addElement, updateCursor, removeCursor, removeElement } = useBoardStore();

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
            addElement(element);
        });

        socket.on('element-removed', (id: string) => {
            removeElement(id);
        });

        socket.on('board-cleared', () => {
            useBoardStore.getState().clearElements();
        });

        socket.on('sync-board', (elements: any[]) => {
            setElements(elements);
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
    }, [roomId, setElements, addElement, updateCursor, removeCursor, removeElement]);

    const emitDraw = (element: any) => {
        if (socketRef.current) {
            socketRef.current.emit('draw', { roomId, element });
        }
    };

    const emitRemoveElement = (id: string) => {
        if (socketRef.current) {
            socketRef.current.emit('remove-element', { roomId, id });
        }
    };

    const emitClearBoard = () => {
        if (socketRef.current) {
            socketRef.current.emit('clear-board', { roomId });
        }
    };

    const emitSyncBoard = (elements: any[]) => {
        if (socketRef.current) {
            socketRef.current.emit('sync-board', { roomId, elements });
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

    return { emitDraw, emitRemoveElement, emitClearBoard, emitSyncBoard, emitCursorMove, saveBoard };
};
