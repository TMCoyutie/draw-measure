import { Line } from '@/types/drawing';

interface MeasurementTableProps {
  lines: Line[];
  calculateLength: (line: Line) => number;
  selectedLineId: string | null;
  onSelectLine: (lineId: string) => void;
}

export const MeasurementTable = ({ 
  lines, 
  calculateLength, 
  selectedLineId,
  onSelectLine 
}: MeasurementTableProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-toolbar-foreground/70 uppercase tracking-wider mb-3">
        測量數據
      </h3>
      
      {lines.length === 0 ? (
        <p className="text-sm text-toolbar-foreground/50 italic">
          尚無線段資料
        </p>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {lines.map(line => {
            const length = calculateLength(line);
            const isSelected = selectedLineId === line.id;
            
            return (
              <div
                key={line.id}
                onClick={() => onSelectLine(line.id)}
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
