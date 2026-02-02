import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnitOptimizationResult, ProjectInfo, UnitSystem, PalletData } from "@/lib/types";
import { Download, AlertTriangle, CheckCircle2, Trophy, TrendingUp, Box, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizationResultsProps {
  results: UnitOptimizationResult[];
  project: ProjectInfo;
  pallet: PalletData;
  system: UnitSystem;
  selectedIndex: number;
  onSelectResult: (index: number) => void;
  onDownload: () => void;
}

export function OptimizationResults({ 
  results, 
  project, 
  pallet, 
  system, 
  selectedIndex,
  onSelectResult,
  onDownload 
}: OptimizationResultsProps) {
  const unitLabel = system === "in" ? "in" : "mm";
  const weightLabel = system === "in" ? "lbs" : "kg";

  if (results.length === 0) {
    return (
      <Card className="shadow-sm border-dashed border-2 h-full min-h-[300px] flex items-center justify-center bg-muted/10">
        <div className="text-center text-muted-foreground">
          <p>Add unit types and click Calculate</p>
          <p className="text-sm opacity-70">Results will appear here</p>
        </div>
      </Card>
    );
  }

  const bestResult = results[0];
  const selected = results[selectedIndex] || bestResult;

  return (
    <Card className="shadow-md border-primary/40 h-full flex flex-col">
      <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
        <CardTitle className="text-lg font-bold tracking-tight text-primary flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Optimization Results
          </span>
          <Button size="sm" onClick={onDownload} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 flex-1 overflow-auto">
        
        {/* Best Option Highlight */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-green-700 dark:text-green-400">Best Option</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{bestResult.unit.name}</p>
              <p className="text-sm text-muted-foreground">
                {bestResult.volumeEfficiency.toFixed(1)}% volume efficiency
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-foreground">{bestResult.result.totalUnits}</p>
              <p className="text-xs text-muted-foreground">units/pallet</p>
            </div>
          </div>
        </div>

        {/* All Results Ranking */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4" />
            All Configurations Ranked
          </h4>
          
          <div className="space-y-2">
            {results.map((opt, index) => (
              <button
                key={opt.unit.id}
                onClick={() => onSelectResult(index)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  index === selectedIndex 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    opt.rank === 1 ? "bg-yellow-500 text-yellow-950" :
                    opt.rank === 2 ? "bg-gray-300 text-gray-700" :
                    opt.rank === 3 ? "bg-orange-400 text-orange-950" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {opt.rank}
                  </div>
                  
                  <div 
                    className="w-3 h-3 rounded-sm border shadow-sm"
                    style={{ backgroundColor: opt.unit.color || '#ccc' }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{opt.unit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {opt.unit.externalL.toFixed(1)} x {opt.unit.externalW.toFixed(1)} x {opt.unit.externalH.toFixed(1)} {unitLabel}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm">{opt.result.totalUnits}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.volumeEfficiency.toFixed(1)}% eff</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Details */}
        <div className="pt-4 border-t space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Box className="w-4 h-4" />
            Selected: {selected.unit.name}
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border rounded-lg p-2.5 shadow-sm">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Units/Layer</div>
              <div className="text-lg font-mono font-bold">{selected.result.unitsPerLayer}</div>
            </div>
            <div className="bg-card border rounded-lg p-2.5 shadow-sm">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Layers</div>
              <div className="text-lg font-mono font-bold">{selected.result.maxLayers}</div>
            </div>
            <div className="bg-card border rounded-lg p-2.5 shadow-sm">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Height</div>
              <div className={cn(
                "text-lg font-mono font-bold",
                selected.result.totalHeight > pallet.maxHeight ? "text-destructive" : ""
              )}>
                {selected.result.totalHeight.toFixed(1)}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-2.5 shadow-sm">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Weight</div>
              <div className="text-lg font-mono font-bold">{selected.result.totalWeight.toFixed(1)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 text-xs">
            <div className="text-muted-foreground">Orientation:</div>
            <div className="font-medium text-right">
              {selected.result.orientation === "L_along_L" ? "Length-wise" : "Width-wise"}
            </div>
            <div className="text-muted-foreground">Area Usage:</div>
            <div className="font-medium text-right">{selected.result.layerAreaUsage.toFixed(1)}%</div>
            {selected.palletsNeeded && (
              <>
                <div className="text-muted-foreground">Pallets Needed:</div>
                <div className="font-medium text-right">{selected.palletsNeeded}</div>
              </>
            )}
          </div>

          {/* Warnings */}
          {selected.result.warnings.length > 0 ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2.5">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs mb-1">
                <AlertTriangle className="w-3 h-3" />
                Warnings
              </div>
              <ul className="list-disc list-inside text-[10px] text-destructive/90 space-y-0.5">
                {selected.result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/20 rounded-md p-2 flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Valid Configuration</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>Project: <span className="font-medium text-foreground">{project.projectName || "N/A"}</span></p>
          <p>Customer: <span className="font-medium text-foreground">{project.customerName || "N/A"}</span></p>
        </div>

      </CardContent>
    </Card>
  );
}
