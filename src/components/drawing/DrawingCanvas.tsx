import { useRef, useEffect, useState } from 'react';
import { Point, Line, ToolType } from '@/types/drawing';

interface DrawingCanvasProps {
  image: string | null;
  points: Point[];
  lines: Line[];
  activePointId: string | null;
  selectedPointIds: Set<string>;
  selectedLineIds: Set<string>;
  currentTool: ToolType;
  mousePosition: { x: number; y: number } | null;
  showLengthLabels: boolean;
  onCanvasClick: (x: number, y: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onMouseLeave: () => void;
  onPointClick: (pointId: string, ctrlKey: boolean) => void;
  onLineClick: (lineId: string, ctrlKey: boolean) => void;
  onClearSelection: () => void;
  onPointDrag: (pointId: string, x: number, y: number) => void;
  getPointById: (id: string) => Point | undefined;
  calculateLineLength: (line: Line) => number;
}

export const DrawingCanvas = ({
  image,
  points,
  lines,
  activePointId,
  selectedPointIds,
  selectedLineIds,
  currentTool,
  mousePosition,
  showLengthLabels,
  onCanvasClick,
  onMouseMove,
  onMouseLeave,
  onPointClick,
  onLineClick,
  onClearSelection,
  onPointDrag,
  getPointById,
  calculateLineLength,
}: DrawingCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  useEffect(() => {
    if (image) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = image;
    }
  }, [image]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingPointId) return; // Don't trigger click during drag
    
    if (currentTool === 'marker') {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onCanvasClick(x, y);
    } else if (currentTool === 'cursor') {
      onClearSelection();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggingPointId && currentTool === 'cursor') {
      onPointDrag(draggingPointId, x, y);
    }
    
    onMouseMove(x, y);
  };

  const handleMouseUp = () => {
    setDraggingPointId(null);
  };

  const handlePointMouseDown = (e: React.MouseEvent, pointId: string) => {
    if (currentTool === 'cursor') {
      e.stopPropagation();
      setDraggingPointId(pointId);
    }
  };

  const activePoint = activePointId ? getPointById(activePointId) : null;

  const getLineCenter = (line: Line) => {
    const start = getPointById(line.startPointId);
    const end = getPointById(line.endPointId);
    if (!start || !end) return null;
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
  };

  const getDisplayLabel = (line: Line) => {
    if (showLengthLabels) {
      return calculateLineLength(line).toFixed(1);
    }
    return line.label;
  };

  const getLabelWidth = (label: string) => {
    const charCount = label.length;
    return Math.max(24, charCount * 10 + 8);
  };

  return (
    <div 
      ref={containerRef}
      className="canvas-container flex-1 flex items-center justify-center p-8 overflow-auto"
    >
      {!image ? (
        <div className="text-center text-muted-foreground">
          <p className="text-lg">請上傳圖片開始繪圖</p>
        </div>
      ) : (
        <div className="relative inline-block shadow-2xl rounded-lg overflow-hidden">
          <svg
            width={imageSize?.width || 800}
            height={imageSize?.height || 600}
            className={`${currentTool === 'marker' ? 'cursor-crosshair' : draggingPointId ? 'cursor-grabbing' : 'cursor-default'}`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setDraggingPointId(null);
              onMouseLeave();
            }}
          >
            {/* Background image */}
            <image
              href={image}
              width={imageSize?.width || 800}
              height={imageSize?.height || 600}
            />

            {/* Completed lines */}
            {lines.map(line => {
              const startPoint = getPointById(line.startPointId);
              const endPoint = getPointById(line.endPointId);
              if (!startPoint || !endPoint) return null;

              const isSelected = selectedLineIds.has(line.id);
              const center = getLineCenter(line);
              const displayLabel = getDisplayLabel(line);
              const labelWidth = getLabelWidth(displayLabel);

              return (
                <g key={line.id}>
                  {/* Invisible wider line for easier click detection */}
                  <line
                    x1={startPoint.x}
                    y1={startPoint.y}
                    x2={endPoint.x}
                    y2={endPoint.y}
                    stroke="transparent"
                    strokeWidth={16}
                    onClick={(e) => {
                      if (currentTool === 'cursor' && !draggingPointId) {
                        e.stopPropagation();
                        onLineClick(line.id, e.ctrlKey || e.metaKey);
                      }
                    }}
                    style={{ cursor: currentTool === 'cursor' ? 'pointer' : 'inherit' }}
                  />
                  {/* Visible line */}
                  <line
                    x1={startPoint.x}
                    y1={startPoint.y}
                    x2={endPoint.x}
                    y2={endPoint.y}
                    className={`measurement-line ${isSelected ? 'stroke-primary' : ''}`}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Line label */}
                  {center && (
                    <g transform={`translate(${center.x}, ${center.y})`}>
                      <rect
                        x={-labelWidth / 2}
                        y="-10"
                        width={labelWidth}
                        height="20"
                        rx="4"
                        fill="hsl(var(--secondary))"
                        className={isSelected ? 'fill-primary' : ''}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-white text-xs font-bold select-none"
                        style={{ pointerEvents: 'none' }}
                      >
                        {displayLabel}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Active line (being drawn) */}
            {activePoint && mousePosition && (
              <line
                x1={activePoint.x}
                y1={activePoint.y}
                x2={mousePosition.x}
                y2={mousePosition.y}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5,5"
                className="animate-pulse-glow"
              />
            )}

            {/* Points */}
            {points.map(point => {
              const isActive = activePointId === point.id;
              const isSelected = selectedPointIds.has(point.id);
              const isDragging = draggingPointId === point.id;

              return (
                <g key={point.id}>
                  {/* Invisible larger circle for easier click/drag detection */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={20}
                    fill="transparent"
                    style={{ cursor: currentTool === 'cursor' ? (isDragging ? 'grabbing' : 'grab') : 'inherit' }}
                    onMouseDown={(e) => handlePointMouseDown(e, point.id)}
                    onClick={(e) => {
                      if (currentTool === 'cursor' && !draggingPointId) {
                        e.stopPropagation();
                        onPointClick(point.id, e.ctrlKey || e.metaKey);
                      }
                    }}
                  />
                  {/* Visible point */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isActive || isSelected ? 8 : 6}
                    className={`marker-point ${isSelected ? 'selected' : ''}`}
                    fill={isActive ? 'hsl(var(--accent))' : 'hsl(var(--marker-color))'}
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};
