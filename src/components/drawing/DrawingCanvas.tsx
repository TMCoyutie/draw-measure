import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Point, Line, Angle, Circle, ToolType } from '@/types/drawing';
import { X } from 'lucide-react';

interface DrawingCanvasProps {
  image: string | null;
  points: Point[];
  lines: Line[];
  angles: Angle[];
  circles: Circle[];
  selectedCircleIds: Set<string>;
  activePointId: string | null;
  angleFirstLineId: string | null;
  selectedPointIds: Set<string>;
  selectedLineIds: Set<string>;
  selectedAngleIds: Set<string>;
  currentTool: ToolType;
  mousePosition: { x: number; y: number } | null;
  showLengthLabels: boolean;
  onCanvasClick: (x: number, y: number) => void;
  onCircleToolClick: (x: number, y: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onMouseLeave: () => void;
  onPointClick: (pointId: string, ctrlKey: boolean) => void;
  onLineClick: (lineId: string, ctrlKey: boolean) => void;
  onAngleClick: (angleId: string, ctrlKey: boolean) => void;
  onCircleClick: (circleId: string, ctrlKey: boolean) => void;
  onCircleResize: (circleId: string, updates: Partial<Circle>) => void;
  onAngleToolLineClick: (lineId: string) => void;
  onClearSelection: () => void;
  onPointDrag: (pointId: string, x: number, y: number) => void;
  getPointById: (id: string) => Point | undefined;
  calculateLineLength: (line: Line) => number;
  onResetAll: () => void;
}

// 定義暴露給父組件的方法介面
export interface DrawingCanvasRef {
  exportImage: () => void;
  copyImage: () => Promise<void>;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>((props, ref) => {
  const {
    image,
    points,
    lines,
    angles,
    circles,
    selectedCircleIds,
    activePointId,
    angleFirstLineId,
    selectedPointIds,
    selectedLineIds,
    selectedAngleIds,
    currentTool,
    mousePosition,
    showLengthLabels,
    onCanvasClick,
    onCircleToolClick,
    onMouseMove,
    onMouseLeave,
    onPointClick,
    onLineClick,
    onAngleClick,
    onCircleClick,
    onCircleResize,
    onAngleToolLineClick,
    onClearSelection,
    onPointDrag,
    getPointById,
    calculateLineLength,
    onResetAll,
  } = props;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Circle bounding box handle dragging state
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
  const [draggingCircleId, setDraggingCircleId] = useState<string | null>(null);
  const [circleDragState, setCircleDragState] = useState<{
    anchorX: number;
    anchorY: number;
    startX: number;
    startY: number;
  } | null>(null);
  
  // Circle move dragging state
  const [isDraggingCircle, setIsDraggingCircle] = useState(false);
  const [circleMoveStart, setCircleMoveStart] = useState<{
    mouseX: number;
    mouseY: number;
    circleCenterX: number;
    circleCenterY: number;
  } | null>(null);

  const lastDragEndTimeRef = useRef<number>(0);

  // 匯出邏輯
  const handleExportImage = () => {
    if (!imageSize || !containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    // 1. 複製 SVG 節點
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    // 獲取所有原始元素與複製元素的清單
    const originalElements = svgElement.querySelectorAll('path, line, circle, rect, text');
    const clonedElements = clonedSvg.querySelectorAll('path, line, circle, rect, text');

    // 2. 同步樣式：直接從畫面上抓取「目前的顏色」並寫入複製品中
    clonedElements.forEach((el, index) => {
      const originalEl = originalElements[index] as HTMLElement;
      const clonedEl = el as HTMLElement;
      if (!originalEl || !clonedEl) return;

      const style = window.getComputedStyle(originalEl);

      // 針對不同標籤類型同步顏色屬性
      if (clonedEl.tagName === 'line' || clonedEl.tagName === 'path') {
        // 移除感應用的透明線
        if (clonedEl.getAttribute('stroke') === 'transparent') {
          clonedEl.remove();
          return;
        }
        clonedEl.setAttribute('stroke', style.stroke);
        clonedEl.style.stroke = style.stroke;
        clonedEl.setAttribute('stroke-width', style.strokeWidth);
      }

      if (clonedEl.tagName === 'circle' || clonedEl.tagName === 'rect') {
        clonedEl.setAttribute('fill', style.fill);
        clonedEl.style.fill = style.fill;
        clonedEl.setAttribute('stroke', style.stroke); // 同步邊框
      }

      if (clonedEl.tagName === 'text') {
        clonedEl.setAttribute('fill', style.fill);
        clonedEl.style.fill = style.fill;
        clonedEl.style.fontFamily = 'sans-serif'; // 確保字體一致
        clonedEl.style.fontSize = style.fontSize;
        clonedEl.style.fontWeight = style.fontWeight;
      }
    });

    // 3. 修復 Points 的位移 (處理 translate)
    clonedSvg.querySelectorAll('g').forEach((g) => {
      const styleAttr = g.getAttribute('style');
      if (styleAttr && styleAttr.includes('translate')) {
        const match = styleAttr.match(/translate\(([^px]+)px,\s*([^px]+)px\)/);
        if (match) {
          g.setAttribute('transform', `translate(${match[1]}, ${match[2]})`);
        }
      }
    });

    // 4. 轉為圖片邏輯 (保持不變)
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const backgroundImg = new Image();
      backgroundImg.onload = () => {
        if (ctx) {
          ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
        
        const link = document.createElement('a');
        link.download = `測量結果-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        URL.revokeObjectURL(url);
      };
      backgroundImg.src = image || '';
    };
    img.src = url;
  };
  
  // 複製圖片到剪貼簿邏輯
  const handleCopyImage = async () => {
    if (!imageSize || !containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    // 複製 SVG 節點（與匯出邏輯相同）
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    const originalElements = svgElement.querySelectorAll('path, line, circle, rect, text');
    const clonedElements = clonedSvg.querySelectorAll('path, line, circle, rect, text');

    clonedElements.forEach((el, index) => {
      const originalEl = originalElements[index] as HTMLElement;
      const clonedEl = el as HTMLElement;
      if (!originalEl || !clonedEl) return;

      const style = window.getComputedStyle(originalEl);

      if (clonedEl.tagName === 'line' || clonedEl.tagName === 'path') {
        if (clonedEl.getAttribute('stroke') === 'transparent') {
          clonedEl.remove();
          return;
        }
        clonedEl.setAttribute('stroke', style.stroke);
        clonedEl.style.stroke = style.stroke;
        clonedEl.setAttribute('stroke-width', style.strokeWidth);
      }

      if (clonedEl.tagName === 'circle' || clonedEl.tagName === 'rect') {
        clonedEl.setAttribute('fill', style.fill);
        clonedEl.style.fill = style.fill;
        clonedEl.setAttribute('stroke', style.stroke);
      }

      if (clonedEl.tagName === 'text') {
        clonedEl.setAttribute('fill', style.fill);
        clonedEl.style.fill = style.fill;
        clonedEl.style.fontFamily = 'sans-serif';
        clonedEl.style.fontSize = style.fontSize;
        clonedEl.style.fontWeight = style.fontWeight;
      }
    });

    clonedSvg.querySelectorAll('g').forEach((g) => {
      const styleAttr = g.getAttribute('style');
      if (styleAttr && styleAttr.includes('translate')) {
        const match = styleAttr.match(/translate\(([^px]+)px,\s*([^px]+)px\)/);
        if (match) {
          g.setAttribute('transform', `translate(${match[1]}, ${match[2]})`);
        }
      }
    });

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise<void>((resolve) => {
      img.onload = () => {
        const backgroundImg = new Image();
        backgroundImg.onload = async () => {
          if (ctx) {
            ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }
          
          // 將 canvas 轉為 Blob 並複製到剪貼簿
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ]);
              } catch (err) {
                console.error('Failed to copy image:', err);
              }
            }
            URL.revokeObjectURL(url);
            resolve();
          }, 'image/png');
        };
        backgroundImg.src = image || '';
      };
      img.src = url;
    });
  };
  
  // 暴露方法
  useImperativeHandle(ref, () => ({
    exportImage: handleExportImage,
    copyImage: handleCopyImage
  }));
  
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
    if (draggingPointId || draggingHandle || isDraggingCircle) return; // Don't trigger click during drag
    const now = Date.now();
    if (now - lastDragEndTimeRef.current < 200) {
      return;
    }
    
    if (currentTool === 'marker') {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onCanvasClick(x, y);
    } else if (currentTool === 'cursor') {
      onClearSelection();
    } else if (currentTool === 'circle') {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onCircleToolClick(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle circle move dragging
    if (isDraggingCircle && circleMoveStart && draggingCircleId) {
      const deltaX = x - circleMoveStart.mouseX;
      const deltaY = y - circleMoveStart.mouseY;
      onCircleResize(draggingCircleId, {
        centerX: circleMoveStart.circleCenterX + deltaX,
        centerY: circleMoveStart.circleCenterY + deltaY,
      });
      onMouseMove(x, y);
      return;
    }
    
    // 在 handleMouseMove 內部
    if (draggingHandle && circleDragState && draggingCircleId) {
      const circle = circles.find(c => c.id === draggingCircleId);
      if (!circle) return;
      
      const { anchorX, anchorY } = circleDragState;
      
      // 計算目前滑鼠相對於錨點（對角點）的位移
      const dx = x - anchorX;
      const dy = y - anchorY;
      
      let newRadius: number;
      let newCenterX: number;
      let newCenterY: number;
    
      // --- 修正後的邏輯：以錨點為固定基準 ---
    
      // 1. 角落控制點 (Corners)
      if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(draggingHandle)) {
        // 為了維持正圓形且不位移過度，取寬高位移的平均值作為「直徑」
        // 使用 Math.abs 確保半徑為正值，並限制最小尺寸為 5px
        const size = Math.max(10, Math.min(Math.abs(dx), Math.abs(dy)));
        newRadius = size / 2;
        
        // 圓心位置 = 錨點位置 + (方向係數 * 半徑)
        // 方向係數取決於滑鼠是在錨點的哪一側
        newCenterX = anchorX + (dx > 0 ? newRadius : -newRadius);
        newCenterY = anchorY + (dy > 0 ? newRadius : -newRadius);
      } 
      // 2. 邊緣控制點 (Edges)
      else if (['top', 'bottom'].includes(draggingHandle)) {
        newRadius = Math.max(5, Math.abs(dy) / 2);
        newCenterX = circle.centerX; // 垂直縮放時，水平中心不變
        newCenterY = anchorY + (dy > 0 ? newRadius : -newRadius);
      } 
      else if (['left', 'right'].includes(draggingHandle)) {
        newRadius = Math.max(5, Math.abs(dx) / 2);
        newCenterX = anchorX + (dx > 0 ? newRadius : -newRadius);
        newCenterY = circle.centerY; // 水平縮放時，垂直中心不變
      } else {
        return;
      }
      
      onCircleResize(draggingCircleId, { centerX: newCenterX, centerY: newCenterY, radius: newRadius });
      onMouseMove(x, y);
      return;
    }
    
    if (!draggingPointId || currentTool !== 'cursor') {
      onMouseMove(x, y);
      return;
    }
  
    // 1. 優先更新本地位置 (視覺最快)
    setDragPosition({ x, y });
    
    // 2. 同步通知父組件 (讓線段跟上)
    onPointDrag(draggingPointId, x, y);
    
    onMouseMove(x, y);
  };

  const handleMouseUp = () => {
    if (isDraggingCircle || draggingHandle || draggingPointId) {
      // 記錄拖曳結束的瞬間
      lastDragEndTimeRef.current = Date.now();
    }
    setDraggingPointId(null);
    setDraggingHandle(null);
    setDraggingCircleId(null);
    setCircleDragState(null);
    setIsDraggingCircle(false);
    setCircleMoveStart(null);
  };

  // Circle bounding box handle mouse down
  const handleBoundingBoxHandleMouseDown = (e: React.MouseEvent, circle: Circle, handleId: string) => {
    if (currentTool !== 'circle') return;
    e.stopPropagation();
    
    // Calculate anchor point (opposite corner/edge)
    let anchorX = circle.centerX;
    let anchorY = circle.centerY;
    
    if (handleId === 'top-left') {
      anchorX = circle.centerX + circle.radius;
      anchorY = circle.centerY + circle.radius;
    } else if (handleId === 'top-right') {
      anchorX = circle.centerX - circle.radius;
      anchorY = circle.centerY + circle.radius;
    } else if (handleId === 'bottom-left') {
      anchorX = circle.centerX + circle.radius;
      anchorY = circle.centerY - circle.radius;
    } else if (handleId === 'bottom-right') {
      anchorX = circle.centerX - circle.radius;
      anchorY = circle.centerY - circle.radius;
    } else if (handleId === 'top') {
      anchorY = circle.centerY + circle.radius;
    } else if (handleId === 'bottom') {
      anchorY = circle.centerY - circle.radius;
    } else if (handleId === 'left') {
      anchorX = circle.centerX + circle.radius;
    } else if (handleId === 'right') {
      anchorX = circle.centerX - circle.radius;
    }
    
    setDraggingHandle(handleId);
    setDraggingCircleId(circle.id);
    setCircleDragState({
      anchorX,
      anchorY,
      startX: e.clientX,
      startY: e.clientY,
    });
  };

  const handlePointMouseDown = (e: React.MouseEvent, point: Point) => {
    if (currentTool === 'cursor') {
      e.stopPropagation();
      setDraggingPointId(point.id);
      setDragPosition({ x: point.x, y: point.y });
    }
  };

  // Handle circle area click for selection
  const handleCircleAreaClick = (e: React.MouseEvent, circleId: string) => {
    if (currentTool !== 'circle') return;
    e.stopPropagation();
    onCircleClick(circleId, e.ctrlKey || e.metaKey);
  };

  // Handle circle area drag for moving
  const handleCircleAreaMouseDown = (e: React.MouseEvent, circle: Circle) => {
    if (currentTool !== 'circle') return;
    e.stopPropagation();
    
    const svg = (e.target as Element).closest('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDraggingCircle(true);
    setDraggingCircleId(circle.id);
    setCircleMoveStart({
      mouseX: x,
      mouseY: y,
      circleCenterX: circle.centerX,
      circleCenterY: circle.centerY,
    });
    onCircleClick(circle.id, e.ctrlKey || e.metaKey); // Select on drag start
  };

  // Get bounding box handles for circle
  const getCircleBoundingBox = (circle: Circle) => {
    const { centerX, centerY, radius } = circle;
    return {
      left: centerX - radius,
      top: centerY - radius,
      right: centerX + radius,
      bottom: centerY + radius,
      handles: [
        { id: 'top-left', x: centerX - radius, y: centerY - radius },
        { id: 'top', x: centerX, y: centerY - radius },
        { id: 'top-right', x: centerX + radius, y: centerY - radius },
        { id: 'right', x: centerX + radius, y: centerY },
        { id: 'bottom-right', x: centerX + radius, y: centerY + radius },
        { id: 'bottom', x: centerX, y: centerY + radius },
        { id: 'bottom-left', x: centerX - radius, y: centerY + radius },
        { id: 'left', x: centerX - radius, y: centerY },
      ],
    };
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

  const getLineColor = (lineId: string) => {
    const selectedArray = Array.from(selectedLineIds);
    const index = selectedArray.indexOf(lineId);

    if (angleFirstLineId === lineId) return 'hsl(var(--primary))';
    
    if (index === -1) return 'hsl(var(--accent))'; // 未選取：翡翠綠
    
    // 第一條選取：天藍色，第二條選取：深藍色
    return index === 0 ? '#7dd3fc' : '#0369a1'; 
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
          <p className="text-lg">點擊右側按鈕或直接 <kbd className="px-2 py-1 bg-slate-100 rounded border shadow-sm text-sm">Ctrl + V</kbd> 貼上圖片開始繪圖</p>
        </div>
      ) : (
        /* 1. 確保這個 div 有 'group' 類名，這樣才能控制內部的按鈕顯示 */
        <div className="relative inline-block shadow-2xl rounded-lg overflow-hidden group">
    
          {/* 2. 在這裡插入重置按鈕 (位於 svg 之前) */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // 防止點擊按鈕時觸發畫布的 onClick
              if (window.confirm("確定要清空所有標記並移除圖片嗎？")) {
                onResetAll();
              }
            }}
            /* 關鍵樣式：opacity-0 group-hover:opacity-100 實現平時隱藏、移入顯示 */
            className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md shadow-lg"
            title="重置畫布"
          >
            {/* 這裡使用 lucide-react 的 X 圖標，若沒 import 記得補上 */}
            <X size={20} /> 
          </button>
          
          <svg
            width={imageSize?.width || 800}
            height={imageSize?.height || 600}
            className={`${currentTool === 'marker' || currentTool === 'circle' ? 'cursor-crosshair' : currentTool === 'angle' ? 'cursor-pointer' : draggingPointId || draggingHandle ? 'cursor-grabbing' : 'cursor-default'}`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (draggingPointId && dragPosition) {
                onPointDrag(draggingPointId, dragPosition.x, dragPosition.y);
              }
              setDraggingPointId(null);
              setDragPosition(null);
              setDraggingHandle(null);
              setCircleDragState(null);
              setIsDraggingCircle(false);
              setCircleMoveStart(null);
              onMouseLeave();
            }}
          >
            {/* Background image */}
            <image
              href={image}
              width={imageSize?.width || 800}
              height={imageSize?.height || 600}
            />

            {/* --- 圓心參考線與十字準星 (最底層渲染) --- */}
            {circles.map((circle) => {
              const isSelected = selectedCircleIds.has(circle.id);
              const bbox = getCircleBoundingBox(circle);
              
              return (
                <g key={circle.id}>
                  {/* 1. 外觀層：虛線圓圈與十字準星 (不論什麼工具模式都顯示，但不可點擊) */}
                  <g style={{ pointerEvents: 'none' }}>
                    {/* 參考圓圈本體 */}
                    <circle
                      cx={circle.centerX}
                      cy={circle.centerY}
                      r={circle.radius}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4,2"
                      style={{ opacity: 0.8 }}
                    />
                    
                    {/* 十字準星 - 水平線 */}
                    <line 
                      x1={circle.centerX - 12} y1={circle.centerY} 
                      x2={circle.centerX + 12} y2={circle.centerY} 
                      stroke="#ef4444" strokeWidth={1.5} 
                    />
                    {/* 十字準星 - 垂直線 */}
                    <line 
                      x1={circle.centerX} y1={circle.centerY - 12} 
                      x2={circle.centerX} y2={circle.centerY + 12} 
                      stroke="#ef4444" strokeWidth={1.5} 
                    />
                    {/* 中心避讓白點：讓十字中心在雜亂背景中依然清晰 */}
                    <circle 
                      cx={circle.centerX} cy={circle.centerY} r={2} 
                      fill="white" stroke="#ef4444" strokeWidth={1} 
                    />
                  </g>
              
                  {/* 2. 控制層：僅在「圓心工具」模式下顯示控制框與感應區 */}
                  {currentTool === 'circle' && (
                    <g>
                      {/* 整體抓取區域 */}
                      <rect
                        x={bbox.left}
                        y={bbox.top}
                        width={bbox.right - bbox.left}
                        height={bbox.bottom - bbox.top}
                        fill="transparent"
                        style={{ cursor: isDraggingCircle && draggingCircleId === circle.id ? 'grabbing' : 'move' }}
                        onClick={(e) => handleCircleAreaClick(e, circle.id)}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleCircleAreaMouseDown(e, circle);
                        }}
                      />
                      
                      {/* 藍色尺寸控制框 (Visual Box) */}
                      <rect
                        x={bbox.left}
                        y={bbox.top}
                        width={bbox.right - bbox.left}
                        height={bbox.bottom - bbox.top}
                        fill="none"
                        stroke={isSelected ? '#3b82f6' : '#94a3b8'}
                        strokeWidth={1}
                        strokeDasharray="4,4"
                        style={{ pointerEvents: 'none' }}
                      />
          
                      {/* 縮放手把 (Handles) */}
                      {bbox.handles.map((handle) => (
                        <rect
                          key={handle.id}
                          x={handle.x - 5}
                          y={handle.y - 5}
                          width={10}
                          height={10}
                          fill={isSelected ? '#3b82f6' : '#64748b'}
                          stroke="white"
                          strokeWidth={1}
                          style={{ cursor: 'pointer' }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleBoundingBoxHandleMouseDown(e, circle, handle.id);
                          }}
                        />
                      ))}
                    </g>
                  )}
                </g>
              );
            })}
            
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
              const strokeColor = getLineColor(line.id); // 取得動態顏色

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
                    // 關鍵：移除 className 中的 'stroke-primary'
                    className="measurement-line transition-all duration-200" 
                    stroke={strokeColor} // 這裡會被 inline style 覆蓋
                    strokeWidth={isSelected || isAngleFirstLine ? 3 : 2}
                    style={{ 
                      pointerEvents: 'none', 
                      stroke: strokeColor // 強制套用動態顏色
                    }}
                  />
                  {/* Line label */}
                  {center && (
                    <g 
                      transform={`translate(${center.x}, ${center.y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation(); // 阻止事件冒泡到畫布
                  
                        // 關鍵修正：判斷目前的工具模式
                        if (currentTool === 'angle') {
                          // 如果是角度工具，點擊標籤等於點擊該線段來建立角度
                          onAngleToolLineClick(line.id);
                        } else if (currentTool === 'cursor' && !draggingPointId) {
                          // 如果是選取工具，點擊標籤等於選取線段
                          onLineClick(line.id, e.ctrlKey || e.metaKey);
                        }
                      }}
                    >
                      <rect
                        x={-labelWidth / 2}
                        y="-10"
                        width={labelWidth}
                        height="20"
                        rx="4"
                        fill={strokeColor} 
                        style={{ transition: 'fill 0.2s' }}
                        pointerEvents="all" // 強制所有部分都可點擊
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
                    fill="#2dd4bf" // 直接先用 Teal 色碼測試 (Tailwind teal-400)
                    fillOpacity={0.3} // 提高一點透明度到 30% 看看
                    style={{ 
                      pointerEvents: 'none',
                      display: 'block' // 確保沒有被 CSS 隱藏
                    }}
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
                  <g 
                    transform={`translate(${arcData.labelX}, ${arcData.labelY})`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation(); 
                      if (currentTool === 'cursor' && !draggingPointId) {
                        onAngleClick(angle.id, e.ctrlKey || e.metaKey);
                      }
                    }}
                  >
                    <rect
                      x="-25" // 稍微加寬感應區
                      y="-12" // 稍微加高感應區
                      width="50"
                      height="24"
                      rx="4"
                      fill={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
                      pointerEvents="all"
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
});

DrawingCanvas.displayName = 'DrawingCanvas';
