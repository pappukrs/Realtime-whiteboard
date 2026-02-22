import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group, Path, Arrow, Transformer } from 'react-konva';
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
        elements, activeTool, strokeColor, fillColor, strokeWidth, addElement, updateElement,
        removeElement, removeElements, clearElements, cursors,
        zoom, stagePos, showGrid, setZoom, setStagePos, commitHistory, undo, redo, history, historyStep,
        selectedElementIds, setSelectedElementIds, toggleSelectElement,
        copySelected, pasteClipboard, duplicateSelected,
        bringToFront, sendToBack, getNextZIndex
    } = useBoardStore();
    const { emitDraw, emitCursorMove, emitRemoveElement, emitRemoveElements, emitClearBoard, emitSyncBoard } = useSocket(roomId);

    const [editingText, setEditingText] = useState<{ id: string, text: string, x: number, y: number } | null>(null);
    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);
    const layerRef = useRef<any>(null);

    const isDrawing = useRef(false);
    const isPanning = useRef(false);
    const currentShapeId = useRef<string | null>(null);
    const lastPanPos = useRef<Point>({ x: 0, y: 0 });
    const lastCursorMove = useRef<number>(0);

    // Attach Transformer to selected nodes
    useEffect(() => {
        if (!transformerRef.current || !layerRef.current) return;
        const stage = stageRef.current;
        if (!stage) return;

        const selectedNodes = selectedElementIds
            .map((id) => stage.findOne('#' + id))
            .filter(Boolean);

        transformerRef.current.nodes(selectedNodes);
        transformerRef.current.getLayer()?.batchDraw();
    }, [selectedElementIds, elements]);

    const getPointerPos = (e: any): Point | null => {
        const stage = e.target.getStage();
        if (!stage) return null;
        const pos = stage.getPointerPosition();
        if (!pos) return null;
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

        // Select tool — handle click on empty area (deselect)
        if (activeTool === 'select') {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
                setSelectedElementIds([]);
            }
            return;
        }

        if (activeTool === 'eraser') return;

        if (activeTool === 'text') {
            if (editingText) {
                handleTextSave();
                return;
            }
            const pos = getPointerPos(e);
            if (!pos) return;
            const id = uuidv4();
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
            zIndex: getNextZIndex(),
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

    // Handle clicking on an element
    const handleElementClick = (e: any, el: CanvasElement) => {
        if (activeTool === 'eraser') {
            removeElement(el.id);
            emitRemoveElement(el.id);
            commitHistory();
            return;
        }

        if (activeTool === 'select') {
            e.cancelBubble = true; // prevent stage click deselect
            if (e.evt.shiftKey) {
                toggleSelectElement(el.id);
            } else {
                setSelectedElementIds([el.id]);
            }
        }
    };

    // Handle transform end (resize/rotate)
    const handleTransformEnd = (e: any, el: CanvasElement) => {
        const node = e.target;
        const update: Partial<CanvasElement> = {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
        };

        // For shapes, apply scale to dimensions instead of keeping scaleX/scaleY
        if (el.type === 'rectangle') {
            update.width = Math.max(5, node.width() * node.scaleX());
            update.height = Math.max(5, node.height() * node.scaleY());
            update.scaleX = 1;
            update.scaleY = 1;
        } else if (el.type === 'circle') {
            update.radius = Math.max(5, (el.radius || 0) * Math.max(node.scaleX(), node.scaleY()));
            update.scaleX = 1;
            update.scaleY = 1;
        }

        updateElement(el.id, update);
        emitDraw({ ...el, ...update });
        commitHistory();
    };

    const handleDragEnd = (e: any, el: CanvasElement) => {
        const update = { x: e.target.x(), y: e.target.y() };
        updateElement(el.id, update);
        emitDraw({ ...el, ...update });
        commitHistory();
    };

    const renderElement = (el: CanvasElement) => {
        const isSelected = selectedElementIds.includes(el.id);
        const commonProps = {
            key: el.id,
            id: el.id,
            x: el.x,
            y: el.y,
            stroke: el.stroke,
            strokeWidth: el.strokeWidth,
            rotation: el.rotation || 0,
            scaleX: el.scaleX || 1,
            scaleY: el.scaleY || 1,
            draggable: activeTool === 'select',
            onClick: (e: any) => handleElementClick(e, el),
            onTap: (e: any) => handleElementClick(e, el),
            onDragEnd: (e: any) => handleDragEnd(e, el),
            onTransformEnd: (e: any) => handleTransformEnd(e, el),
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

    // Sort by zIndex for render order
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    const renderGrid = () => {
        if (!showGrid) return null;

        const gridSize = 40;
        const width = window.innerWidth;
        const height = window.innerHeight;

        const startX = Math.floor((-stagePos.x / zoom) / gridSize) * gridSize;
        const startY = Math.floor((-stagePos.y / zoom) / gridSize) * gridSize;
        const endX = startX + width / zoom + gridSize * 2;
        const endY = startY + height / zoom + gridSize * 2;

        const gridLines = [];

        for (let x = startX; x < endX; x += gridSize) {
            gridLines.push(
                <Line key={`v-${x}`} points={[x, startY, x, endY]} stroke="rgba(0,0,0,0.05)" strokeWidth={1 / zoom} />
            );
        }

        for (let y = startY; y < endY; y += gridSize) {
            gridLines.push(
                <Line key={`h-${y}`} points={[startX, y, endX, y]} stroke="rgba(0,0,0,0.05)" strokeWidth={1 / zoom} />
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
                radius: 0,
                zIndex: getNextZIndex(),
            };
            addElement(newElement);
            emitDraw(newElement);
            commitHistory();
        }
        setEditingText(null);
    };

    const handleUndo = useCallback(() => {
        undo();
        setTimeout(() => emitSyncBoard(useBoardStore.getState().elements), 0);
    }, []);

    const handleRedo = useCallback(() => {
        redo();
        setTimeout(() => emitSyncBoard(useBoardStore.getState().elements), 0);
    }, []);

    const handleDeleteSelected = useCallback(() => {
        const ids = useBoardStore.getState().selectedElementIds;
        if (ids.length === 0) return;
        emitRemoveElements(ids);
        removeElements(ids);
        commitHistory();
    }, []);

    const handleCopy = useCallback(() => {
        copySelected();
    }, []);

    const handlePaste = useCallback(() => {
        pasteClipboard();
        commitHistory();
        // Emit new pasted elements
        setTimeout(() => {
            const state = useBoardStore.getState();
            state.selectedElementIds.forEach((id) => {
                const el = state.elements.find((e) => e.id === id);
                if (el) emitDraw(el);
            });
        }, 0);
    }, []);

    const handleDuplicate = useCallback(() => {
        duplicateSelected();
        commitHistory();
        setTimeout(() => {
            const state = useBoardStore.getState();
            state.selectedElementIds.forEach((id) => {
                const el = state.elements.find((e) => e.id === id);
                if (el) emitDraw(el);
            });
        }, 0);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't fire shortcuts when typing in textarea
            if (editingText) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) handleRedo();
                    else handleUndo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    handleRedo();
                } else if (e.key === 'c') {
                    e.preventDefault();
                    handleCopy();
                } else if (e.key === 'v') {
                    e.preventDefault();
                    handlePaste();
                } else if (e.key === 'd') {
                    e.preventDefault();
                    handleDuplicate();
                }
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Don't delete if focused on an input
                if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
                e.preventDefault();
                handleDeleteSelected();
            }

            if (e.key === 'Escape') {
                setSelectedElementIds([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingText, handleUndo, handleRedo, handleCopy, handlePaste, handleDuplicate, handleDeleteSelected]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Toolbar
                onClear={handleClear}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onDelete={handleDeleteSelected}
                onDuplicate={handleDuplicate}
                onBringToFront={bringToFront}
                onSendToBack={sendToBack}
            />
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
                        : activeTool === 'select' ? 'default'
                            : activeTool === 'eraser' ? 'not-allowed'
                                : 'crosshair',
                    backgroundColor: '#FAFAFA'
                }}
            >
                <Layer ref={layerRef}>
                    {renderGrid()}

                    {sortedElements.map(renderElement)}

                    {/* Transformer for selected elements */}
                    <Transformer
                        ref={transformerRef}
                        boundBoxFunc={(oldBox, newBox) => {
                            if (newBox.width < 5 || newBox.height < 5) return oldBox;
                            return newBox;
                        }}
                        rotateEnabled={true}
                        enabledAnchors={[
                            'top-left', 'top-center', 'top-right',
                            'middle-left', 'middle-right',
                            'bottom-left', 'bottom-center', 'bottom-right',
                        ]}
                        anchorSize={8}
                        anchorCornerRadius={2}
                        borderStroke="#3B82F6"
                        borderStrokeWidth={1.5}
                        anchorStroke="#3B82F6"
                        anchorFill="#ffffff"
                    />

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
                        top: 0, left: 0, width: '100%', height: '100%',
                        zIndex: 50, pointerEvents: 'none',
                    }}
                >
                    <textarea
                        value={editingText.text}
                        onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                        onBlur={() => setTimeout(() => handleTextSave(), 50)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSave(); }
                            if (e.key === 'Escape') setEditingText(null);
                        }}
                        autoFocus
                        placeholder="Type here..."
                        style={{
                            position: 'absolute',
                            top: editingText.y * zoom + stagePos.y,
                            left: editingText.x * zoom + stagePos.x,
                            zIndex: 100, pointerEvents: 'auto',
                            margin: 0, padding: '4px 8px',
                            border: '2px solid #3B82F6', borderRadius: '4px',
                            outline: 'none', background: 'rgba(255,255,255,0.95)',
                            resize: 'both', color: strokeColor,
                            fontSize: `${20 * zoom}px`, fontFamily: 'sans-serif',
                            lineHeight: '1.2', minWidth: '120px', minHeight: '36px',
                            boxShadow: '0 2px 12px rgba(59, 130, 246, 0.3)',
                        }}
                    />
                </div>
            )}
        </div>
    );
};
