import { create } from 'zustand';
import { CanvasElement, ToolType, UserCursor } from '../types/canvas';

interface BoardState {
    elements: CanvasElement[];
    cursors: Record<string, UserCursor>;
    activeTool: ToolType;
    selectedElementId: string | null;
    strokeColor: string;
    strokeWidth: number;

    // Actions
    setElements: (elements: CanvasElement[]) => void;
    addElement: (element: CanvasElement) => void;
    updateElement: (id: string, newProps: Partial<CanvasElement>) => void;
    removeElement: (id: string) => void;

    updateCursor: (userId: string, cursor: UserCursor) => void;
    removeCursor: (userId: string) => void;

    setActiveTool: (tool: ToolType) => void;
    setSelectedElementId: (id: string | null) => void;
    setAppearance: (color: string, width: number) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
    elements: [],
    cursors: {},
    activeTool: 'select',
    selectedElementId: null,
    strokeColor: '#000000',
    strokeWidth: 2,

    setElements: (elements) => set({ elements }),

    addElement: (element) =>
        set((state) => ({ elements: [...state.elements, element] })),

    updateElement: (id, newProps) =>
        set((state) => ({
            elements: state.elements.map((el) =>
                el.id === id ? { ...el, ...newProps } : el
            ),
        })),

    removeElement: (id) =>
        set((state) => ({
            elements: state.elements.filter((el) => el.id !== id),
            selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
        })),

    updateCursor: (userId, cursor) =>
        set((state) => ({
            cursors: { ...state.cursors, [userId]: cursor },
        })),

    removeCursor: (userId) =>
        set((state) => {
            const newCursors = { ...state.cursors };
            delete newCursors[userId];
            return { cursors: newCursors };
        }),

    setActiveTool: (tool) => set({ activeTool: tool, selectedElementId: null }),
    setSelectedElementId: (id) => set({ selectedElementId: id }),
    setAppearance: (color, width) => set({ strokeColor: color, strokeWidth: width }),
}));
