import React from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { MousePointer2, Square, Circle, Minus, Pencil, Type } from 'lucide-react';
import { ToolType } from '../../types/canvas';

export const Toolbar: React.FC = () => {
    const { activeTool, setActiveTool, strokeColor, setAppearance, strokeWidth } = useBoardStore();

    const tools: { id: ToolType; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'select', icon: <MousePointer2 size={18} />, tooltip: 'Select' },
        { id: 'pencil', icon: <Pencil size={18} />, tooltip: 'Pencil' },
        { id: 'rectangle', icon: <Square size={18} />, tooltip: 'Rectangle' },
        { id: 'circle', icon: <Circle size={18} />, tooltip: 'Circle' },
        { id: 'line', icon: <Minus size={18} />, tooltip: 'Line' },
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

            <div className="flex gap-1 items-center">
                {colors.map((color) => (
                    <button
                        key={color}
                        onClick={() => setAppearance(color, strokeWidth)}
                        className={`w-6 h-6 rounded-full border-2 ${strokeColor === color ? 'border-gray-400 scale-110' : 'border-transparent'
                            }`}
                        style={{ backgroundColor: color }}
                    />
                ))}

                <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setAppearance(e.target.value, strokeWidth)}
                    className="w-8 h-8 p-0 border-0 ml-1 rounded cursor-pointer"
                />
            </div>

            <div className="w-px h-8 bg-gray-300 mx-2" />

            <div className="flex gap-2 items-center px-1">
                <label className="text-xs text-gray-500 font-medium">Size</label>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={strokeWidth}
                    onChange={(e) => setAppearance(strokeColor, parseInt(e.target.value))}
                    className="w-20"
                />
            </div>
        </div>
    );
};
