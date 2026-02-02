import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MixedPalletResult, ProjectInfo, UnitSystem, PalletData } from "@/lib/types";
import { CheckCircle2, Package, Layers, Scale, Ruler, Loader2, FileText, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MixedResultsProps {
  result: MixedPalletResult | null;
  project: ProjectInfo;
  pallet: PalletData;
  system: UnitSystem;
  onDownload: () => void;
  isExporting?: boolean;
  includeLayerViews?: boolean;
  onIncludeLayerViewsChange?: (value: boolean) => void;
}

export function MixedResults({ result, project, pallet, system, onDownload, isExporting = false, includeLayerViews = true, onIncludeLayerViewsChange }: MixedResultsProps) {
  const unitLabel = system === "in" ? "in" : "mm";
  const weightLabel = system === "in" ? "lbs" : "kg";

  if (!result) {
    return (
      <Card className="shadow-sm border-dashed border-2 h-full min-h-[300px] flex items-center justify-center bg-muted/10">
        <div className="text-center text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Add unit types and click Optimize</p>
          <p className="text-sm opacity-70">All sizes will be packed onto one pallet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-primary/40 h-full flex flex-col">
      <CardHeader className="bg-primary/5 pb-3 border-b border-primary/10">
        <CardTitle className="text-lg font-bold tracking-tight text-primary flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pallet Configuration
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox 
                checked={includeLayerViews} 
                onCheckedChange={(checked) => onIncludeLayerViewsChange?.(checked === true)}
              />
              Include layers
            </label>
            <Button size="sm" onClick={onDownload} className="gap-2" disabled={!result.isValid || isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Export PDF
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 flex-1 overflow-auto">
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Package className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Total Units</span>
            </div>
            <div className="text-3xl font-mono font-bold text-foreground">{result.totalUnits}</div>
          </div>
          
          <div className="bg-card border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Layers</span>
            </div>
            <div className="text-3xl font-mono font-bold text-foreground">{result.layers.length}</div>
          </div>
          
          <div className="bg-card border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Ruler className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Height</span>
            </div>
            <div className={cn(
              "text-2xl font-mono font-bold",
              result.totalHeight > pallet.maxHeight ? "text-destructive" : "text-foreground"
            )}>
              {result.totalHeight.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground ml-1">{unitLabel}</span>
            </div>
          </div>
          
          <div className="bg-card border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Scale className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Total Weight</span>
            </div>
            {result.totalWeight > 0 ? (
              <>
                <div className="text-2xl font-mono font-bold text-foreground">
                  {result.combinedWeight.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">{weightLabel}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Pallet: {result.palletWeight.toFixed(1)} + Units: {result.totalWeight.toFixed(1)}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Weight not calculated
              </div>
            )}
          </div>
        </div>

        {/* Pallets Needed for Order */}
        {project.packOutQty && parseInt(project.packOutQty) > 0 && result.totalUnits > 0 && (
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Pallets Needed for Order</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-mono font-bold text-foreground">
                {Math.ceil(parseInt(project.packOutQty) / result.totalUnits)}
              </div>
              <span className="text-sm text-muted-foreground">
                ({project.packOutQty} units / {result.totalUnits} per pallet)
              </span>
            </div>
          </div>
        )}

        {/* Volume Efficiency Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Volume Efficiency</span>
            <span className="font-mono font-bold">{result.volumeEfficiency.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
              style={{ width: `${Math.min(result.volumeEfficiency, 100)}%` }}
            />
          </div>
        </div>

        {/* Units by Type */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold border-b pb-1">Units That Fit by Type</h4>
          <div className="space-y-2">
            {result.unitSummaries.map((summary) => (
              <div key={summary.unitId} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                <div 
                  className="w-4 h-4 rounded-sm border shadow-sm flex-shrink-0"
                  style={{ backgroundColor: summary.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{summary.unitName}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-lg">{summary.countPlaced}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success indicator */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3 flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Optimal configuration found</span>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>Project: <span className="font-medium text-foreground">{project.projectName || "N/A"}</span></p>
          <p>Customer: <span className="font-medium text-foreground">{project.customerName || "N/A"}</span></p>
        </div>

      </CardContent>
    </Card>
  );
}
