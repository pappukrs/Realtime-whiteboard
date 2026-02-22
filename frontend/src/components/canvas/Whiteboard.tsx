import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group, Path } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { useBoardStore } from '../../store/useBoardStore';
import { useSocket } from '../../hooks/useSocket';
import { CanvasElement, ToolType, Point } from '../../types/canvas';

interface WhiteboardProps {
    roomId: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ roomId }) => {
    const { elements, activeTool, strokeColor, strokeWidth, addElement, updateElement, cursors } = useBoardStore();
    const { emitDraw, emitCursorMove } = useSocket(roomId);

    const isDrawing = useRef(false);
    const currentShapeId = useRef<string | null>(null);

    // Throttle cursor updates to avoid flooding WebSocket
    const lastCursorMove = useRef<number>(0);

    const getPointerPos = (e: any): Point | null => {
        const stage = e.target.getStage();
        return stage ? stage.getPointerPosition() : null;
    };

    const handleMouseDown = (e: any) => {
        if (activeTool === 'select') return;

        isDrawing.current = true;
        const pos = getPointerPos(e);
        if (!pos) return;

        const id = uuidv4();
        currentShapeId.current = id;

        const newElement: CanvasElement = {
            id,
            type: activeTool,
            x: pos.x,
            y: pos.y,
            stroke: strokeColor,
            strokeWidth,
            points: activeTool === 'pencil' || activeTool === 'line' ? [pos.x, pos.y] : undefined,
            width: 0,
            height: 0,
            radius: 0,
        };

        addElement(newElement);
    };

    const handleMouseMove = (e: any) => {
        // Send cursor movement
        const now = Date.now();
        if (now - lastCursorMove.current > 50) {
            const pos = getPointerPos(e);
            if (pos) {
                emitCursorMove(pos);
                lastCursorMove.current = now;
            }
        }

        if (!isDrawing.current || activeTool === 'select' || !currentShapeId.current) return;

        const pos = getPointerPos(e);
        if (!pos) return;

        const element = elements.find((el) => el.id === currentShapeId.current);
        if (!element) return;

        let newProps: Partial<CanvasElement> = {};

        if (activeTool === 'pencil' || activeTool === 'line') {
            const points = element.points ? [...element.points] : [];
            if (activeTool === 'pencil') {
                points.push(pos.x, pos.y);
            } else {
                // For line, replace the end coordinate
                points[2] = pos.x;
                points[3] = pos.y;
            }
            newProps.points = points;
        } else if (activeTool === 'rectangle') {
            newProps.width = pos.x - element.x;
            newProps.height = pos.y - element.y;
        } else if (activeTool === 'circle') {
            const rx = pos.x - element.x;
            const ry = pos.y - element.y;
            newProps.radius = Math.sqrt(rx * rx + ry * ry);
        }

        updateElement(currentShapeId.current, newProps);
    };

    const handleMouseUp = () => {
        if (!isDrawing.current || !currentShapeId.current) return;
        isDrawing.current = false;

        const element = elements.find((el) => el.id === currentShapeId.current);
        if (element) {
            emitDraw(element);
        }

        currentShapeId.current = null;
    };

    const renderElement = (el: CanvasElement) => {
        const commonProps = {
            key: el.id,
            id: el.id,
            x: el.x,
            y: el.y,
            stroke: el.stroke,
            strokeWidth: el.strokeWidth,
            draggable: activeTool === 'select',
            onDragEnd: (e: any) => {
                const update = { x: e.target.x(), y: e.target.y() };
                updateElement(el.id, update);
                emitDraw({ ...el, ...update });
            }
        };

        switch (el.type) {
            case 'pencil':
            case 'line':
                return <Line {...commonProps} x={0} y={0} points={el.points || []} lineCap="round" lineJoin="round" />;
            case 'rectangle':
                return <Rect {...commonProps} width={el.width || 0} height={el.height || 0} />;
            case 'circle':
                return <Circle {...commonProps} radius={el.radius || 0} />;
            case 'text':
                return <Text {...commonProps} text={el.text || 'Text'} fontSize={20} />;
            default:
                return null;
        }
    };

    return (
        <Stage
            width={window.innerWidth}
            height={window.innerHeight}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        >
            <Layer>
                {elements.map(renderElement)}
                {/* Render Cursors */}
                {Object.entries(cursors).map(([userId, userCursor]) => (
                    <Group key={userId} x={userCursor.cursor.x} y={userCursor.cursor.y}>
                        <Path
                            data="M3.5 21L12.5 12L17.5 17L21 3.5L3.5 21Z"
                            fill="#EF4444"
                            stroke="#ffffff"
                            strokeWidth={1}
                            scaleX={0.7}
                            scaleY={0.7}
                        />
                        <Text text={userId.substring(0, 5)} fontSize={12} fill="#EF4444" x={15} y={15} />
                    </Group>
                ))}
            </Layer>
        </Stage>
    );
};
