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
                const labelBgColor = getLineColor(line.id);
                
                return (
                  <div
                    key={line.id}
                    onClick={(e) => onSelectLine(line.id, e.ctrlKey || e.metaKey)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                      isSelected 
                        ? 'bg-white/10 ring-1 ring-white/20' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div 
                      className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-black text-white shadow-sm transition-colors"
                      style={{ backgroundColor: labelBgColor }}
                    >
                      {line.label}
                    </div>
          
                    {/* 線段代碼（選填，若想保留原本的大字可以加在這裡） */}
                    <span className="flex-1 font-mono text-sm font-medium text-slate-300">
                      線段 {line.label}
                    </span>
          
                    {/* 長度數值 */}
                    <span className="text-sm font-mono font-medium text-slate-400">
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
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                      isSelected 
                        ? 'bg-accent text-accent-foreground' 
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <span className="font-mono font-bold text-lg">{angle.label}</span>
                    <span className="text-sm font-medium">
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
