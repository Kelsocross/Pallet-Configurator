import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalculationResult, ProjectInfo, UnitSystem, PalletData } from "@/lib/types";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ResultsSummaryProps {
  result: CalculationResult | null;
  project: ProjectInfo;
  pallet: PalletData;
  system: UnitSystem;
  onDownload: () => void;
}

export function ResultsSummary({ result, project, pallet, system, onDownload }: ResultsSummaryProps) {
  const unitLabel = system === "in" ? "in" : "mm";
  const weightLabel = system === "in" ? "lbs" : "kg";

  if (!result) {
    return (
      <Card className="shadow-sm border-dashed border-2 h-full min-h-[300px] flex items-center justify-center bg-muted/10">
        <div className="text-center text-muted-foreground">
          <p>Configure units and click Calculate</p>
          <p className="text-sm opacity-70">Results will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-primary/40 h-full flex flex-col">
      <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
        <CardTitle className="text-lg font-bold tracking-tight text-primary flex items-center justify-between">
          <span>Configuration Results</span>
          <Button size="sm" onClick={onDownload} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6 flex-1 overflow-auto">
        
        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border rounded-lg p-3 shadow-sm">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Units</div>
            <div className="text-2xl font-mono font-bold text-foreground">{result.totalUnits}</div>
          </div>
          <div className="bg-card border rounded-lg p-3 shadow-sm">
             <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Weight</div>
             <div className="text-2xl font-mono font-bold text-foreground">{result.totalWeight.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">{weightLabel}</span></div>
          </div>
          <div className="bg-card border rounded-lg p-3 shadow-sm">
             <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Height</div>
             <div className={`text-2xl font-mono font-bold ${result.totalHeight > pallet.maxHeight ? "text-destructive" : "text-foreground"}`}>
               {result.totalHeight.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">{unitLabel}</span>
             </div>
             {result.totalHeight > pallet.maxHeight && (
               <div className="text-[10px] text-destructive font-medium mt-1 flex items-center">
                 <AlertTriangle className="w-3 h-3 mr-1" /> Exceeds Max ({pallet.maxHeight})
               </div>
             )}
          </div>
          <div className="bg-card border rounded-lg p-3 shadow-sm">
             <div className="text-xs text-muted-foreground uppercase tracking-wider">Area Efficiency</div>
             <div className="text-2xl font-mono font-bold text-foreground">{result.layerAreaUsage.toFixed(1)}%</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold border-b pb-1">Layer Configuration</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-muted-foreground">Orientation:</div>
            <div className="font-medium text-right">{result.orientation === "L_along_L" ? "Length along Pallet Length" : "Width along Pallet Length"}</div>
            
            <div className="text-muted-foreground">Units per Layer:</div>
            <div className="font-medium text-right">{result.unitsPerLayer}</div>
            
            <div className="text-muted-foreground">Layer Count:</div>
            <div className="font-medium text-right">{result.maxLayers}</div>
          </div>
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Warnings Detected
            </div>
            <ul className="list-disc list-inside text-xs text-destructive/90 space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3 flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Configuration Valid</span>
          </div>
        )}

        <div className="pt-4 border-t text-xs text-muted-foreground">
          <p>Project: <span className="font-medium text-foreground">{project.projectName || "N/A"}</span></p>
          <p>Customer: <span className="font-medium text-foreground">{project.customerName || "N/A"}</span></p>
        </div>

      </CardContent>
    </Card>
  );
}
