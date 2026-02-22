import React from 'react';
import {
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Type,
  Eraser,
  Hand,
  Trash2,
  Grid3X3,
  Magnet,
  Undo2,
  Redo2,
  Download,
  Copy,
  Layers,
  ArrowUpToLine,
  ArrowDownToLine,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Tool } from '@/types/canvas';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const tools: { tool: Tool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
  { tool: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
  { tool: 'pan', icon: <Hand size={18} />, label: 'Pan', shortcut: 'H' },
  { tool: 'pen', icon: <Pencil size={18} />, label: 'Pen', shortcut: 'P' },
  { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
  { tool: 'circle', icon: <Circle size={18} />, label: 'Circle', shortcut: 'C' },
  { tool: 'line', icon: <Minus size={18} />, label: 'Line', shortcut: 'L' },
  { tool: 'arrow', icon: <ArrowUpRight size={18} />, label: 'Arrow', shortcut: 'A' },
  { tool: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
  { tool: 'eraser', icon: <Eraser size={18} />, label: 'Eraser', shortcut: 'E' },
];

const Toolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    showGrid,
    snapToGrid,
    toggleGrid,
    toggleSnap,
    undo,
    redo,
    clearCanvas,
    selectedIds,
    deleteObjects,
    duplicateObjects,
    bringToFront,
    sendToBack,
    historyIndex,
    history,
  } = useCanvasStore();

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 bg-toolbar rounded-xl p-1.5 shadow-xl shadow-black/30 border border-border">
      {/* Drawing tools */}
      {tools.map(({ tool, icon, label, shortcut }) => (
        <Tooltip key={tool} delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              className={`toolbar-btn ${activeTool === tool ? 'toolbar-btn-active' : ''}`}
              onClick={() => setActiveTool(tool)}
            >
              {icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground">
            {label} {shortcut && <span className="text-muted-foreground ml-1">({shortcut})</span>}
          </TooltipContent>
        </Tooltip>
      ))}

      <div className="h-px bg-border my-1" />

      {/* Actions */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="toolbar-btn" onClick={undo} disabled={historyIndex <= 0}>
            <Undo2 size={18} className={historyIndex <= 0 ? 'opacity-30' : ''} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-popover text-popover-foreground">Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="toolbar-btn" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo2 size={18} className={historyIndex >= history.length - 1 ? 'opacity-30' : ''} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-popover text-popover-foreground">Redo (Ctrl+Y)</TooltipContent>
      </Tooltip>

      <div className="h-px bg-border my-1" />

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className={`toolbar-btn ${showGrid ? 'toolbar-btn-active' : ''}`} onClick={toggleGrid}>
            <Grid3X3 size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-popover text-popover-foreground">Toggle Grid</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className={`toolbar-btn ${snapToGrid ? 'toolbar-btn-active' : ''}`} onClick={toggleSnap}>
            <Magnet size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-popover text-popover-foreground">Snap to Grid</TooltipContent>
      </Tooltip>

      {selectedIds.length > 0 && (
        <>
          <div className="h-px bg-border my-1" />
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button className="toolbar-btn" onClick={() => duplicateObjects(selectedIds)}>
                <Copy size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover text-popover-foreground">Duplicate</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button className="toolbar-btn" onClick={() => bringToFront(selectedIds[0])}>
                <ArrowUpToLine size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover text-popover-foreground">Bring to Front</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button className="toolbar-btn" onClick={() => sendToBack(selectedIds[0])}>
                <ArrowDownToLine size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover text-popover-foreground">Send to Back</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button className="toolbar-btn text-destructive" onClick={() => deleteObjects(selectedIds)}>
                <Trash2 size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover text-popover-foreground">Delete</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
};

export default Toolbar;
