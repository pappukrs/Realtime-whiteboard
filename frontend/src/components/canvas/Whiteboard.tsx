import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group, Path, Arrow } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import { useBoardStore } from '../../store/useBoardStore';
import { useSocket } from '../../hooks/useSocket';
import { CanvasElement, ToolType, Point } from '../../types/canvas';
import { Toolbar } from '../toolbar/Toolbar';

interface WhiteboardProps {
    roomId: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ roomId }) => {
    const {
        elements, activeTool, strokeColor, fillColor, strokeWidth, addElement, updateElement, removeElement, clearElements, cursors,
        zoom, stagePos, showGrid, setZoom, setStagePos, commitHistory, undo, redo, history, historyStep
    } = useBoardStore();
    const { emitDraw, emitCursorMove, emitRemoveElement, emitClearBoard, emitSyncBoard } = useSocket(roomId);

    const [editingText, setEditingText] = useState<{ id: string, text: string, x: number, y: number } | null>(null);
    const stageRef = useRef<any>(null);

    const isDrawing = useRef(false);
    const isPanning = useRef(false);
    const currentShapeId = useRef<string | null>(null);
    const lastPanPos = useRef<Point>({ x: 0, y: 0 });

    // Throttle cursor updates to avoid flooding WebSocket
    const lastCursorMove = useRef<number>(0);

    const getPointerPos = (e: any): Point | null => {
        const stage = e.target.getStage();
        if (!stage) return null;
        const pos = stage.getPointerPosition();
        if (!pos) return null;
        // Adjust for zoom and stage position
        return {
            x: (pos.x - stage.x()) / stage.scaleX(),
            y: (pos.y - stage.y()) / stage.scaleY(),
        };
    };

    const handleWheel = (e: any) => {
        e.evt.preventDefault();
        const stage = e.target.getStage();
        if (!stage) return;

        const scaleBy = 1.1;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

        // Clamp zoom
        const clampedScale = Math.max(0.1, Math.min(newScale, 5));

        setZoom(clampedScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        });
    };

    const handleMouseDown = (e: any) => {
        // Middle click or Pan tool
        if (e.evt.button === 1 || activeTool === 'pan') {
            isPanning.current = true;
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                lastPanPos.current = { x: pos.x, y: pos.y };
            }
            return;
        }

        if (activeTool === 'select' || activeTool === 'eraser') return;

        if (activeTool === 'text') {
            // Dismiss any current editing text first
            if (editingText) {
                handleTextSave();
                return;
            }
            const pos = getPointerPos(e);
            if (!pos) return;
            const id = uuidv4();
            // We need to use setTimeout to ensure React state update happens
            // after the current Konva event cycle completes
            setTimeout(() => {
                setEditingText({ id, text: '', x: pos.x, y: pos.y });
            }, 0);
            return;
        }

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
            fill: fillColor,
            points: activeTool === 'pencil' || activeTool === 'line' || activeTool === 'arrow' ? [pos.x, pos.y, pos.x, pos.y] : undefined,
            width: 0,
            height: 0,
            radius: 0,
        };

        addElement(newElement);
    };

    const handleMouseMove = (e: any) => {
        if (isPanning.current) {
            const stage = e.target.getStage();
            if (!stage) return;
            const pos = stage.getPointerPosition();
            if (pos) {
                const dx = pos.x - lastPanPos.current.x;
                const dy = pos.y - lastPanPos.current.y;
                setStagePos({ x: stagePos.x + dx, y: stagePos.y + dy });
                lastPanPos.current = pos;
            }
            return;
        }

        // Send cursor movement
        const now = Date.now();
        if (now - lastCursorMove.current > 50) {
            const pos = getPointerPos(e);
            if (pos) {
                emitCursorMove(pos);
                lastCursorMove.current = now;
            }
        }

        if (!isDrawing.current || activeTool === 'select' || activeTool === 'pan' || !currentShapeId.current) return;

        const pos = getPointerPos(e);
        if (!pos) return;

        const element = elements.find((el) => el.id === currentShapeId.current);
        if (!element) return;

        let newProps: Partial<CanvasElement> = {};

        if (activeTool === 'pencil' || activeTool === 'line' || activeTool === 'arrow') {
            const points = element.points ? [...element.points] : [];
            if (activeTool === 'pencil') {
                points.push(pos.x, pos.y);
            } else {
                // For line and arrow, replace the end coordinate
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
        if (isPanning.current) {
            isPanning.current = false;
            return;
        }

        if (!isDrawing.current || !currentShapeId.current) return;
        isDrawing.current = false;

        const element = elements.find((el) => el.id === currentShapeId.current);
        if (element) {
            emitDraw(element);
            commitHistory();
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
            onClick: () => {
                if (activeTool === 'eraser') {
                    removeElement(el.id);
                    emitRemoveElement(el.id);
                    commitHistory();
                }
            },
            onTap: () => {
                if (activeTool === 'eraser') {
                    removeElement(el.id);
                    emitRemoveElement(el.id);
                    commitHistory();
                }
            },
            onDragEnd: (e: any) => {
                const update = { x: e.target.x(), y: e.target.y() };
                updateElement(el.id, update);
                emitDraw({ ...el, ...update });
                commitHistory();
            }
        };

        switch (el.type) {
            case 'pencil':
            case 'line':
                return <Line {...commonProps} x={0} y={0} points={el.points || []} lineCap="round" lineJoin="round" />;
            case 'arrow':
                return <Arrow {...commonProps} x={0} y={0} points={el.points || []} fill={el.fill} lineCap="round" lineJoin="round" />;
            case 'rectangle':
                return <Rect {...commonProps} width={el.width || 0} height={el.height || 0} fill={el.fill} />;
            case 'circle':
                return <Circle {...commonProps} radius={el.radius || 0} fill={el.fill} />;
            case 'text':
                return <Text {...commonProps} text={el.text || 'Text'} fontSize={20} fill={el.stroke} />;
            default:
                return null;
        }
    };

    const renderGrid = () => {
        if (!showGrid) return null;

        const gridSize = 40;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Calculate the bounds to draw the grid based on current pan and zoom
        const startX = Math.floor((-stagePos.x / zoom) / gridSize) * gridSize;
        const startY = Math.floor((-stagePos.y / zoom) / gridSize) * gridSize;
        const endX = startX + width / zoom + gridSize * 2;
        const endY = startY + height / zoom + gridSize * 2;

        const gridLines = [];

        for (let x = startX; x < endX; x += gridSize) {
            gridLines.push(
                <Line
                    key={`v-${x}`}
                    points={[x, startY, x, endY]}
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth={1 / zoom}
                />
            );
        }

        for (let y = startY; y < endY; y += gridSize) {
            gridLines.push(
                <Line
                    key={`h-${y}`}
                    points={[startX, y, endX, y]}
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth={1 / zoom}
                />
            );
        }

        return gridLines;
    };

    const handleClear = () => {
        clearElements();
        commitHistory();
        emitClearBoard();
    };

    const handleTextSave = () => {
        if (!editingText) return;
        if (editingText.text.trim()) {
            const newElement: CanvasElement = {
                id: editingText.id,
                type: 'text',
                x: editingText.x,
                y: editingText.y,
                stroke: strokeColor,
                strokeWidth,
                text: editingText.text,
                width: 0,
                height: 0,
                radius: 0
            };
            addElement(newElement);
            emitDraw(newElement);
            commitHistory();
        }
        setEditingText(null);
    };

    const handleUndo = () => {
        undo();
        setTimeout(() => emitSyncBoard(useBoardStore.getState().elements), 0);
    };

    const handleRedo = () => {
        redo();
        setTimeout(() => emitSyncBoard(useBoardStore.getState().elements), 0);
    };

    // Keyboard shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    if (e.shiftKey) handleRedo();
                    else handleUndo();
                } else if (e.key === 'y') {
                    handleRedo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, historyStep]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Toolbar onClear={handleClear} onUndo={handleUndo} onRedo={handleRedo} />
            <Stage
                ref={stageRef}
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                onWheel={handleWheel}
                scaleX={zoom}
                scaleY={zoom}
                x={stagePos.x}
                y={stagePos.y}
                style={{
                    cursor: activeTool === 'pan' ? (isPanning.current ? 'grabbing' : 'grab')
                        : activeTool === 'select' ? 'default' : 'crosshair',
                    backgroundColor: '#FAFAFA' // Slightly off-white for contrast
                }}
            >
                <Layer>
                    {/* Background Grid */}
                    {renderGrid()}

                    {/* Canvas Elements */}
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
            {editingText && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 50,
                        pointerEvents: 'none',
                    }}
                >
                    <textarea
                        value={editingText.text}
                        onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                        onBlur={() => {
                            // Small delay to prevent race conditions
                            setTimeout(() => handleTextSave(), 50);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleTextSave();
                            }
                            if (e.key === 'Escape') {
                                setEditingText(null);
                            }
                        }}
                        autoFocus
                        placeholder="Type here..."
                        style={{
                            position: 'absolute',
                            top: editingText.y * zoom + stagePos.y,
                            left: editingText.x * zoom + stagePos.x,
                            zIndex: 100,
                            pointerEvents: 'auto',
                            margin: 0,
                            padding: '4px 8px',
                            border: '2px solid #3B82F6',
                            borderRadius: '4px',
                            outline: 'none',
                            background: 'rgba(255,255,255,0.95)',
                            resize: 'both',
                            color: strokeColor,
                            fontSize: `${20 * zoom}px`,
                            fontFamily: 'sans-serif',
                            lineHeight: '1.2',
                            minWidth: '120px',
                            minHeight: '36px',
                            boxShadow: '0 2px 12px rgba(59, 130, 246, 0.3)',
                        }}
                    />
                </div>
            )}
        </div>
    );
};
