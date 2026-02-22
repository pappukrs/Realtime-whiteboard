import { useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';

export const useKeyboardShortcuts = () => {
  const {
    setActiveTool,
    undo,
    redo,
    selectedIds,
    deleteObjects,
    duplicateObjects,
  } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Tool shortcuts
      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 'v': setActiveTool('select'); break;
          case 'h': setActiveTool('pan'); break;
          case 'p': setActiveTool('pen'); break;
          case 'r': setActiveTool('rectangle'); break;
          case 'c': setActiveTool('circle'); break;
          case 'l': setActiveTool('line'); break;
          case 'a': setActiveTool('arrow'); break;
          case 't': setActiveTool('text'); break;
          case 'e': setActiveTool('eraser'); break;
          case 'delete':
          case 'backspace':
            if (selectedIds.length > 0) {
              e.preventDefault();
              deleteObjects(selectedIds);
            }
            break;
        }
      }

      // Ctrl shortcuts
      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'd':
            e.preventDefault();
            if (selectedIds.length > 0) duplicateObjects(selectedIds);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, undo, redo, selectedIds, deleteObjects, duplicateObjects]);
};
