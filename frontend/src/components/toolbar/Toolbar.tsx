import React from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import {
    MousePointer2, Square, Circle, Minus, Pencil, Type, Hand,
    ArrowUpRight, Eraser, Trash2, Droplets, Undo2, Redo2,
    Copy, ArrowUpToLine, ArrowDownToLine, Trash
} from 'lucide-react';
import { ToolType } from '../../types/canvas';

interface ToolbarProps {
    onClear?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onBringToFront?: () => void;
    onSendToBack?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    onClear, onUndo, onRedo, onDelete, onDuplicate, onBringToFront, onSendToBack
}) => {
    const {
        activeTool, setActiveTool, strokeColor, fillColor, setAppearance, setFillColor,
        strokeWidth, history, historyStep, selectedElementIds
    } = useBoardStore();

    const hasSelection = selectedElementIds.length > 0;

    const tools: { id: ToolType; icon: React.ReactNode; tooltip: string }[] = [
        { id: 'select', icon: <MousePointer2 size={18} />, tooltip: 'Select (V)' },
        { id: 'pan', icon: <Hand size={18} />, tooltip: 'Pan Canvas (H)' },
        { id: 'eraser', icon: <Eraser size={18} />, tooltip: 'Eraser (E)' },
        { id: 'pencil', icon: <Pencil size={18} />, tooltip: 'Pencil (P)' },
        { id: 'rectangle', icon: <Square size={18} />, tooltip: 'Rectangle (R)' },
        { id: 'circle', icon: <Circle size={18} />, tooltip: 'Circle (C)' },
        { id: 'line', icon: <Minus size={18} />, tooltip: 'Line (L)' },
        { id: 'arrow', icon: <ArrowUpRight size={18} />, tooltip: 'Arrow (A)' },
        { id: 'text', icon: <Type size={18} />, tooltip: 'Text (T)' },
    ];

    const colors = ['#000000', '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center bg-white shadow-md rounded-lg p-2 gap-2 border border-gray-200 z-10">
            {/* Tool Buttons */}
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

            <div className="w-px h-8 bg-gray-300 mx-1" />

            {/* Stroke Color */}
            <div className="flex gap-2 items-center px-1">
                <label className="text-xs text-gray-500 font-medium">Border</label>
                <div className="flex gap-1">
                    {colors.map((color) => (
                        <button
                            key={color}
                            onClick={() => setAppearance(color, strokeWidth)}
                            className={`w-5 h-5 rounded-full border-2 ${strokeColor === color ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                    <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => setAppearance(e.target.value, strokeWidth)}
                        className="w-5 h-5 p-0 border-0 ml-1 rounded cursor-pointer"
                        title="Custom Stroke Color"
                    />
                </div>
            </div>

            <div className="w-px h-8 bg-gray-300 mx-1" />

            {/* Fill Color */}
            <div className="flex gap-2 items-center px-1">
                <label className="text-xs text-gray-500 font-medium flex items-center gap-1"><Droplets size={12} /> Fill</label>
                <div className="flex gap-1">
                    <button
                        onClick={() => setFillColor('transparent')}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${fillColor === 'transparent' ? 'border-gray-400 scale-110' : 'border-gray-200'}`}
                        title="Transparent"
                    >
                        <div className="w-px h-3 bg-red-500 transform rotate-45" />
                    </button>
                    {colors.map((color) => (
                        <button
                            key={'fill-' + color}
                            onClick={() => setFillColor(color)}
                            className={`w-5 h-5 rounded-full border-2 ${fillColor === color ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                    <input
                        type="color"
                        value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                        onChange={(e) => setFillColor(e.target.value)}
                        className="w-5 h-5 p-0 border-0 ml-1 rounded cursor-pointer"
                        title="Custom Fill Color"
                    />
                </div>
            </div>

            <div className="w-px h-8 bg-gray-300 mx-1" />

            {/* Stroke Width */}
            <div className="flex gap-2 items-center px-1">
                <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Size</label>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={strokeWidth}
                    onChange={(e) => setAppearance(strokeColor, parseInt(e.target.value))}
                    className="w-14"
                />
            </div>

            <div className="w-px h-8 bg-gray-300 mx-1" />

            {/* Undo / Redo */}
            <div className="flex gap-1">
                <button
                    onClick={onUndo}
                    disabled={historyStep <= 0}
                    title="Undo (Ctrl+Z)"
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30"
                >
                    <Undo2 size={16} />
                </button>
                <button
                    onClick={onRedo}
                    disabled={historyStep >= history.length - 1}
                    title="Redo (Ctrl+Y)"
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30"
                >
                    <Redo2 size={16} />
                </button>
            </div>

            <div className="w-px h-8 bg-gray-300 mx-1" />

            {/* Selection Actions */}
            <div className="flex gap-1">
                <button
                    onClick={onDuplicate}
                    disabled={!hasSelection}
                    title="Duplicate (Ctrl+D)"
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30"
                >
                    <Copy size={16} />
                </button>
                <button
                    onClick={onDelete}
                    disabled={!hasSelection}
                    title="Delete Selected (Del)"
                    className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors disabled:opacity-30"
                >
                    <Trash size={16} />
                </button>
            </div>

            <div className="w-px h-8 bg-gray-300 mx-1" />

            {/* Layer Ordering */}
            <div className="flex gap-1">
                <button
                    onClick={onBringToFront}
                    disabled={!hasSelection}
                    title="Bring to Front"
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30"
                >
                    <ArrowUpToLine size={16} />
                </button>
                <button
                    onClick={onSendToBack}
                    disabled={!hasSelection}
                    title="Send to Back"
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30"
                >
                    <ArrowDownToLine size={16} />
                </button>
            </div>

            <div className="w-px h-8 bg-gray-300 mx-1" />

            {/* Clear All */}
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
