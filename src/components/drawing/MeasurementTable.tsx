import { Line, Angle } from '@/types/drawing';
import { ArrowUpDown, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MeasurementTableProps {
  lines: Line[];
  angles: Angle[];
  calculateLength: (line: Line) => number;
  selectedLineIds: Set<string>;
  selectedAngleIds: Set<string>;
  onSelectLine: (lineId: string, ctrlKey: boolean) => void;
  onSelectAngle: (angleId: string, ctrlKey: boolean) => void;
  showLengthLabels: boolean;
  onToggleLengthLabels: () => void;
  getLineColor: (lineId: string) => string;
}

export const MeasurementTable = ({ 
  lines, 
  angles,
  calculateLength, 
  selectedLineIds,
  selectedAngleIds,
  onSelectLine,
  onSelectAngle,
  showLengthLabels,
  onToggleLengthLabels,
  getLineColor,
}: MeasurementTableProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-toolbar-foreground/70 uppercase tracking-wider">
          測量數據
        </h3>
        <Button
          variant={showLengthLabels ? "default" : "secondary"}
          size="sm"
          onClick={onToggleLengthLabels}
          className="h-8 px-3 text-xs font-medium shadow-sm"
          title={showLengthLabels ? '切換為代號顯示' : '切換為長度顯示'}
        >
          {showLengthLabels ? (
            <>
              <Hash size={14} className="mr-1.5" />
              顯示代號
            </>
          ) : (
            <>
              <ArrowUpDown size={14} className="mr-1.5" />
              顯示長度
            </>
          )}
        </Button>
      </div>
      
      {lines.length === 0 && angles.length === 0 ? (
        <p className="text-sm text-toolbar-foreground/50 italic">
          尚無測量資料
        </p>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {/* Lines section */}
          {lines.length > 0 && (
            <>
              <p className="text-xs text-toolbar-foreground/50 uppercase tracking-wider px-1 pt-1">
                線段
              </p>
              {lines.map(line => {
                const length = calculateLength(line);
                const isSelected = selectedLineIds.has(line.id);
                const rowColor = getLineColor(line.id);
                
                return (
                  <div
                    key={line.id}
                    onClick={(e) => onSelectLine(line.id, e.ctrlKey || e.metaKey)}
                    // 關鍵：將動態顏色直接套用在 background 上
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 mb-1 ${
                      isSelected ? 'text-white shadow-md' : 'hover:bg-white/5 text-slate-300'
                    }`}
                    style={{ 
                      backgroundColor: isSelected ? rowColor : 'transparent',
                      // 如果沒選中，我們給它一個淡淡的邊框或維持原樣
                      border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* 左側代號加粗，增加辨識度 */}
                      <span className="font-mono font-black text-lg">{line.label}</span>
                      <span className="text-sm font-medium opacity-80">線段</span>
                    </div>
              
                    {/* 右側長度數值 */}
                    <span className="text-sm font-mono font-bold">
                      {length.toFixed(1)} px
                    </span>
                  </div>
                );
              })}
            </>
          )}
          
          {/* Angles section */}
          {angles.length > 0 && (
            <>
              <p className="text-xs text-toolbar-foreground/50 uppercase tracking-wider px-1 pt-3">
                角度
              </p>
              {angles.map(angle => {
                const isSelected = selectedAngleIds.has(angle.id);
                
                return (
                  <div
                    key={angle.id}
                    onClick={(e) => onSelectAngle(angle.id, e.ctrlKey || e.metaKey)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 mb-1 ${
                      isSelected ? 'text-white shadow-md' : 'text-white'
                    }`}
                    style={{ 
                      // 角度目前預設使用 accent 翡翠綠
                      backgroundColor: isSelected ? 'hsl(var(--accent))' : 'rgba(16, 185, 129, 0.8)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg">{angle.label}</span>
                    </div>
                    <span className="text-sm font-mono font-bold">
                      {angle.degrees.toFixed(1)}°
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
