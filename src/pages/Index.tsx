import { useState, useEffect, useRef } from 'react';
import { useDrawingState } from '@/hooks/useDrawingState';
import { DrawingCanvas, DrawingCanvasRef } from '@/components/drawing/DrawingCanvas';
import { Toolbar } from '@/components/drawing/Toolbar';
import { MeasurementTable } from '@/components/drawing/MeasurementTable';
import { ImageUploader } from '@/components/drawing/ImageUploader';
import { Ruler } from 'lucide-react';

const Index = () => {
  // 1. 建立給 Canvas 使用的 Ref
  const canvasRef = useRef<DrawingCanvasRef>(null);
  
  const [image, setImage] = useState<string | null>(null);
  const [showLengthLabels, setShowLengthLabels] = useState(false);
  
  const {
    points,
    lines,
    angles,
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
    handleAngleToolLineClick,
    deleteSelected,
    clearAll,
    selectPoint,
    selectLine,
    selectAngle,
    clearSelection,
    cancelActivePoint,
    getPointById,
    calculateLineLength,
    updatePointPosition,
    recalculateAngles,
    hasSelection,
  } = useDrawingState();

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

  const hasData = points.length > 0 || lines.length > 0 || angles.length > 0;

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
          ref={canvasRef} // 這裡務必綁定 Ref
          image={image}
          points={points}
          lines={lines}
          angles={angles}
          activePointId={activePointId}
          angleFirstLineId={angleFirstLineId}
          selectedPointIds={selectedPointIds}
          selectedLineIds={selectedLineIds}
          selectedAngleIds={selectedAngleIds}
          currentTool={currentTool}
          mousePosition={mousePosition}
          showLengthLabels={showLengthLabels}
          onCanvasClick={handleCanvasClick}
          onMouseMove={(x, y) => setMousePosition({ x, y })}
          onMouseLeave={() => setMousePosition(null)}
          onPointClick={selectPoint}
          onLineClick={selectLine}
          onAngleClick={selectAngle}
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
        />

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
        />
      </aside>
    </div>
  );
};

export default Index;
