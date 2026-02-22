import { create } from 'zustand';
import { CanvasElement, ToolType, UserCursor, Point } from '../types/canvas';
import { v4 as uuidv4 } from 'uuid';

interface BoardState {
    elements: CanvasElement[];
    cursors: Record<string, UserCursor>;
    activeTool: ToolType;
    selectedElementIds: string[];
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    clipboard: CanvasElement[];

    // History
    history: CanvasElement[][];
    historyStep: number;

    // View State
    zoom: number;
    stagePos: Point;
    showGrid: boolean;

    // z-index counter
    zIndexCounter: number;

    // Actions
    setElements: (elements: CanvasElement[]) => void;
    addElement: (element: CanvasElement) => void;
    updateElement: (id: string, newProps: Partial<CanvasElement>) => void;
    removeElement: (id: string) => void;
    removeElements: (ids: string[]) => void;
    clearElements: () => void;

    commitHistory: () => void;
    undo: () => void;
    redo: () => void;

    updateCursor: (userId: string, cursor: UserCursor) => void;
    removeCursor: (userId: string) => void;

    setActiveTool: (tool: ToolType) => void;
    setSelectedElementIds: (ids: string[]) => void;
    toggleSelectElement: (id: string) => void;
    setAppearance: (color: string, width: number) => void;
    setFillColor: (color: string) => void;

    setZoom: (zoom: number) => void;
    setStagePos: (pos: Point) => void;
    setShowGrid: (show: boolean) => void;

    // Clipboard
    copySelected: () => void;
    pasteClipboard: () => void;
    duplicateSelected: () => void;

    // Layer ordering
    bringToFront: () => void;
    sendToBack: () => void;
    moveUp: () => void;
    moveDown: () => void;

    getNextZIndex: () => number;
}

export const useBoardStore = create<BoardState>((set, get) => ({
    elements: [],
    cursors: {},
    activeTool: 'select',
    selectedElementIds: [],
    strokeColor: '#000000',
    fillColor: 'transparent',
    strokeWidth: 2,
    clipboard: [],
    history: [[]],
    historyStep: 0,
    zoom: 1,
    stagePos: { x: 0, y: 0 },
    showGrid: true,
    zIndexCounter: 1,

    setElements: (elements) => set({ elements }),

    getNextZIndex: () => {
        const counter = get().zIndexCounter;
        set({ zIndexCounter: counter + 1 });
        return counter;
    },

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
            selectedElementIds: state.selectedElementIds.filter((sid) => sid !== id),
        })),

    removeElements: (ids) =>
        set((state) => ({
            elements: state.elements.filter((el) => !ids.includes(el.id)),
            selectedElementIds: [],
        })),

    clearElements: () => set({ elements: [], selectedElementIds: [] }),

    commitHistory: () => set((state) => {
        const newHistory = state.history.slice(0, state.historyStep + 1);
        newHistory.push([...state.elements]);
        if (newHistory.length > 50) newHistory.shift();
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
                selectedElementIds: []
            };
        }
        return state;
    }),

    redo: () => set((state) => {
        if (state.historyStep < state.history.length - 1) {
            return {
                historyStep: state.historyStep + 1,
                elements: state.history[state.historyStep + 1],
                selectedElementIds: []
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

    setActiveTool: (tool) => set({ activeTool: tool, selectedElementIds: [] }),
    setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),
    toggleSelectElement: (id) => set((state) => {
        if (state.selectedElementIds.includes(id)) {
            return { selectedElementIds: state.selectedElementIds.filter((sid) => sid !== id) };
        }
        return { selectedElementIds: [...state.selectedElementIds, id] };
    }),
    setAppearance: (color, width) => set({ strokeColor: color, strokeWidth: width }),
    setFillColor: (color) => set({ fillColor: color }),
    setZoom: (zoom) => set({ zoom }),
    setStagePos: (stagePos) => set({ stagePos }),
    setShowGrid: (showGrid) => set({ showGrid }),

    // Clipboard
    copySelected: () => {
        const { elements, selectedElementIds } = get();
        const copied = elements.filter((el) => selectedElementIds.includes(el.id));
        set({ clipboard: copied });
    },

    pasteClipboard: () => {
        const { clipboard, zIndexCounter } = get();
        if (clipboard.length === 0) return;
        const newElements = clipboard.map((el, i) => ({
            ...el,
            id: uuidv4(),
            x: el.x + 20,
            y: el.y + 20,
            zIndex: zIndexCounter + i,
        }));
        set((state) => ({
            elements: [...state.elements, ...newElements],
            selectedElementIds: newElements.map((el) => el.id),
            zIndexCounter: state.zIndexCounter + newElements.length,
        }));
    },

    duplicateSelected: () => {
        const { elements, selectedElementIds, zIndexCounter } = get();
        const selected = elements.filter((el) => selectedElementIds.includes(el.id));
        if (selected.length === 0) return;
        const dupes = selected.map((el, i) => ({
            ...el,
            id: uuidv4(),
            x: el.x + 20,
            y: el.y + 20,
            zIndex: zIndexCounter + i,
        }));
        set((state) => ({
            elements: [...state.elements, ...dupes],
            selectedElementIds: dupes.map((el) => el.id),
            zIndexCounter: state.zIndexCounter + dupes.length,
        }));
    },

    // Layer ordering
    bringToFront: () => {
        const { selectedElementIds, elements } = get();
        if (selectedElementIds.length === 0) return;
        const maxZ = Math.max(...elements.map((el) => el.zIndex));
        set({
            elements: elements.map((el) =>
                selectedElementIds.includes(el.id) ? { ...el, zIndex: maxZ + 1 } : el
            ),
        });
    },

    sendToBack: () => {
        const { selectedElementIds, elements } = get();
        if (selectedElementIds.length === 0) return;
        const minZ = Math.min(...elements.map((el) => el.zIndex));
        set({
            elements: elements.map((el) =>
                selectedElementIds.includes(el.id) ? { ...el, zIndex: minZ - 1 } : el
            ),
        });
    },

    moveUp: () => {
        const { selectedElementIds, elements } = get();
        if (selectedElementIds.length === 0) return;
        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
        const selZIndexes = sorted.filter((el) => selectedElementIds.includes(el.id)).map((el) => el.zIndex);
        const maxSelZ = Math.max(...selZIndexes);
        const above = sorted.find((el) => !selectedElementIds.includes(el.id) && el.zIndex > maxSelZ);
        if (!above) return;
        set({
            elements: elements.map((el) => {
                if (selectedElementIds.includes(el.id)) return { ...el, zIndex: el.zIndex + 1 };
                if (el.id === above.id) return { ...el, zIndex: el.zIndex - 1 };
                return el;
            }),
        });
    },

    moveDown: () => {
        const { selectedElementIds, elements } = get();
        if (selectedElementIds.length === 0) return;
        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
        const selZIndexes = sorted.filter((el) => selectedElementIds.includes(el.id)).map((el) => el.zIndex);
        const minSelZ = Math.min(...selZIndexes);
        const below = sorted.filter((el) => !selectedElementIds.includes(el.id) && el.zIndex < minSelZ).pop();
        if (!below) return;
        set({
            elements: elements.map((el) => {
                if (selectedElementIds.includes(el.id)) return { ...el, zIndex: el.zIndex - 1 };
                if (el.id === below.id) return { ...el, zIndex: el.zIndex + 1 };
                return el;
            }),
        });
    },
}));
