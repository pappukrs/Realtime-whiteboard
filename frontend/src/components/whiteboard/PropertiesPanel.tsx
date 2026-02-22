import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import ColorPicker from './ColorPicker';
import { Slider } from '@/components/ui/slider';

const PropertiesPanel: React.FC = () => {
  const {
    strokeColor,
    fillColor,
    strokeWidth,
    setStrokeColor,
    setFillColor,
    setStrokeWidth,
    selectedIds,
    objects,
  } = useCanvasStore();

  const selectedObject = selectedIds.length === 1
    ? objects.find(o => o.id === selectedIds[0])
    : null;

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-52 bg-toolbar rounded-xl shadow-xl shadow-black/30 border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Properties</span>
      </div>

      <ColorPicker label="Stroke" value={strokeColor} onChange={setStrokeColor} />
      <ColorPicker label="Fill" value={fillColor} onChange={setFillColor} />

      <div className="panel-section">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Stroke Width: {strokeWidth}px
        </label>
        <Slider
          value={[strokeWidth]}
          onValueChange={([v]) => setStrokeWidth(v)}
          min={1}
          max={20}
          step={1}
          className="w-full"
        />
      </div>

      {selectedObject && (
        <div className="panel-section">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
            Selected
          </label>
          <div className="text-xs text-foreground space-y-0.5">
            <p>Type: {selectedObject.type}</p>
            <p>X: {Math.round(selectedObject.x)}, Y: {Math.round(selectedObject.y)}</p>
            {selectedObject.width != null && <p>W: {Math.round(selectedObject.width * selectedObject.scaleX)}</p>}
            {selectedObject.height != null && <p>H: {Math.round(selectedObject.height * selectedObject.scaleY)}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
