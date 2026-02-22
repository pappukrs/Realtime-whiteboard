import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';

const PRESET_COLORS = [
  '#FFFFFF', '#A0A0A0', '#505050', '#000000',
  '#FF6B6B', '#FF922B', '#FFD43B', '#51CF66',
  '#339AF0', '#845EF7', '#F06595', '#20C997',
];

const ColorPicker: React.FC<{
  value: string;
  onChange: (color: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  return (
    <div className="panel-section">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">{label}</label>
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            className={`w-7 h-7 rounded-md border-2 transition-all ${
              value === color ? 'border-primary scale-110' : 'border-transparent hover:border-muted-foreground/30'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          className={`w-7 h-7 rounded-md border-2 transition-all ${
            value === 'transparent' ? 'border-primary' : 'border-muted-foreground/20'
          }`}
          onClick={() => onChange('transparent')}
          style={{
            background: 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 8px 8px',
          }}
          title="Transparent"
        />
        <input
          type="color"
          value={value === 'transparent' ? '#000000' : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
        />
        <span className="text-xs text-muted-foreground font-mono">{value === 'transparent' ? 'none' : value}</span>
      </div>
    </div>
  );
};

export default ColorPicker;
