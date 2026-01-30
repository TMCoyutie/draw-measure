import { useRef, useEffect, useState } from 'react';
import { Point, Line, Angle, ToolType } from '@/types/drawing';

interface DrawingCanvasProps {
  image: string | null;
  points: Point[];
  lines: Line[];
  angles: Angle[];
  activePointId: string | null;
  angleFirstLineId: string | null;
  selectedPointIds: Set<string>;
  selectedLineIds: Set<string>;
  selectedAngleIds: Set<string>;
  currentTool: ToolType;
  mousePosition: { x: number; y: number } | null;
  showLengthLabels: boolean;
  onCanvasClick: (x: number, y: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onMouseLeave: () => void;
  onPointClick: (pointId: string, ctrlKey: boolean) => void;
  onLineClick: (lineId: string, ctrlKey: boolean) => void;
  onAngleClick: (angleId: string, ctrlKey: boolean) => void;
  onAngleToolLineClick: (lineId: string) => void;
  onClearSelection: () => void;
  onPointDrag: (pointId: string, x: number, y: number) => void;
  getPointById: (id: string) => Point | undefined;
  calculateLineLength: (line: Line) => number;
}

export const DrawingCanvas = ({
  image,
  points,
  lines,
  angles,
  activePointId,
  angleFirstLineId,
  selectedPointIds,
  selectedLineIds,
  selectedAngleIds,
  currentTool,
  mousePosition,
  showLengthLabels,
  onCanvasClick,
  onMouseMove,
  onMouseLeave,
  onPointClick,
  onLineClick,
  onAngleClick,
  onAngleToolLineClick,
  onClearSelection,
  onPointDrag,
  getPointById,
  calculateLineLength,
}: DrawingCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

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
    if (!draggingPointId || currentTool !== 'cursor') {
      onMouseMove(e.clientX - e.currentTarget.getBoundingClientRect().left, e.clientY - e.currentTarget.getBoundingClientRect().top);
      return;
    }
  
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
  
    // 1. 優先更新本地位置 (視覺最快)
    setDragPosition({ x, y });
    
    // 2. 同步通知父組件 (讓線段跟上)
    onPointDrag(draggingPointId, x, y);
    
    onMouseMove(x, y);
  };

  const handleMouseUp = () => {
    setDraggingPointId(null);
    // setDragPosition(null); // 如果你決定移除本地 dragPosition 狀態
  };

  const handlePointMouseDown = (e: React.MouseEvent, point: Point) => {
    if (currentTool === 'cursor') {
      e.stopPropagation();
      setDraggingPointId(point.id);
      setDragPosition({ x: point.x, y: point.y });
    }
  };

  const activePoint = activePointId ? getPointById(activePointId) : null;

  // Get point position considering drag state
  const getPointPosition = (point: Point): { x: number; y: number } => {
    if (draggingPointId === point.id && dragPosition) {
      return dragPosition;
    }
    return { x: point.x, y: point.y };
  };

  const getLineCenter = (line: Line) => {
    const start = getPointById(line.startPointId);
    const end = getPointById(line.endPointId);
    if (!start || !end) return null;
    const startPos = getPointPosition(start);
    const endPos = getPointPosition(end);
    return {
      x: (startPos.x + endPos.x) / 2,
      y: (startPos.y + endPos.y) / 2,
    };
  };

  // Calculate line length considering drag position
  const getLineLengthWithDrag = (line: Line): number => {
    const start = getPointById(line.startPointId);
    const end = getPointById(line.endPointId);
    if (!start || !end) return 0;
    const startPos = getPointPosition(start);
    const endPos = getPointPosition(end);
    return Math.sqrt((endPos.x - startPos.x) ** 2 + (endPos.y - startPos.y) ** 2);
  };

  const getDisplayLabel = (line: Line) => {
    if (showLengthLabels) {
      return getLineLengthWithDrag(line).toFixed(1);
    }
    return line.label;
  };

