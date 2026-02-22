import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Minus, Plus, Maximize } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ZoomControls: React.FC = () => {
  const { zoom, setZoom, setStagePos } = useCanvasStore();

  const zoomIn = () => setZoom(zoom + 0.1);
  const zoomOut = () => setZoom(zoom - 0.1);
  const resetZoom = () => {
    setZoom(1);
    setStagePos({ x: 0, y: 0 });
  };

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-toolbar rounded-lg p-1 shadow-xl shadow-black/30 border border-border">
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="toolbar-btn" onClick={zoomOut}>
            <Minus size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground">Zoom Out</TooltipContent>
      </Tooltip>

      <button
        className="px-2 py-1 text-xs font-medium text-foreground hover:bg-toolbar-hover rounded transition-colors min-w-[50px] text-center"
        onClick={resetZoom}
      >
        {Math.round(zoom * 100)}%
      </button>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="toolbar-btn" onClick={zoomIn}>
            <Plus size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground">Zoom In</TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-border mx-0.5" />

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="toolbar-btn" onClick={resetZoom}>
            <Maximize size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground">Fit to Screen</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ZoomControls;
