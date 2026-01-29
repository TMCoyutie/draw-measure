import { useState, useCallback } from 'react';
import { Point, Line, ToolType } from '@/types/drawing';

const generateId = () => Math.random().toString(36).substr(2, 9);

const getNextLabel = (existingLabels: string[]): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < alphabet.length; i++) {
    if (!existingLabels.includes(alphabet[i])) {
      return alphabet[i];
    }
  }
  return `L${existingLabels.length + 1}`;
};

export const useDrawingState = () => {
  const [points, setPoints] = useState<Point[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('marker');
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const addPoint = useCallback((x: number, y: number): string => {
    const newPoint: Point = { id: generateId(), x, y };
    setPoints(prev => [...prev, newPoint]);
    return newPoint.id;
  }, []);

  const findPointAtPosition = useCallback((x: number, y: number, threshold = 15): Point | null => {
    return points.find(p => {
      const distance = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      return distance <= threshold;
    }) || null;
  }, [points]);

  const lineExists = useCallback((pointId1: string, pointId2: string): boolean => {
    return lines.some(line => 
      (line.startPointId === pointId1 && line.endPointId === pointId2) ||
      (line.startPointId === pointId2 && line.endPointId === pointId1)
    );
  }, [lines]);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (currentTool !== 'marker') return;

    const existingPoint = findPointAtPosition(x, y);

    if (activePointId === null) {
      // No active point - start a new line
      if (existingPoint) {
        setActivePointId(existingPoint.id);
      } else {
        const newPointId = addPoint(x, y);
        setActivePointId(newPointId);
      }
    } else {
      // Have an active point - complete the line
      let endPointId: string;
      
      if (existingPoint) {
        if (existingPoint.id === activePointId) {
          // Clicked same point, cancel
          return;
        }
        endPointId = existingPoint.id;
      } else {
        endPointId = addPoint(x, y);
      }

      // Check if line already exists
      if (!lineExists(activePointId, endPointId)) {
        const existingLabels = lines.map(l => l.label);
        const newLine: Line = {
          id: generateId(),
          label: getNextLabel(existingLabels),
          startPointId: activePointId,
          endPointId: endPointId,
        };
        setLines(prev => [...prev, newLine]);
      }

      // Continue from the end point for continuous drawing
      setActivePointId(endPointId);
    }
  }, [currentTool, activePointId, findPointAtPosition, addPoint, lineExists, lines]);

  const deletePoint = useCallback((pointId: string) => {
    // Remove all lines connected to this point
    setLines(prev => prev.filter(line => 
      line.startPointId !== pointId && line.endPointId !== pointId
    ));
    // Remove the point
    setPoints(prev => prev.filter(p => p.id !== pointId));
    
    if (activePointId === pointId) {
      setActivePointId(null);
    }
    if (selectedPointId === pointId) {
      setSelectedPointId(null);
    }
  }, [activePointId, selectedPointId]);

  const deleteLine = useCallback((lineId: string) => {
    setLines(prev => prev.filter(l => l.id !== lineId));
    if (selectedLineId === lineId) {
      setSelectedLineId(null);
    }
  }, [selectedLineId]);

  const selectPoint = useCallback((pointId: string | null) => {
    setSelectedPointId(pointId);
    setSelectedLineId(null);
  }, []);

  const selectLine = useCallback((lineId: string | null) => {
    setSelectedLineId(lineId);
    setSelectedPointId(null);
  }, []);

  const cancelActivePoint = useCallback(() => {
    setActivePointId(null);
  }, []);

  const getPointById = useCallback((id: string): Point | undefined => {
    return points.find(p => p.id === id);
  }, [points]);

  const calculateLineLength = useCallback((line: Line): number => {
    const startPoint = getPointById(line.startPointId);
    const endPoint = getPointById(line.endPointId);
    if (!startPoint || !endPoint) return 0;
    return Math.sqrt((endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2);
  }, [getPointById]);

  return {
    points,
    lines,
    currentTool,
    setCurrentTool,
    activePointId,
    selectedPointId,
    selectedLineId,
    mousePosition,
    setMousePosition,
    handleCanvasClick,
    deletePoint,
    deleteLine,
    selectPoint,
    selectLine,
    cancelActivePoint,
    getPointById,
    calculateLineLength,
  };
};
