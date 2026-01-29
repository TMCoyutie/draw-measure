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
  const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
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

  // Helper to find orphaned points (not connected to any line)
  const findOrphanedPoints = useCallback((remainingLines: Line[], allPoints: Point[]): string[] => {
    const connectedPointIds = new Set<string>();
    remainingLines.forEach(line => {
      connectedPointIds.add(line.startPointId);
      connectedPointIds.add(line.endPointId);
    });
    return allPoints
      .filter(p => !connectedPointIds.has(p.id))
      .map(p => p.id);
  }, []);

  const deletePoint = useCallback((pointId: string) => {
    setLines(prev => {
      const newLines = prev.filter(line => 
        line.startPointId !== pointId && line.endPointId !== pointId
      );
      // Clean up orphaned points after removing lines
      setPoints(prevPoints => {
        const remainingPoints = prevPoints.filter(p => p.id !== pointId);
        const orphanedIds = findOrphanedPoints(newLines, remainingPoints);
        return remainingPoints.filter(p => !orphanedIds.includes(p.id));
      });
      return newLines;
    });
    
    if (activePointId === pointId) {
      setActivePointId(null);
    }
    setSelectedPointIds(prev => {
      const next = new Set(prev);
      next.delete(pointId);
      return next;
    });
  }, [activePointId, findOrphanedPoints]);

  const deleteLine = useCallback((lineId: string) => {
    setLines(prev => {
      const newLines = prev.filter(l => l.id !== lineId);
      // Clean up orphaned points after removing line
      setPoints(prevPoints => {
        const orphanedIds = findOrphanedPoints(newLines, prevPoints);
        return prevPoints.filter(p => !orphanedIds.includes(p.id));
      });
      return newLines;
    });
    setSelectedLineIds(prev => {
      const next = new Set(prev);
      next.delete(lineId);
      return next;
    });
  }, [findOrphanedPoints]);

  const deleteSelected = useCallback(() => {
    // Delete selected lines first
    setLines(prev => {
      let newLines = prev.filter(l => !selectedLineIds.has(l.id));
      
      // Also delete lines connected to selected points
      newLines = newLines.filter(line => 
        !selectedPointIds.has(line.startPointId) && !selectedPointIds.has(line.endPointId)
      );
      
      // Clean up orphaned points
      setPoints(prevPoints => {
        const remainingPoints = prevPoints.filter(p => !selectedPointIds.has(p.id));
        const orphanedIds = findOrphanedPoints(newLines, remainingPoints);
        return remainingPoints.filter(p => !orphanedIds.includes(p.id));
      });
      
      return newLines;
    });
    
    // Clear active point if deleted
    if (selectedPointIds.has(activePointId || '')) {
      setActivePointId(null);
    }
    
    // Clear selections
    setSelectedPointIds(new Set());
    setSelectedLineIds(new Set());
  }, [selectedLineIds, selectedPointIds, activePointId, findOrphanedPoints]);

  const clearAll = useCallback(() => {
    setPoints([]);
    setLines([]);
    setActivePointId(null);
    setSelectedPointIds(new Set());
    setSelectedLineIds(new Set());
  }, []);

  const selectPoint = useCallback((pointId: string | null, ctrlKey: boolean = false) => {
    if (pointId === null) {
      setSelectedPointIds(new Set());
      return;
    }
    
    if (ctrlKey) {
      setSelectedPointIds(prev => {
        const next = new Set(prev);
        if (next.has(pointId)) {
          next.delete(pointId);
        } else {
          next.add(pointId);
        }
        return next;
      });
    } else {
      setSelectedPointIds(new Set([pointId]));
      setSelectedLineIds(new Set());
    }
  }, []);

  const selectLine = useCallback((lineId: string | null, ctrlKey: boolean = false) => {
    if (lineId === null) {
      setSelectedLineIds(new Set());
      return;
    }
    
    if (ctrlKey) {
      setSelectedLineIds(prev => {
        const next = new Set(prev);
        if (next.has(lineId)) {
          next.delete(lineId);
        } else {
          next.add(lineId);
        }
        return next;
      });
    } else {
      setSelectedLineIds(new Set([lineId]));
      setSelectedPointIds(new Set());
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPointIds(new Set());
    setSelectedLineIds(new Set());
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

  const hasSelection = selectedPointIds.size > 0 || selectedLineIds.size > 0;

  return {
    points,
    lines,
    currentTool,
    setCurrentTool,
    activePointId,
    selectedPointIds,
    selectedLineIds,
    mousePosition,
    setMousePosition,
    handleCanvasClick,
    deletePoint,
    deleteLine,
    deleteSelected,
    clearAll,
    selectPoint,
    selectLine,
    clearSelection,
    cancelActivePoint,
    getPointById,
    calculateLineLength,
    hasSelection,
  };
};
