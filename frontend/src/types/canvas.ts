export type ToolType = 'select' | 'rectangle' | 'circle' | 'line' | 'pencil' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  text?: string;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  isDragging?: boolean;
}

export interface UserCursor {
  userId: string;
  cursor: Point;
}