  const getLabelWidth = (label: string) => {
    const charCount = label.length;
    return Math.max(24, charCount * 10 + 8);
  };

  // Calculate angle arc path for display
  const getAngleArc = (angle: Angle) => {
    const vertex = getPointById(angle.vertexPointId);
    const line1 = lines.find(l => l.id === angle.line1Id);
    const line2 = lines.find(l => l.id === angle.line2Id);
    
    if (!vertex || !line1 || !line2) return null;
  
    const vertexPos = getPointPosition(vertex);
    const p1Id = line1.startPointId === angle.vertexPointId ? line1.endPointId : line1.startPointId;
    const p2Id = line2.startPointId === angle.vertexPointId ? line2.endPointId : line2.startPointId;
    
    const p1 = getPointById(p1Id);
    const p2 = getPointById(p2Id);
    if (!p1 || !p2) return null;
  
    const p1Pos = getPointPosition(p1);
    const p2Pos = getPointPosition(p2);
  
    // --- 新增：動態半徑計算 ---
    const dist1 = Math.sqrt((p1Pos.x - vertexPos.x) ** 2 + (p1Pos.y - vertexPos.y) ** 2);
    const dist2 = Math.sqrt((p2Pos.x - vertexPos.x) ** 2 + (p2Pos.y - vertexPos.y) ** 2);
    // 取短線的 30% 作為半徑，但最小不小於 20，最大不超過 50
    const radius = Math.max(20, Math.min(50, Math.min(dist1, dist2) * 0.3));
    // -----------------------
  
    const angle1 = Math.atan2(p1Pos.y - vertexPos.y, p1Pos.x - vertexPos.x);
    const angle2 = Math.atan2(p2Pos.y - vertexPos.y, p2Pos.x - vertexPos.x);
  
    const startX = vertexPos.x + radius * Math.cos(angle1);
    const startY = vertexPos.y + radius * Math.sin(angle1);
    const endX = vertexPos.x + radius * Math.cos(angle2);
    const endY = vertexPos.y + radius * Math.sin(angle2);
  
    let sweepAngle = angle2 - angle1;
    if (sweepAngle > Math.PI) sweepAngle -= 2 * Math.PI;
    if (sweepAngle < -Math.PI) sweepAngle += 2 * Math.PI;
    const largeArc = Math.abs(sweepAngle) > Math.PI ? 1 : 0;
    const sweep = sweepAngle > 0 ? 1 : 0;
  
    const midAngle = angle1 + sweepAngle / 2;
    const labelX = vertexPos.x + (radius + 20) * Math.cos(midAngle); // 標籤離動態圓弧遠一點
    const labelY = vertexPos.y + (radius + 20) * Math.sin(midAngle);
  
    const degrees = Math.abs(sweepAngle) * (180 / Math.PI);
  
    return {
      // 圓弧路徑
      path: `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`,
      // 新增：扇形填充路徑 (從起點畫弧，再連回頂點，最後封閉)
      fillPath: `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY} L ${vertexPos.x} ${vertexPos.y} Z`,
      labelX,
      labelY,
      degrees,
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
            className={`${currentTool === 'marker' ? 'cursor-crosshair' : currentTool === 'angle' ? 'cursor-pointer' : draggingPointId ? 'cursor-grabbing' : 'cursor-default'}`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (draggingPointId && dragPosition) {
                onPointDrag(draggingPointId, dragPosition.x, dragPosition.y);
              }
              setDraggingPointId(null);
              setDragPosition(null);
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
              const isAngleFirstLine = angleFirstLineId === line.id;
              const startPos = getPointPosition(startPoint);
              const endPos = getPointPosition(endPoint);
              const center = getLineCenter(line);
              const displayLabel = getDisplayLabel(line);
              const labelWidth = getLabelWidth(displayLabel);

              return (
                <g key={line.id}>
                  {/* Invisible wider line for easier click detection */}
                  <line
                    x1={startPos.x}
                    y1={startPos.y}
                    x2={endPos.x}
                    y2={endPos.y}
                    stroke="transparent"
                    strokeWidth={16}
                    onClick={(e) => {
                      if (currentTool === 'angle') {
                        e.stopPropagation();
                        onAngleToolLineClick(line.id);
                      } else if (currentTool === 'cursor' && !draggingPointId) {
                        e.stopPropagation();
                        onLineClick(line.id, e.ctrlKey || e.metaKey);
                      }
                    }}
                    style={{ cursor: currentTool === 'cursor' || currentTool === 'angle' ? 'pointer' : 'inherit' }}
                  />
                  {/* Visible line */}
                  <line
                    x1={startPos.x}
                    y1={startPos.y}
                    x2={endPos.x}
                    y2={endPos.y}
                    className={`measurement-line ${isSelected || isAngleFirstLine ? 'stroke-primary' : ''}`}
                    strokeWidth={isSelected || isAngleFirstLine ? 3 : 2}
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
                        className={isSelected || isAngleFirstLine ? 'fill-primary' : ''}
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

            {/* Angle arcs */}
            {angles.map(angle => {
              const arcData = getAngleArc(angle);
              if (!arcData) return null;
              
              const isSelected = selectedAngleIds.has(angle.id);

              return (
                <g key={angle.id}>
                  {/* 新增：半透明扇形填充層 */}
                  <path
                    d={arcData.fillPath}
                    fill={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
                    fillOpacity={0.2} // 設定 20% 透明度
                    style={{ pointerEvents: 'none' }}
                  />
                  
                  {/* Invisible wider arc for click detection */}
                  <path
                    d={arcData.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    onClick={(e) => {
                      if (currentTool === 'cursor' && !draggingPointId) {
                        e.stopPropagation();
                        onAngleClick(angle.id, e.ctrlKey || e.metaKey);
                      }
                    }}
                    style={{ cursor: currentTool === 'cursor' ? 'pointer' : 'inherit' }}
                  />
                  {/* Visible arc */}
                  <path
                    d={arcData.path}
                    fill="none"
                    stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Angle label */}
                  <g transform={`translate(${arcData.labelX}, ${arcData.labelY})`}>
                    <rect
                      x="-20"
                      y="-10"
                      width="40"
                      height="20"
                      rx="4"
                      fill={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-white text-xs font-bold select-none"
                      style={{ pointerEvents: 'none' }}
                    >
                      {arcData.degrees.toFixed(1)}°
                    </text>
                  </g>
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
            {/* 找到渲染 Points 的地方 */}
            {points.map(point => {
              const isActive = activePointId === point.id;
              const isSelected = selectedPointIds.has(point.id);
              const isDragging = draggingPointId === point.id;
              const pos = getPointPosition(point);
            
              return (
                <g 
                  key={point.id}
                  // 關鍵修改：將座標套用在 group 的 style 上，並使用 transform
                  // 這樣可以強迫 GPU 處理位移，不經過 React 的屬性計算
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out', // 拖曳時關閉延遲
                    willChange: 'transform'
                  }}
                >
                  {/* 這裡的 cx, cy 全部改為 0，因為位置由上面的 translate 控制 */}
                  <circle
                    cx={0}
                    cy={0}
                    r={20}
                    fill="transparent"
                    style={{ cursor: currentTool === 'cursor' ? (isDragging ? 'grabbing' : 'grab') : 'inherit' }}
                    onMouseDown={(e) => handlePointMouseDown(e, point)}
                    onClick={(e) => {
                      if (currentTool === 'cursor' && !draggingPointId) {
                        e.stopPropagation();
                        onPointClick(point.id, e.ctrlKey || e.metaKey);
                      }
                    }}
                  />
                  <circle
                    cx={0}
                    cy={0}
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
