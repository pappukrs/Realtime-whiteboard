import { create } from 'zustand';
import { CanvasObject, Tool, createDefaultObject } from '@/types/canvas';
import { v4 as uuidv4 } from 'uuid';

interface HistoryEntry {
  objects: CanvasObject[];
}

interface CanvasStore {
  // Tool state
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;

  // Style state
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;

  // Canvas state
  objects: CanvasObject[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  
  // Object operations
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObjects: (ids: string[]) => void;
  clearCanvas: () => void;
  duplicateObjects: (ids: string[]) => void;

  // Layer ordering
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Zoom & Pan
  zoom: number;
  stagePos: { x: number; y: number };
  setZoom: (zoom: number) => void;
  setStagePos: (pos: { x: number; y: number }) => void;

  // Grid
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  toggleGrid: () => void;
  toggleSnap: () => void;

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Drawing state
  isDrawing: boolean;
  setIsDrawing: (v: boolean) => void;
  currentDrawing: CanvasObject | null;
  setCurrentDrawing: (obj: CanvasObject | null) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool, selectedIds: [] }),

  strokeColor: '#4A9EFF',
  fillColor: 'transparent',
  strokeWidth: 2,
  setStrokeColor: (color) => {
    set({ strokeColor: color });
    const { selectedIds, objects } = get();
    if (selectedIds.length > 0) {
      set({
        objects: objects.map(o =>
          selectedIds.includes(o.id) ? { ...o, stroke: color } : o
        ),
      });
    }
  },
  setFillColor: (color) => {
    set({ fillColor: color });
    const { selectedIds, objects } = get();
    if (selectedIds.length > 0) {
      set({
        objects: objects.map(o =>
          selectedIds.includes(o.id) ? { ...o, fill: color } : o
        ),
      });
    }
  },
  setStrokeWidth: (width) => {
    set({ strokeWidth: width });
    const { selectedIds, objects } = get();
    if (selectedIds.length > 0) {
      set({
        objects: objects.map(o =>
          selectedIds.includes(o.id) ? { ...o, strokeWidth: width } : o
        ),
      });
    }
  },

  objects: [],
  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),

  addObject: (obj) => {
    const state = get();
    state.pushHistory();
    set({ objects: [...state.objects, obj] });
  },
  updateObject: (id, updates) => {
    set({
      objects: get().objects.map(o => (o.id === id ? { ...o, ...updates } : o)),
    });
  },
  deleteObjects: (ids) => {
    const state = get();
    state.pushHistory();
    set({
      objects: state.objects.filter(o => !ids.includes(o.id)),
      selectedIds: [],
    });
  },
  clearCanvas: () => {
    const state = get();
    state.pushHistory();
    set({ objects: [], selectedIds: [] });
  },
  duplicateObjects: (ids) => {
    const state = get();
    state.pushHistory();
    const dupes = state.objects
      .filter(o => ids.includes(o.id))
      .map(o => ({ ...o, id: uuidv4(), x: o.x + 20, y: o.y + 20, zIndex: Date.now() }));
    set({ objects: [...state.objects, ...dupes], selectedIds: dupes.map(d => d.id) });
  },

  bringToFront: (id) => {
    set({
      objects: get().objects.map(o =>
        o.id === id ? { ...o, zIndex: Date.now() } : o
      ),
    });
  },
  sendToBack: (id) => {
    const min = Math.min(...get().objects.map(o => o.zIndex));
    set({
      objects: get().objects.map(o =>
        o.id === id ? { ...o, zIndex: min - 1 } : o
      ),
    });
  },

  zoom: 1,
  stagePos: { x: 0, y: 0 },
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setStagePos: (pos) => set({ stagePos: pos }),

  showGrid: true,
  snapToGrid: false,
  gridSize: 20,
  toggleGrid: () => set({ showGrid: !get().showGrid }),
  toggleSnap: () => set({ snapToGrid: !get().snapToGrid }),

  history: [{ objects: [] }],
  historyIndex: 0,
  pushHistory: () => {
    const { history, historyIndex, objects } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ objects: JSON.parse(JSON.stringify(objects)) });
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        historyIndex: newIndex,
        objects: JSON.parse(JSON.stringify(history[newIndex].objects)),
        selectedIds: [],
      });
    }
  },
  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        historyIndex: newIndex,
        objects: JSON.parse(JSON.stringify(history[newIndex].objects)),
        selectedIds: [],
      });
    }
  },

  isDrawing: false,
  setIsDrawing: (v) => set({ isDrawing: v }),
  currentDrawing: null,
  setCurrentDrawing: (obj) => set({ currentDrawing: obj }),
}));
