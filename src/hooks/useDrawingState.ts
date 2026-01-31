import { useState, useCallback } from 'react';
import { Point, Line, Angle, Circle, ToolType } from '@/types/drawing';

const generateId = () => Math.random().toString(36).substr(2, 9);
const DEFAULT_CIRCLE_RADIUS = 50;

const getNextLabel = (existingLabels: string[]): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < alphabet.length; i++) {
    if (!existingLabels.includes(alphabet[i])) {
      return alphabet[i];
    }
  }
  return `L${existingLabels.length + 1}`;
};

const getNextAngleLabel = (existingLabels: string[]): string => {
  for (let i = 1; i <= 99; i++) {
    const label = `θ${i}`;
    if (!existingLabels.includes(label)) {
      return label;
    }
  }
  return `θ${existingLabels.length + 1}`;
};

export const useDrawingState = () => {
  const [points, setPoints] = useState<Point[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [isCircleSelected, setIsCircleSelected] = useState(false);
  const [currentTool, setCurrentToolInternal] = useState<ToolType>('marker');
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [selectedAngleIds, setSelectedAngleIds] = useState<Set<string>>(new Set());
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [angleFirstLineId, setAngleFirstLineId] = useState<string | null>(null);

  // Helper to find orphaned points (not connected to any line)
  const findOrphanedPointIds = useCallback((currentLines: Line[], currentPoints: Point[]): string[] => {
    const connectedPointIds = new Set<string>();
    currentLines.forEach(line => {
      connectedPointIds.add(line.startPointId);
      connectedPointIds.add(line.endPointId);
    });
    return currentPoints
      .filter(p => !connectedPointIds.has(p.id))
      .map(p => p.id);
  }, []);

  // Custom setCurrentTool that handles cleanup when switching tools
  const setCurrentTool = useCallback((tool: ToolType) => {
    // Deselect circle when switching away from circle tool
    if (tool !== 'circle') {
      setIsCircleSelected(false);
    }
    
    if (tool === 'cursor') {
      // Cancel active point when switching to cursor
      setActivePointId(null);
      setAngleFirstLineId(null);
      // Clean up orphaned points
      setPoints(prevPoints => {
        setLines(prevLines => {
          const orphanedIds = findOrphanedPointIds(prevLines, prevPoints);
          if (orphanedIds.length > 0) {
            // Use setTimeout to avoid state update during render
            setTimeout(() => {
              setPoints(p => p.filter(point => !orphanedIds.includes(point.id)));
            }, 0);
          }
          return prevLines;
        });
        return prevPoints;
      });
    } else if (tool === 'marker') {
      setAngleFirstLineId(null);
    } else if (tool === 'angle') {
      setActivePointId(null);
      setAngleFirstLineId(null);
    } else if (tool === 'circle') {
      setActivePointId(null);
      setAngleFirstLineId(null);
    }
    setCurrentToolInternal(tool);
  }, [findOrphanedPointIds]);

  // Circle tool handlers
  const handleCircleToolClick = useCallback((x: number, y: number) => {
    if (circle) return; // Only allow one circle
    const newCircle: Circle = {
      id: generateId(),
      centerX: x,
      centerY: y,
      radius: DEFAULT_CIRCLE_RADIUS,
    };
    setCircle(newCircle);
  }, [circle]);

  const selectCircle = useCallback(() => {
    if (currentTool === 'circle') {
      setIsCircleSelected(true);
      // Clear other selections
      setSelectedPointIds(new Set());
      setSelectedLineIds(new Set());
      setSelectedAngleIds(new Set());
    }
  }, [currentTool]);

  const updateCircle = useCallback((updates: Partial<Circle>) => {
    setCircle(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const deleteCircle = useCallback(() => {
    setCircle(null);
    setIsCircleSelected(false);
  }, []);

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

  // Helper to find orphaned points (used for deletion cleanup)
  const findOrphanedPoints = useCallback((remainingLines: Line[], allPoints: Point[]): string[] => {
    return findOrphanedPointIds(remainingLines, allPoints);
  }, [findOrphanedPointIds]);

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
      // Clean up angles that reference deleted lines
      const deletedLineIds = prev
        .filter(line => line.startPointId === pointId || line.endPointId === pointId)
        .map(l => l.id);
      setAngles(prevAngles => 
        prevAngles.filter(a => !deletedLineIds.includes(a.line1Id) && !deletedLineIds.includes(a.line2Id))
      );
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
      // Clean up angles that reference this line
      setAngles(prevAngles => 
        prevAngles.filter(a => a.line1Id !== lineId && a.line2Id !== lineId)
      );
      return newLines;
    });
    setSelectedLineIds(prev => {
      const next = new Set(prev);
      next.delete(lineId);
      return next;
    });
  }, [findOrphanedPoints]);

  const deleteAngle = useCallback((angleId: string) => {
    setAngles(prev => prev.filter(a => a.id !== angleId));
    setSelectedAngleIds(prev => {
      const next = new Set(prev);
      next.delete(angleId);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    // Delete selected circle first
    if (isCircleSelected) {
      setCircle(null);
      setIsCircleSelected(false);
    }
    
    // Delete selected angles
    setAngles(prev => prev.filter(a => !selectedAngleIds.has(a.id)));
    
    // Delete selected lines
    setLines(prev => {
      let newLines = prev.filter(l => !selectedLineIds.has(l.id));
      
      // Also delete lines connected to selected points
      newLines = newLines.filter(line => 
        !selectedPointIds.has(line.startPointId) && !selectedPointIds.has(line.endPointId)
      );
      
      // Clean up angles that reference deleted lines
      const deletedLineIds = new Set([
        ...selectedLineIds,
        ...prev.filter(line => 
          selectedPointIds.has(line.startPointId) || selectedPointIds.has(line.endPointId)
        ).map(l => l.id)
      ]);
      setAngles(prevAngles => 
        prevAngles.filter(a => !deletedLineIds.has(a.line1Id) && !deletedLineIds.has(a.line2Id))
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
    setSelectedAngleIds(new Set());
  }, [selectedLineIds, selectedPointIds, selectedAngleIds, activePointId, findOrphanedPoints, isCircleSelected]);

  const clearAll = useCallback(() => {
    setPoints([]);
    setLines([]);
    setAngles([]);
    setCircle(null);
    setIsCircleSelected(false);
    setActivePointId(null);
    setAngleFirstLineId(null);
    setSelectedPointIds(new Set());
    setSelectedLineIds(new Set());
    setSelectedAngleIds(new Set());
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
      setSelectedAngleIds(new Set());
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
      setSelectedAngleIds(new Set());
    }
  }, []);

  const selectAngle = useCallback((angleId: string | null, ctrlKey: boolean = false) => {
    if (angleId === null) {
      setSelectedAngleIds(new Set());
      return;
    }
    
    if (ctrlKey) {
      setSelectedAngleIds(prev => {
        const next = new Set(prev);
        if (next.has(angleId)) {
          next.delete(angleId);
        } else {
          next.add(angleId);
        }
        return next;
      });
    } else {
      setSelectedAngleIds(new Set([angleId]));
      setSelectedPointIds(new Set());
      setSelectedLineIds(new Set());
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPointIds(new Set());
    setSelectedLineIds(new Set());
    setSelectedAngleIds(new Set());
  }, []);

  const cancelActivePoint = useCallback(() => {
    setActivePointId(null);
    setAngleFirstLineId(null);
  }, []);

  const getPointById = useCallback((id: string): Point | undefined => {
    return points.find(p => p.id === id);
  }, [points]);

  const getLineById = useCallback((id: string): Line | undefined => {
    return lines.find(l => l.id === id);
  }, [lines]);

  const calculateLineLength = useCallback((line: Line): number => {
    const startPoint = getPointById(line.startPointId);
    const endPoint = getPointById(line.endPointId);
    if (!startPoint || !endPoint) return 0;
    return Math.sqrt((endPoint.x - startPoint.x) ** 2 + (endPoint.y - startPoint.y) ** 2);
  }, [getPointById]);

  const updatePointPosition = useCallback((pointId: string, x: number, y: number) => {
    setPoints(prev => prev.map(p => 
      p.id === pointId ? { ...p, x, y } : p
    ));
  }, []);

  // Find common point between two lines
  const findCommonPoint = useCallback((line1: Line, line2: Line): string | null => {
    if (line1.startPointId === line2.startPointId || line1.startPointId === line2.endPointId) {
      return line1.startPointId;
    }
    if (line1.endPointId === line2.startPointId || line1.endPointId === line2.endPointId) {
      return line1.endPointId;
    }
    return null;
  }, []);

  // Calculate angle between two lines at their common vertex
  const calculateAngleBetweenLines = useCallback((line1: Line, line2: Line, vertexPointId: string): number => {
    const vertex = getPointById(vertexPointId);
    if (!vertex) return 0;

    // Get the other point of each line (not the vertex)
    const p1Id = line1.startPointId === vertexPointId ? line1.endPointId : line1.startPointId;
    const p2Id = line2.startPointId === vertexPointId ? line2.endPointId : line2.startPointId;
    
    const p1 = getPointById(p1Id);
    const p2 = getPointById(p2Id);
    
    if (!p1 || !p2) return 0;

    // Calculate vectors from vertex to each point
    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };

    // Calculate angle using dot product
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angleRad = Math.acos(cosAngle);
    return angleRad * (180 / Math.PI);
  }, [getPointById]);

  // Handle line click for angle tool
  const handleAngleToolLineClick = useCallback((lineId: string) => {
    if (angleFirstLineId === null) {
      // First line selection
      setAngleFirstLineId(lineId);
    } else if (angleFirstLineId === lineId) {
      // Clicked same line, cancel
      setAngleFirstLineId(null);
    } else {
      // Second line selection - create angle
      const line1 = getLineById(angleFirstLineId);
      const line2 = getLineById(lineId);
      
      if (line1 && line2) {
        const commonPointId = findCommonPoint(line1, line2);
        
        if (commonPointId) {
          // Check if angle already exists
          const angleExists = angles.some(a => 
            (a.line1Id === angleFirstLineId && a.line2Id === lineId) ||
            (a.line1Id === lineId && a.line2Id === angleFirstLineId)
          );
          
          if (!angleExists) {
            const degrees = calculateAngleBetweenLines(line1, line2, commonPointId);
            const existingLabels = angles.map(a => a.label);
            const newAngle: Angle = {
              id: generateId(),
              label: getNextAngleLabel(existingLabels),
              line1Id: angleFirstLineId,
              line2Id: lineId,
              vertexPointId: commonPointId,
              degrees,
            };
            setAngles(prev => [...prev, newAngle]);
          }
        }
      }
      setAngleFirstLineId(null);
    }
  }, [angleFirstLineId, getLineById, findCommonPoint, calculateAngleBetweenLines, angles]);

  // Recalculate all angles when points change
  const recalculateAngles = useCallback(() => {
    setAngles(prev => prev.map(angle => {
      const line1 = getLineById(angle.line1Id);
      const line2 = getLineById(angle.line2Id);
      if (!line1 || !line2) return angle;
      const degrees = calculateAngleBetweenLines(line1, line2, angle.vertexPointId);
      return { ...angle, degrees };
    }));
  }, [getLineById, calculateAngleBetweenLines]);

  const hasSelection = selectedPointIds.size > 0 || selectedLineIds.size > 0 || selectedAngleIds.size > 0 || isCircleSelected;

  return {
    points,
    lines,
    angles,
    circle,
    isCircleSelected,
    currentTool,
    setCurrentTool,
    activePointId,
    angleFirstLineId,
    selectedPointIds,
    selectedLineIds,
    selectedAngleIds,
    mousePosition,
    setMousePosition,
    handleCanvasClick,
    handleCircleToolClick,
    handleAngleToolLineClick,
    deletePoint,
    deleteLine,
    deleteAngle,
    deleteCircle,
    deleteSelected,
    clearAll,
    selectPoint,
    selectLine,
    selectAngle,
    selectCircle,
    updateCircle,
    clearSelection,
    cancelActivePoint,
    getPointById,
    getLineById,
    calculateLineLength,
    updatePointPosition,
    recalculateAngles,
    hasSelection,
  };
};
