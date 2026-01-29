import { useState, useEffect } from 'react';
import { useDrawingState } from '@/hooks/useDrawingState';
import { DrawingCanvas } from '@/components/drawing/DrawingCanvas';
import { Toolbar } from '@/components/drawing/Toolbar';
import { MeasurementTable } from '@/components/drawing/MeasurementTable';
import { ImageUploader } from '@/components/drawing/ImageUploader';
import { Ruler } from 'lucide-react';

const Index = () => {
  const [image, setImage] = useState<string | null>(null);
  const {
    points,
    lines,
    currentTool,
    setCurrentTool,
    activePointId,
    selectedPointId,
    selectedLineId,
    mousePosition,
    setMousePosition,
    handleCanvasClick,
    deletePoint,
    deleteLine,
    selectPoint,
    selectLine,
    cancelActivePoint,
    getPointById,
    calculateLineLength,
  } = useDrawingState();

  // Handle escape key to cancel active drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelActivePoint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelActivePoint]);

  const handleDelete = () => {
    if (selectedPointId) {
      deletePoint(selectedPointId);
    } else if (selectedLineId) {
      deleteLine(selectedLineId);
    }
  };

  const canDelete = selectedPointId !== null || selectedLineId !== null;

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
          selectedPointId={selectedPointId}
          selectedLineId={selectedLineId}
          currentTool={currentTool}
          mousePosition={mousePosition}
          onCanvasClick={handleCanvasClick}
          onMouseMove={(x, y) => setMousePosition({ x, y })}
          onMouseLeave={() => setMousePosition(null)}
          onPointClick={selectPoint}
          onLineClick={selectLine}
          getPointById={getPointById}
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
          canDelete={canDelete}
          onDelete={handleDelete}
        />

        <MeasurementTable
          lines={lines}
          calculateLength={calculateLineLength}
          selectedLineId={selectedLineId}
          onSelectLine={selectLine}
        />
      </aside>
    </div>
  );
};

export default Index;
