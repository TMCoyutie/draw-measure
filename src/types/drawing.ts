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

export interface Angle {
  id: string;
  label: string;
  line1Id: string;
  line2Id: string;
  vertexPointId: string; // The common point between the two lines
  degrees: number;
}

export interface Circle {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
}

export type ToolType = 'cursor' | 'marker' | 'angle' | 'circle';
