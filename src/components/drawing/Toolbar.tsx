import { MousePointer2, Crosshair, Trash2, XCircle } from 'lucide-react';
import { ToolType } from '@/types/drawing';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  canDelete: boolean;
  onDelete: () => void;
  onClearAll: () => void;
  hasData: boolean;
}

export const Toolbar = ({ 
  currentTool, 
  onToolChange, 
  canDelete, 
  onDelete,
  onClearAll,
  hasData,
}: ToolbarProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-toolbar-foreground/70 uppercase tracking-wider mb-3">
        工具
      </h3>
      
      <button
        className={`tool-button w-full ${currentTool === 'cursor' ? 'active' : ''}`}
        onClick={() => onToolChange('cursor')}
      >
        <MousePointer2 size={18} />
        <span>選擇工具</span>
      </button>
      
      <button
        className={`tool-button w-full ${currentTool === 'marker' ? 'active' : ''}`}
        onClick={() => onToolChange('marker')}
      >
        <Crosshair size={18} />
        <span>標點工具</span>
      </button>

      <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          disabled={!canDelete}
          onClick={onDelete}
        >
          <Trash2 size={16} className="mr-2" />
          刪除選取項目
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={!hasData}
          onClick={onClearAll}
        >
          <XCircle size={16} className="mr-2" />
          清除全部
        </Button>
      </div>
      
      <p className="text-xs text-toolbar-foreground/50 pt-2">
        按住 <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd> 可多選
        <br />
        按 <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Delete</kbd> 刪除
      </p>
    </div>
  );
};
