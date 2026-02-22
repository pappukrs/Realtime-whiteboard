import React from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { MousePointer2, Square, Circle, Minus, Pencil, Type, Hand, ArrowUpRight, Eraser, Trash2, Droplets, Undo2, Redo2 } from 'lucide-react';
import { ToolType } from '../../types/canvas';

export const Toolbar: React.FC<{ onClear?: () => void, onUndo?: () => void, onRedo?: () => void }> = ({ onClear, onUndo, onRedo }) => {
    const { activeTool, setActiveTool, strokeColor, fillColor, setAppearance, setFillColor, strokeWidth, history, historyStep } = useBoardStore();

    const tools: { id: ToolType; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'select', icon: <MousePointer2 size={18} />, tooltip: 'Select' },
        { id: 'pan', icon: <Hand size={18} />, tooltip: 'Pan Canvas' },
        { id: 'eraser', icon: <Eraser size={18} />, tooltip: 'Eraser' },
        { id: 'pencil', icon: <Pencil size={18} />, tooltip: 'Pencil' },
        { id: 'rectangle', icon: <Square size={18} />, tooltip: 'Rectangle' },
        { id: 'circle', icon: <Circle size={18} />, tooltip: 'Circle' },
        { id: 'line', icon: <Minus size={18} />, tooltip: 'Line' },
        { id: 'arrow', icon: <ArrowUpRight size={18} />, tooltip: 'Arrow' },
        { id: 'text', icon: <Type size={18} />, tooltip: 'Text' },
    ];

    const colors = ['#000000', '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center bg-white shadow-md rounded-lg p-2 gap-2 border border-gray-200 z-10">
            <div className="flex bg-gray-100 p-1 rounded-md">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        title={tool.tooltip}
                        onClick={() => setActiveTool(tool.id)}
                        className={`p-2 rounded-md mx-0.5 transition-colors ${activeTool === tool.id
                            ? 'bg-white shadow-sm text-blue-600'
                            : 'text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {tool.icon}
                    </button>
                ))}
            </div>

            <div className="w-px h-8 bg-gray-300 mx-2" />

            <div className="flex gap-2 items-center px-1">
                <label className="text-xs text-gray-500 font-medium">Border</label>
                <div className="flex gap-1">
                    {colors.map((color) => (
                        <button
                            key={color}
                            onClick={() => setAppearance(color, strokeWidth)}
                            className={`w-6 h-6 rounded-full border-2 ${strokeColor === color ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                    <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => setAppearance(e.target.value, strokeWidth)}
                        className="w-6 h-6 p-0 border-0 ml-1 rounded cursor-pointer"
                        title="Custom Stroke Color"
                    />
                </div>
            </div>

            <div className="w-px h-8 bg-gray-300 mx-1" />

            <div className="flex gap-2 items-center px-1">
                <label className="text-xs text-gray-500 font-medium flex items-center gap-1"><Droplets size={12} /> Fill</label>
                <div className="flex gap-1">
                    <button
                        onClick={() => setFillColor('transparent')}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white ${fillColor === 'transparent' ? 'border-gray-400 scale-110' : 'border-gray-200'}`}
                        title="Transparent"
                    >
                        <div className="w-px h-4 bg-red-500 transform rotate-45" />
                    </button>
                    {colors.map((color) => (
                        <button
                            key={'fill-' + color}
                            onClick={() => setFillColor(color)}
                            className={`w-6 h-6 rounded-full border-2 ${fillColor === color ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                    <input
                        type="color"
                        value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                        onChange={(e) => setFillColor(e.target.value)}
                        className="w-6 h-6 p-0 border-0 ml-1 rounded cursor-pointer"
                        title="Custom Fill Color"
                    />
                </div>
            </div>

            <div className="w-px h-8 bg-gray-300 mx-2" />

            <div className="flex gap-2 items-center px-1">
                <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Size</label>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={strokeWidth}
                    onChange={(e) => setAppearance(strokeColor, parseInt(e.target.value))}
                    className="w-16"
                />
            </div>

            <div className="w-px h-8 bg-gray-300 mx-1" />

            <button
                onClick={onClear}
                title="Clear Canvas"
                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
};
