import { Line } from '@/types/drawing';
import { ArrowUpDown, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MeasurementTableProps {
  lines: Line[];
  calculateLength: (line: Line) => number;
  selectedLineIds: Set<string>;
  onSelectLine: (lineId: string, ctrlKey: boolean) => void;
  showLengthLabels: boolean;
  onToggleLengthLabels: () => void;
}

export const MeasurementTable = ({ 
  lines, 
  calculateLength, 
  selectedLineIds,
  onSelectLine,
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
      
      {lines.length === 0 ? (
        <p className="text-sm text-toolbar-foreground/50 italic">
          尚無線段資料
        </p>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {lines.map(line => {
            const length = calculateLength(line);
            const isSelected = selectedLineIds.has(line.id);
            
            return (
              <div
                key={line.id}
                onClick={(e) => onSelectLine(line.id, e.ctrlKey || e.metaKey)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-white/10'
                }`}
              >
                <span className="font-mono font-bold text-lg">{line.label}</span>
                <span className="text-sm font-medium">
                  {length.toFixed(1)} px
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
