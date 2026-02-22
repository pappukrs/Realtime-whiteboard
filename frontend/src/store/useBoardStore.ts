import { create } from 'zustand';
import { CanvasElement, ToolType, UserCursor, Point } from '../types/canvas';

interface BoardState {
    elements: CanvasElement[];
    cursors: Record<string, UserCursor>;
    activeTool: ToolType;
    selectedElementId: string | null;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;

    // History
    history: CanvasElement[][];
    historyStep: number;

    // View State
    zoom: number;
    stagePos: Point;
    showGrid: boolean;

    // Actions
    setElements: (elements: CanvasElement[]) => void;
    addElement: (element: CanvasElement) => void;
    updateElement: (id: string, newProps: Partial<CanvasElement>) => void;
    removeElement: (id: string) => void;
    clearElements: () => void;

    commitHistory: () => void;
    undo: () => void;
    redo: () => void;

    updateCursor: (userId: string, cursor: UserCursor) => void;
    removeCursor: (userId: string) => void;

    setActiveTool: (tool: ToolType) => void;
    setSelectedElementId: (id: string | null) => void;
    setAppearance: (color: string, width: number) => void;
    setFillColor: (color: string) => void;

    setZoom: (zoom: number) => void;
    setStagePos: (pos: Point) => void;
    setShowGrid: (show: boolean) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
    elements: [],
    cursors: {},
    activeTool: 'select',
    selectedElementId: null,
    strokeColor: '#000000',
    fillColor: 'transparent',
    strokeWidth: 2,
    history: [[]],
    historyStep: 0,
    zoom: 1,
    stagePos: { x: 0, y: 0 },
    showGrid: true,

    setElements: (elements) => set({ elements }),

    addElement: (element) =>
        set((state) => {
            if (state.elements.some((el) => el.id === element.id)) {
                return { elements: state.elements.map((el) => el.id === element.id ? element : el) };
            }
            return { elements: [...state.elements, element] };
        }),

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

    clearElements: () => set({ elements: [], selectedElementId: null }),

    commitHistory: () => set((state) => {
        const newHistory = state.history.slice(0, state.historyStep + 1);
        newHistory.push([...state.elements]);
        return {
            history: newHistory,
            historyStep: newHistory.length - 1
        };
    }),

    undo: () => set((state) => {
        if (state.historyStep > 0) {
            return {
                historyStep: state.historyStep - 1,
                elements: state.history[state.historyStep - 1],
                selectedElementId: null
            };
        }
        return state;
    }),

    redo: () => set((state) => {
        if (state.historyStep < state.history.length - 1) {
            return {
                historyStep: state.historyStep + 1,
                elements: state.history[state.historyStep + 1],
                selectedElementId: null
            };
        }
        return state;
    }),

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
    setFillColor: (color) => set({ fillColor: color }),
    setZoom: (zoom) => set({ zoom }),
    setStagePos: (stagePos) => set({ stagePos }),
    setShowGrid: (showGrid) => set({ showGrid })
}));
