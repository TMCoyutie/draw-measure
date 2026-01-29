import { useState, useEffect } from 'react';
import { useDrawingState } from '@/hooks/useDrawingState';
import { DrawingCanvas } from '@/components/drawing/DrawingCanvas';
import { Toolbar } from '@/components/drawing/Toolbar';
import { MeasurementTable } from '@/components/drawing/MeasurementTable';
import { ImageUploader } from '@/components/drawing/ImageUploader';
import { Ruler } from 'lucide-react';

const Index = () => {
  const [image, setImage] = useState<string | null>(null);
  const [showLengthLabels, setShowLengthLabels] = useState(false);
  
  const {
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
    deleteSelected,
    clearAll,
    selectPoint,
    selectLine,
    clearSelection,
    cancelActivePoint,
    getPointById,
    calculateLineLength,
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

  const hasData = points.length > 0 || lines.length > 0;

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
          image={image}
          points={points}
          lines={lines}
          activePointId={activePointId}
          selectedPointIds={selectedPointIds}
          selectedLineIds={selectedLineIds}
          currentTool={currentTool}
          mousePosition={mousePosition}
          showLengthLabels={showLengthLabels}
          onCanvasClick={handleCanvasClick}
          onMouseMove={(x, y) => setMousePosition({ x, y })}
          onMouseLeave={() => setMousePosition(null)}
          onPointClick={selectPoint}
          onLineClick={selectLine}
          onClearSelection={clearSelection}
          getPointById={getPointById}
          calculateLineLength={calculateLineLength}
        />
      </div>

      {/* Right Sidebar */}
      <aside className="w-64 toolbar-panel border-l border-white/10 p-4 flex flex-col gap-6">
        <ImageUploader 
          onImageUpload={setImage} 
          hasImage={image !== null} 
        />
        
        <Toolbar
          currentTool={currentTool}
          onToolChange={setCurrentTool}
          canDelete={hasSelection}
          onDelete={deleteSelected}
          onClearAll={clearAll}
          hasData={hasData}
        />

        <MeasurementTable
          lines={lines}
          calculateLength={calculateLineLength}
          selectedLineIds={selectedLineIds}
          onSelectLine={selectLine}
          showLengthLabels={showLengthLabels}
          onToggleLengthLabels={() => setShowLengthLabels(prev => !prev)}
        />
      </aside>
    </div>
  );
};

export default Index;
