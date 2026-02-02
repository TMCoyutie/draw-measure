import { useState, useEffect, useRef } from 'react';
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

  const hasData = points.length > 0 || lines.length > 0 || angles.length > 0 || circle !== null;

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
          circle={circle}
          isCircleSelected={isCircleSelected}
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
          
          {/* 2. 新增的匯出按鈕：緊貼在 Uploader 下方 */}
          <button 
            onClick={() => canvasRef.current?.exportImage()}
            disabled={!image}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed transition-all rounded-md text-sm font-bold text-white shadow-sm mt-1"
          >
            <span>💾 匯出測量圖片</span>
          </button>
        </div>
        
        <Toolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          canDelete={hasSelection}
          onDelete={deleteSelected}
          onClearAll={clearAll}
          hasData={hasData}
          angleFirstLineId={angleFirstLineId}
          hasCircle={circle !== null}
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
