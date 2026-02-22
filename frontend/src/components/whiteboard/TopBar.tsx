import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Download, Trash2, FileJson } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TopBarProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const TopBar: React.FC<TopBarProps> = ({ canvasRef }) => {
  const { clearCanvas, objects } = useCanvasStore();

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportJSON = () => {
    const data = JSON.stringify({ objects, version: 1 }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'whiteboard.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-toolbar rounded-lg p-1 shadow-xl shadow-black/30 border border-border">
      <div className="px-3 py-1 text-sm font-semibold text-foreground select-none">
        Whiteboard
      </div>
      <div className="w-px h-5 bg-border" />

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="toolbar-btn" onClick={exportPNG}>
            <Download size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground">Export PNG</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="toolbar-btn" onClick={exportJSON}>
            <FileJson size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground">Export JSON</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="toolbar-btn text-destructive" onClick={clearCanvas}>
            <Trash2 size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground">Clear Canvas</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default TopBar;
