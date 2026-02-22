import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { CanvasObject, createDefaultObject } from '@/types/canvas';

interface WhiteboardCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  zoom: number,
  stagePos: { x: number; y: number },
  width: number,
  height: number
) => {
  const gridSize = 20;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;

  const startX = Math.floor(-stagePos.x / zoom / gridSize) * gridSize;
  const startY = Math.floor(-stagePos.y / zoom / gridSize) * gridSize;
  const endX = startX + width / zoom + gridSize * 2;
  const endY = startY + height / zoom + gridSize * 2;

  for (let x = startX; x < endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawObject = (ctx: CanvasRenderingContext2D, obj: CanvasObject, isSelected: boolean) => {
  ctx.save();
  ctx.globalAlpha = obj.opacity;
  ctx.translate(obj.x, obj.y);
  ctx.rotate((obj.rotation * Math.PI) / 180);
  ctx.scale(obj.scaleX, obj.scaleY);

  ctx.strokeStyle = obj.stroke;
  ctx.lineWidth = obj.strokeWidth;
  ctx.fillStyle = obj.fill === 'transparent' ? 'rgba(0,0,0,0)' : obj.fill;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (obj.type) {
    case 'freehand': {
      const pts = obj.points || [];
      if (pts.length >= 4) {
        ctx.beginPath();
        ctx.moveTo(pts[0] - obj.x, pts[1] - obj.y);
        for (let i = 2; i < pts.length; i += 2) {
          ctx.lineTo(pts[i] - obj.x, pts[i + 1] - obj.y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'rectangle': {
      const w = obj.width || 0;
      const h = obj.height || 0;
      if (obj.fill !== 'transparent') {
        ctx.fillRect(0, 0, w, h);
      }
      ctx.strokeRect(0, 0, w, h);
      break;
    }
    case 'circle': {
      const r = obj.radius || 0;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      if (obj.fill !== 'transparent') ctx.fill();
      ctx.stroke();
      break;
    }
    case 'line': {
      const pts = obj.points || [0, 0, 0, 0];
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      ctx.lineTo(pts[2], pts[3]);
      ctx.stroke();
      break;
    }
    case 'arrow': {
      const pts = obj.points || [0, 0, 0, 0];
      const dx = pts[2] - pts[0];
      const dy = pts[3] - pts[1];
      const angle = Math.atan2(dy, dx);
      const headLen = 12;

      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      ctx.lineTo(pts[2], pts[3]);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(pts[2], pts[3]);
      ctx.lineTo(pts[2] - headLen * Math.cos(angle - Math.PI / 6), pts[3] - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(pts[2], pts[3]);
      ctx.lineTo(pts[2] - headLen * Math.cos(angle + Math.PI / 6), pts[3] - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.font = `${obj.fontSize || 20}px Inter, sans-serif`;
      ctx.fillStyle = obj.stroke;
      ctx.fillText(obj.text || 'Text', 0, obj.fontSize || 20);
      break;
    }
  }

  // Selection outline
  if (isSelected) {
    ctx.strokeStyle = 'hsl(217, 91%, 60%)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    const bounds = getObjectBounds(obj);
    ctx.strokeRect(bounds.x - obj.x - 4, bounds.y - obj.y - 4, bounds.w + 8, bounds.h + 8);
    ctx.setLineDash([]);

    // Resize handles
    ctx.fillStyle = 'hsl(217, 91%, 60%)';
    const handleSize = 6;
    const corners = [
      [bounds.x - obj.x - 4, bounds.y - obj.y - 4],
      [bounds.x - obj.x + bounds.w + 4, bounds.y - obj.y - 4],
      [bounds.x - obj.x - 4, bounds.y - obj.y + bounds.h + 4],
      [bounds.x - obj.x + bounds.w + 4, bounds.y - obj.y + bounds.h + 4],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    });
  }

  ctx.restore();
};

const getObjectBounds = (obj: CanvasObject) => {
  switch (obj.type) {
    case 'freehand': {
      const pts = obj.points || [];
      if (pts.length < 2) return { x: obj.x, y: obj.y, w: 0, h: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]);
        minY = Math.min(minY, pts[i + 1]);
        maxX = Math.max(maxX, pts[i]);
        maxY = Math.max(maxY, pts[i + 1]);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case 'circle':
      return { x: obj.x - (obj.radius || 0), y: obj.y - (obj.radius || 0), w: (obj.radius || 0) * 2, h: (obj.radius || 0) * 2 };
    case 'line':
    case 'arrow': {
      const pts = obj.points || [0, 0, 0, 0];
      const minX = Math.min(pts[0], pts[2]);
      const minY = Math.min(pts[1], pts[3]);
      const maxX = Math.max(pts[0], pts[2]);
      const maxY = Math.max(pts[1], pts[3]);
      return { x: obj.x + minX, y: obj.y + minY, w: maxX - minX, h: maxY - minY };
    }
    case 'text':
      return { x: obj.x, y: obj.y, w: (obj.text?.length || 4) * (obj.fontSize || 20) * 0.6, h: (obj.fontSize || 20) * 1.2 };
    default:
      return { x: obj.x, y: obj.y, w: Math.abs(obj.width || 0) * obj.scaleX, h: Math.abs(obj.height || 0) * obj.scaleY };
  }
};

const hitTest = (obj: CanvasObject, px: number, py: number): boolean => {
  const bounds = getObjectBounds(obj);
  const margin = 5;
  return px >= bounds.x - margin && px <= bounds.x + bounds.w + margin &&
         py >= bounds.y - margin && py <= bounds.y + bounds.h + margin;
};

const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ canvasRef }) => {
  const {
    objects, activeTool, selectedIds, setSelectedIds,
    strokeColor, fillColor, strokeWidth,
    zoom, stagePos, setZoom, setStagePos,
    showGrid, snapToGrid, gridSize,
    isDrawing, setIsDrawing,
    currentDrawing, setCurrentDrawing,
    addObject, updateObject, deleteObjects, pushHistory,
  } = useCanvasStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const drawStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragObjOrigPos = useRef({ x: 0, y: 0 });
  const animFrameId = useRef<number>(0);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    return {
      x: (e.clientX - stagePos.x) / zoom,
      y: (e.clientY - stagePos.y) / zoom,
    };
  }, [stagePos, zoom]);

  const snapPosition = useCallback((x: number, y: number) => {
    if (!snapToGrid) return { x, y };
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }, [snapToGrid, gridSize]);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Fill background
    ctx.fillStyle = 'hsl(228, 12%, 8%)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(stagePos.x, stagePos.y);
    ctx.scale(zoom, zoom);

    if (showGrid) drawGrid(ctx, zoom, stagePos, w, h);

    const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);
    sortedObjects.forEach(obj => {
      drawObject(ctx, obj, selectedIds.includes(obj.id));
    });

    if (currentDrawing) {
      drawObject(ctx, currentDrawing, false);
    }

    ctx.restore();
  }, [objects, selectedIds, currentDrawing, zoom, stagePos, showGrid, canvasRef]);

  useEffect(() => {
    const loop = () => {
      render();
      animFrameId.current = requestAnimationFrame(loop);
    };
    animFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId.current);
  }, [render]);

  useEffect(() => {
    const handleResize = () => {
      render();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const snapped = snapPosition(pos.x, pos.y);

    if (activeTool === 'pan' || e.button === 1) {
      isPanning.current = true;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === 'select') {
      // Check if clicking on an object
      const sortedObjects = [...objects].sort((a, b) => b.zIndex - a.zIndex);
      const clicked = sortedObjects.find(obj => hitTest(obj, pos.x, pos.y));
      if (clicked) {
        setSelectedIds([clicked.id]);
        isDragging.current = true;
        dragStartPos.current = pos;
        dragObjOrigPos.current = { x: clicked.x, y: clicked.y };
      } else {
        setSelectedIds([]);
      }
      return;
    }

    if (activeTool === 'eraser') {
      const sortedObjects = [...objects].sort((a, b) => b.zIndex - a.zIndex);
      const clicked = sortedObjects.find(obj => hitTest(obj, pos.x, pos.y));
      if (clicked) deleteObjects([clicked.id]);
      return;
    }

    setIsDrawing(true);
    drawStartPos.current = snapped;

    if (activeTool === 'pen') {
      const obj = createDefaultObject('freehand', 0, 0, strokeColor, strokeWidth, fillColor);
      obj.points = [snapped.x, snapped.y];
      setCurrentDrawing(obj);
    } else if (activeTool === 'rectangle') {
      setCurrentDrawing(createDefaultObject('rectangle', snapped.x, snapped.y, strokeColor, strokeWidth, fillColor));
    } else if (activeTool === 'circle') {
      const obj = createDefaultObject('circle', snapped.x, snapped.y, strokeColor, strokeWidth, fillColor);
      obj.radius = 0;
      setCurrentDrawing(obj);
    } else if (activeTool === 'line') {
      const obj = createDefaultObject('line', snapped.x, snapped.y, strokeColor, strokeWidth, fillColor);
      obj.points = [0, 0, 0, 0];
      setCurrentDrawing(obj);
    } else if (activeTool === 'arrow') {
      const obj = createDefaultObject('arrow', snapped.x, snapped.y, strokeColor, strokeWidth, fillColor);
      obj.points = [0, 0, 0, 0];
      setCurrentDrawing(obj);
    } else if (activeTool === 'text') {
      const obj = createDefaultObject('text', snapped.x, snapped.y, strokeColor, strokeWidth, fillColor);
      obj.text = 'Text';
      obj.fontSize = 20;
      addObject(obj);
      setIsDrawing(false);
    }
  }, [activeTool, getCanvasPos, snapPosition, strokeColor, fillColor, strokeWidth, objects, setSelectedIds, setIsDrawing, setCurrentDrawing, deleteObjects, addObject]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPointerPos.current.x;
      const dy = e.clientY - lastPointerPos.current.y;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      setStagePos({ x: stagePos.x + dx, y: stagePos.y + dy });
      return;
    }

    if (isDragging.current && selectedIds.length === 1) {
      const pos = getCanvasPos(e);
      const dx = pos.x - dragStartPos.current.x;
      const dy = pos.y - dragStartPos.current.y;
      updateObject(selectedIds[0], {
        x: dragObjOrigPos.current.x + dx,
        y: dragObjOrigPos.current.y + dy,
      });
      return;
    }

    if (!isDrawing || !currentDrawing) return;
    const pos = getCanvasPos(e);
    const snapped = snapPosition(pos.x, pos.y);

    if (currentDrawing.type === 'freehand') {
      setCurrentDrawing({ ...currentDrawing, points: [...(currentDrawing.points || []), snapped.x, snapped.y] });
    } else if (currentDrawing.type === 'rectangle') {
      setCurrentDrawing({ ...currentDrawing, width: snapped.x - drawStartPos.current.x, height: snapped.y - drawStartPos.current.y });
    } else if (currentDrawing.type === 'circle') {
      const dx = snapped.x - drawStartPos.current.x;
      const dy = snapped.y - drawStartPos.current.y;
      setCurrentDrawing({ ...currentDrawing, radius: Math.sqrt(dx * dx + dy * dy) });
    } else if (currentDrawing.type === 'line' || currentDrawing.type === 'arrow') {
      setCurrentDrawing({ ...currentDrawing, points: [0, 0, snapped.x - drawStartPos.current.x, snapped.y - drawStartPos.current.y] });
    }
  }, [isDrawing, currentDrawing, getCanvasPos, snapPosition, stagePos, setStagePos, setCurrentDrawing, selectedIds, updateObject]);

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) { isPanning.current = false; return; }
    if (isDragging.current) {
      isDragging.current = false;
      pushHistory();
      return;
    }
    if (isDrawing && currentDrawing) {
      addObject(currentDrawing);
      setCurrentDrawing(null);
    }
    setIsDrawing(false);
  }, [isDrawing, currentDrawing, addObject, setCurrentDrawing, setIsDrawing, pushHistory]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleBy = 1.05;
    const oldScale = zoom;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const mousePointTo = { x: (mouseX - stagePos.x) / oldScale, y: (mouseY - stagePos.y) / oldScale };
    const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clamped = Math.max(0.1, Math.min(5, newScale));
    setZoom(clamped);
    setStagePos({ x: mouseX - mousePointTo.x * clamped, y: mouseY - mousePointTo.y * clamped });
  }, [zoom, stagePos, setZoom, setStagePos]);

  const cursorStyle =
    activeTool === 'pan' ? (isPanning.current ? 'grabbing' : 'grab') :
    activeTool === 'select' ? 'default' :
    'crosshair';

  return (
    <div ref={containerRef} className="w-full h-full" style={{ cursor: cursorStyle }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="block"
      />
    </div>
  );
};

export default WhiteboardCanvas;
