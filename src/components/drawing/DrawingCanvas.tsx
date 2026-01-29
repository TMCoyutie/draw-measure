import { useRef, useEffect, useState } from 'react';
import { Point, Line, ToolType } from '@/types/drawing';

interface DrawingCanvasProps {
  image: string | null;
  points: Point[];
  lines: Line[];
  activePointId: string | null;
  selectedPointId: string | null;
  selectedLineId: string | null;
  currentTool: ToolType;
  mousePosition: { x: number; y: number } | null;
  onCanvasClick: (x: number, y: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onMouseLeave: () => void;
  onPointClick: (pointId: string) => void;
  onLineClick: (lineId: string) => void;
  getPointById: (id: string) => Point | undefined;
}

export const DrawingCanvas = ({
  image,
  points,
  lines,
  activePointId,
  selectedPointId,
  selectedLineId,
  currentTool,
  mousePosition,
  onCanvasClick,
  onMouseMove,
  onMouseLeave,
  onPointClick,
  onLineClick,
  getPointById,
}: DrawingCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

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
    if (currentTool !== 'marker') return;
    
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onCanvasClick(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onMouseMove(x, y);
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
            className={`${currentTool === 'marker' ? 'cursor-crosshair' : 'cursor-default'}`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={onMouseLeave}
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

              const isSelected = selectedLineId === line.id;
              const center = getLineCenter(line);

              return (
                <g key={line.id}>
                  <line
                    x1={startPoint.x}
                    y1={startPoint.y}
                    x2={endPoint.x}
                    y2={endPoint.y}
                    className={`measurement-line ${isSelected ? 'stroke-primary' : ''}`}
                    strokeWidth={isSelected ? 3 : 2}
                    onClick={(e) => {
                      if (currentTool === 'cursor') {
                        e.stopPropagation();
                        onLineClick(line.id);
                      }
                    }}
                    style={{ cursor: currentTool === 'cursor' ? 'pointer' : 'inherit' }}
                  />
                  {/* Line label */}
                  {center && (
                    <g transform={`translate(${center.x}, ${center.y})`}>
                      <rect
                        x="-12"
                        y="-10"
                        width="24"
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
                        {line.label}
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
              const isSelected = selectedPointId === point.id;

              return (
                <circle
                  key={point.id}
                  cx={point.x}
                  cy={point.y}
                  r={isActive || isSelected ? 8 : 6}
                  className={`marker-point ${isSelected ? 'selected' : ''}`}
                  fill={isActive ? 'hsl(var(--accent))' : 'hsl(var(--marker-color))'}
                  onClick={(e) => {
                    if (currentTool === 'cursor') {
                      e.stopPropagation();
                      onPointClick(point.id);
                    }
                  }}
                />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};
