export interface Point {
  id: string;
  x: number;
  y: number;
}

export interface Line {
  id: string;
  label: string;
  startPointId: string;
  endPointId: string;
}

export type ToolType = 'cursor' | 'marker';
