import { useState, useEffect, useRef, useCallback } from 'react';
import { useDrawingState } from '@/hooks/useDrawingState';
import { DrawingCanvas, DrawingCanvasRef } from '@/components/drawing/DrawingCanvas';
import { Toolbar } from '@/components/drawing/Toolbar';
import { MeasurementTable } from '@/components/drawing/MeasurementTable';
import { ImageUploader } from '@/components/drawing/ImageUploader';
import { ArrowLeftRight, Ruler } from 'lucide-react';

const Index = () => {
  // 1. 建立給 Canvas 使用的 Ref
  const canvasRef = useRef<DrawingCanvasRef>(null);
  
  const [image, setImage] = useState<string | null>(null);
  const [showLengthLabels, setShowLengthLabels] = useState(false);

  const [isRatioSwapped, setIsRatioSwapped] = useState(false);
  
  const {
    points,
    lines,
    angles,
    circles,
    selectedCircleIds,
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
    calculateLineLength,
    updatePointPosition,
    recalculateAngles,
    hasSelection,
    setCircles,
    setSelectedCircleIds,
  } = useDrawingState();
  
  useEffect(() => {
    if (selectedLineIds.size !== 2) setIsRatioSwapped(false);
  }, [selectedLineIds.size]);
  
  // Handle escape key to cancel active drawing and delete key to delete selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelActivePoint();
        clearSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (hasSelection) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelActivePoint, clearSelection, deleteSelected, hasSelection]);

  // 處理 Ctrl+V 圖片貼上功能
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // --- 關鍵修正：如果已經有圖片了，直接跳出不執行 ---
      if (image) return; 
      // -------------------------------------------
  
      const items = e.clipboardData?.items;
      if (!items) return;
  
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;
  
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
              setImage(result);
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };
  
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [image, setImage]); // 記得把 image 加入相依陣列中

  // 在 Index 組件內新增
  // 縮放範圍：5% ~ 500%（相對於圖片原始像素）
  const MIN_SCALE = 0.05;
  const MAX_SCALE = 5;
  // 初始值先給 1，實際顯示比例會在圖片上傳、DrawingCanvas 算出「適應可視區域」
  // 的 fitScale 後，透過 onImageLoad 回呼覆寫成正確的初始值。
  const [scale, setScale] = useState(1);
  const [showZoomLabel, setShowZoomLabel] = useState(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 顯示縮放百分比標籤 1.5 秒後自動淡出，滾輪縮放跟圖片自動 fit 都會用到
  // 用 useCallback 固定參考：zoomTimeoutRef 是 ref 不會變，所以 deps 給空陣列即可，
  // 這樣每次 Index 重新渲染時 flashZoomLabel 都是同一個函式參考。
  const flashZoomLabel = useCallback(() => {
    setShowZoomLabel(true);
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => setShowZoomLabel(false), 1500);
  }, []);

  // 圖片上傳完成時，套用 DrawingCanvas 算好的「適應可視區域」縮放比例
  // 同樣用 useCallback 固定參考：因為這個函式會當成 prop 傳給 DrawingCanvas，
  // 而 DrawingCanvas 內的 useEffect 依賴它——如果每次渲染都產生新函式，
  // 會導致該 useEffect 不斷重新觸發、scale 被反覆重置，形成無限迴圈
  // （縮放卡死在 fit 比例、標籤永遠不消失）。
  const handleImageLoad = useCallback((fitScale: number) => {
    setScale(fitScale);
    flashZoomLabel();
  }, [flashZoomLabel]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault(); // 關鍵：阻止瀏覽器縮放整個網頁
        // 改用等比例（乘法）縮放，每次滾動約 ±10%，
        // 不論目前縮放比例是 15% 還是 300%，手感都一致（Photoshop/Affinity 風格）
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => {
          const next = Math.min(Math.max(MIN_SCALE, prev * factor), MAX_SCALE);
          flashZoomLabel();
          return next;
        });
      }
    };
  
    // 監聽整個 window 或特定的 container
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    };
  }, []);
  
  const handleResetAll = () => {
    clearAll();      // 清掉所有繪圖資料
    setCircles([]);
    setSelectedCircleIds(new Set());
    setImage(null);  // 清掉圖片資料
  };
  
  const hasData = points.length > 0 || lines.length > 0 || angles.length > 0 || circles.length > 0;

  // 計算比例的資料
  const renderRatioSection = () => {
    if (selectedLineIds.size !== 2) return null;
  
    const selectedArray = Array.from(selectedLineIds);
    const lineA = lines.find(l => l.id === selectedArray[0]);
    const lineB = lines.find(l => l.id === selectedArray[1]);
  
    if (!lineA || !lineB) return null;
  
    const lenA = calculateLineLength(lineA) || 0;
    const lenB = calculateLineLength(lineB) || 0;

    if (lenA === 0 || lenB === 0) return null;
  
    const first = isRatioSwapped ? lineB : lineA;
    const second = isRatioSwapped ? lineA : lineB;
    const valFirst = isRatioSwapped ? lenB : lenA;
    const valSecond = isRatioSwapped ? lenA : lenB;

    const getLabelColor = (id: string) => {
      return selectedArray.indexOf(id) === 0 ? '#7dd3fc' : '#0369a1';
    };
  
    return (
      <div className="bg-slate-900/50 border border-blue-500/30 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            比例分析
          </span>
          <button 
            onClick={(e) => {
              e.preventDefault();
              setIsRatioSwapped(!isRatioSwapped);
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-blue-500/20 active:bg-blue-500/40 rounded-full transition-all group border border-slate-700/50 hover:border-blue-500/40"
            title="切換分子分母"
          >
            <ArrowLeftRight 
              size={18} 
              strokeWidth={2} 
              className="text-blue-400 group-hover:text-blue-300 transition-colors" 
            />
          </button>
        </div>
        <div className="flex items-center gap-2 px-1 -mt-1"> {/* 使用 -mt-1 向上擠壓行距 */}
          <div className="flex items-center gap-1.5"> {/* 緊縮分子分母間距 */}
            <span className="text-sm font-bold font-mono" style={{ color: getLabelColor(first.id) }}>
              {first.label}
            </span>
            <span className="text-slate-500 text-xs font-bold">/</span>
            <span className="text-sm font-bold font-mono" style={{ color: getLabelColor(second.id) }}>
              {second.label}
            </span>
          </div>
          
          {/* 比例數值縮小到 text-xl，保持視覺重點但不突兀 */}
          <span className="ml-auto text-xl font-black text-white tabular-nums tracking-tight">
            {(valFirst / valSecond).toFixed(3)}
          </span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex h-screen bg-background">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-6 bg-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Ruler size={18} className="text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">繪圖測量工具</h1>
          </div>
          {activePointId && (
            <div className="ml-auto text-sm text-muted-foreground">
              點擊設定下一個標記點，或按 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> 取消
            </div>
          )}
        </header>

        {/* Canvas */}
        <DrawingCanvas
          ref={canvasRef}
          image={image}
          points={points}
          lines={lines}
          angles={angles}
          circles={circles}
          selectedCircleIds={selectedCircleIds}
          activePointId={activePointId}
          angleFirstLineId={angleFirstLineId}
          selectedPointIds={selectedPointIds}
          selectedLineIds={selectedLineIds}
          selectedAngleIds={selectedAngleIds}
          currentTool={currentTool}
          mousePosition={mousePosition}
          showLengthLabels={showLengthLabels}
          onCanvasClick={handleCanvasClick}
          onCircleToolClick={handleCircleToolClick}
          onMouseMove={(x, y) => setMousePosition({ x, y })}
          onMouseLeave={() => setMousePosition(null)}
          onPointClick={selectPoint}
          onLineClick={selectLine}
          onAngleClick={selectAngle}
          onCircleClick={selectCircle}
          onCircleResize={updateCircle}
          onAngleToolLineClick={handleAngleToolLineClick}
          onClearSelection={clearSelection}
          onPointDrag={(pointId, x, y) => {
            updatePointPosition(pointId, x, y);
            recalculateAngles();
          }}
          getPointById={getPointById}
          calculateLineLength={calculateLineLength}
          onResetAll={handleResetAll}
          scale={scale}
          showZoomLabel={showZoomLabel}
          onImageLoad={handleImageLoad}
        />
      </div>

      {/* Right Sidebar */}
      <aside className="w-64 toolbar-panel border-l border-white/10 p-4 flex flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {/* 原有的圖片上傳器 */}
          <ImageUploader 
            onImageUpload={setImage} 
            hasImage={image !== null} 
          />
          
          {/* 匯出與複製按鈕並排 */}
          <div className="flex gap-2 mt-1">
            <button 
              onClick={() => canvasRef.current?.exportImage()}
              disabled={!image}
              className="flex-1 flex items-center justify-center gap-1.5 p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed transition-all rounded-md text-sm font-bold text-white shadow-sm"
            >
              <span>💾 匯出圖片</span>
            </button>
            <button 
              onClick={() => canvasRef.current?.copyImage()}
              disabled={!image}
              className="flex-1 flex items-center justify-center gap-1.5 p-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed transition-all rounded-md text-sm font-bold text-white shadow-sm"
            >
              <span>📋 複製圖片</span>
            </button>
          </div>
        </div>
        
        <Toolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          canDelete={hasSelection}
          onDelete={deleteSelected}
          onClearAll={clearAll}
          hasData={hasData}
          angleFirstLineId={angleFirstLineId}
          hasCircles={circles.length > 0}
        />

        {/* 插入比例面板 */}
        {renderRatioSection()}
        
        <MeasurementTable
          lines={lines}
          angles={angles}
          calculateLength={calculateLineLength}
          selectedLineIds={selectedLineIds}
          selectedAngleIds={selectedAngleIds}
          onSelectLine={selectLine}
          onSelectAngle={selectAngle}
          showLengthLabels={showLengthLabels}
          onToggleLengthLabels={() => setShowLengthLabels(prev => !prev)}
          getLineColor={(id) => {
            const selectedArray = Array.from(selectedLineIds);
            const index = selectedArray.indexOf(id);
            if (index === -1) return 'hsl(var(--accent))'; // 預設翡翠綠
            return index === 0 ? '#7dd3fc' : '#0369a1'; // 淺藍與深藍
          }}
        />
      </aside>
    </div>
  );
};

export default Index;
