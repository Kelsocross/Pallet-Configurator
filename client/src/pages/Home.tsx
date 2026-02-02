import { useState, useRef, useMemo } from "react";
import { ProjectInfoForm } from "@/components/pallet/ProjectInfoForm";
import { UnitManager } from "@/components/pallet/UnitManager";
import { PalletConfig } from "@/components/pallet/PalletConfig";
import { MixedResults } from "@/components/pallet/MixedResults";
import MixedPalletVisualizer from "@/components/pallet/MixedPalletVisualizer";
import LayerView from "@/components/pallet/LayerView";
import { ProjectInfo, UnitType, UnitTypeCalculated, PalletData, UnitSystem, MixedPalletResult, BoxPlacement, PalletLayer } from "@/lib/types";
import { calculateExternalDims, calculateMixedPallet } from "@/lib/calculator";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RotateCcw, Layers, Package, ChevronLeft, ChevronRight, Sun, Moon, HelpCircle, X, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import jsPDF from "jspdf";

const generateId = () => Math.random().toString(36).substr(2, 9);

interface CalculationSnapshot {
  result: MixedPalletResult;
  pallet: PalletData;
}

export default function Home() {
  const [system, setSystem] = useState<UnitSystem>("in");
  const [isExporting, setIsExporting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    customerName: "",
    projectName: "",
    contactName: "",
    customerOrderNumber: "",
    customerOrderQty: "",
    packOutQty: "",
    notes: ""
  });

  const [units, setUnits] = useState<UnitTypeCalculated[]>([]);
  
  const [palletData, setPalletData] = useState<PalletData>({
    length: 48,
    width: 40,
    height: 5.9,
    maxHeight: 52,
    palletWeight: 45
  });

  const [snapshot, setSnapshot] = useState<CalculationSnapshot | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'partial'>('full');
  const [includeLayerViews, setIncludeLayerViews] = useState(true);
  const [showHelp, setShowHelp] = useState(true);

  // Calculate partial pallet for pack out quantity visualization
  const packOutInfo = useMemo(() => {
    if (!snapshot || !projectInfo.packOutQty) return null;
    
    const packOutQty = parseInt(projectInfo.packOutQty);
    if (isNaN(packOutQty) || packOutQty <= 0 || snapshot.result.totalUnits <= 0) return null;
    
    const unitsPerPallet = snapshot.result.totalUnits;
    const fullPallets = Math.floor(packOutQty / unitsPerPallet);
    const remainingUnits = packOutQty % unitsPerPallet;
    const totalPallets = Math.ceil(packOutQty / unitsPerPallet);
    
    // Create partial pallet result by taking only the first N placements
    let partialResult: MixedPalletResult | null = null;
    if (remainingUnits > 0) {
      const partialPlacements = snapshot.result.placements.slice(0, remainingUnits);
      
      // Rebuild layers for partial pallet by grouping placements with same Y base
      const partialLayers: PalletLayer[] = [];
      const layerMap = new Map<number, BoxPlacement[]>();
      
      for (const placement of partialPlacements) {
        const placementBaseY = Math.round((placement.position.y - placement.dimensions.h / 2) * 10) / 10;
        if (!layerMap.has(placementBaseY)) {
          layerMap.set(placementBaseY, []);
        }
        layerMap.get(placementBaseY)!.push(placement);
      }
      
      // Sort by Y base and create layer objects
      const sortedBases = Array.from(layerMap.keys()).sort((a, b) => a - b);
      sortedBases.forEach((baseY, idx) => {
        const placements = layerMap.get(baseY)!;
        const height = Math.max(...placements.map(p => p.dimensions.h));
        partialLayers.push({
          layerIndex: idx,
          height,
          baseY,
          placements,
          areaUsed: placements.reduce((sum, p) => sum + p.dimensions.l * p.dimensions.w, 0),
          areaTotal: snapshot.pallet.length * snapshot.pallet.width
        });
      });
      
      const maxY = partialPlacements.reduce((max, p) => 
        Math.max(max, p.position.y + p.dimensions.h / 2), snapshot.pallet.height);
      
      partialResult = {
        ...snapshot.result,
        placements: partialPlacements,
        layers: partialLayers,
        totalUnits: remainingUnits,
        totalHeight: maxY
      };
    }
    
    return {
      packOutQty,
      unitsPerPallet,
      fullPallets,
      remainingUnits,
      totalPallets,
      partialResult
    };
  }, [snapshot, projectInfo.packOutQty]);

  const handleProjectChange = (field: keyof ProjectInfo, value: string) => {
    setProjectInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSystemChange = (newSystem: UnitSystem) => {
    if (newSystem === system) return;
    
    const factor = newSystem === "mm" ? 25.4 : 1/25.4;
    
    setUnits(prev => prev.map(u => ({
      ...u,
      externalL: u.externalL * factor,
      externalW: u.externalW * factor,
      externalH: u.externalH * factor,
      weight: u.weight
    })));

    const weightFactor = newSystem === "mm" ? 0.453592 : 2.20462;
    const fixedMaxHeight = newSystem === "mm" ? 52 * 25.4 : 52;
    
    setPalletData(prev => ({
      ...prev,
      length: prev.length * factor,
      width: prev.width * factor,
      height: prev.height * factor,
      maxHeight: fixedMaxHeight,
      palletWeight: prev.palletWeight * weightFactor
    }));

    setSystem(newSystem);
  };

  const handleAddUnit = () => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const newUnit: UnitTypeCalculated = {
      id: generateId(),
      name: `Box ${units.length + 1}`,
      externalL: 12,
      externalW: 10,
      externalH: 8,
      weight: 0,
      quantity: 999,
      color: colors[units.length % colors.length]
    };
    setUnits(prev => [...prev, newUnit]);
  };

  const handleRemoveUnit = (id: string) => {
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  const handleUpdateUnit = (id: string, field: keyof UnitType, value: any) => {
    setUnits(prev => prev.map(u => {
      if (u.id !== id) return u;
      return { ...u, [field]: value };
    }));
  };

  const handlePalletChange = (field: keyof PalletData, value: number) => {
    setPalletData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    if (units.length === 0) return;
    
    const result = calculateMixedPallet(units, palletData);
    
    setSnapshot({
      result,
      pallet: { ...palletData }
    });
  };

  interface CaptureResult {
    image: string;
    width: number;
    height: number;
  }

  const captureCanvas = (): CaptureResult | null => {
    if (!visualizerRef.current) return null;
    const canvas = visualizerRef.current.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return null;
    try {
      return {
        image: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height
      };
    } catch {
      return null;
    }
  };

  const waitForRender = () => new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 100);
      });
    });
  });

  const handleDownload = async () => {
    if (!snapshot) return;
    
    setIsExporting(true);
    
    // Store original view mode
    const originalViewMode = viewMode;
    
    // Capture full pallet first (ensure we're in full mode)
    setViewMode('full');
    await waitForRender();
    const fullPalletCapture = captureCanvas();
    
    // Capture partial pallet if applicable
    let partialPalletCapture: CaptureResult | null = null;
    if (packOutInfo && packOutInfo.remainingUnits > 0 && packOutInfo.partialResult) {
      setViewMode('partial');
      await waitForRender();
      partialPalletCapture = captureCanvas();
    }
    
    // Restore original view mode
    setViewMode(originalViewMode);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      
      // Compact header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Pallet Configuration Report", margin, 14);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 19);
      pdf.setDrawColor(200);
      pdf.line(margin, 22, pageWidth - margin, 22);
      
      let yPos = 26;
      const unitLabel = system === "in" ? "in" : "mm";
      const weightLabel = system === "in" ? "lbs" : "kg";
      const colWidth = contentWidth / 2 - 2;
      
      // Two-column layout: Project Info (left) + Config Summary (right)
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0);
      pdf.text("Project Information", margin, yPos);
      pdf.text("Configuration Summary", margin + colWidth + 4, yPos);
      yPos += 5;
      
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const projectLines = [
        `Customer: ${projectInfo.customerName || "N/A"}`,
        `Project: ${projectInfo.projectName || "N/A"}`,
        `Contact: ${projectInfo.contactName || "N/A"}`,
      ];
      if (projectInfo.notes) projectLines.push(`Notes: ${projectInfo.notes}`);
      
      const hasWeight = snapshot.result.totalWeight > 0;
      const configLines = [
        `Pallet: 48 x 40 in (GMA)`,
        `Max Height: 52 in`,
        `Units: ${snapshot.result.totalUnits}`,
        `Layers: ${snapshot.result.layers.length}`,
        `Stack Height: ${snapshot.result.totalHeight.toFixed(1)} ${unitLabel}`,
        `Efficiency: ${snapshot.result.volumeEfficiency.toFixed(1)}%`,
        hasWeight ? `Weight: ${snapshot.result.combinedWeight.toFixed(1)} ${weightLabel}` : `Weight: N/A`,
      ];
      
      const maxLines = Math.max(projectLines.length, configLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (projectLines[i]) pdf.text(projectLines[i], margin, yPos);
        if (configLines[i]) pdf.text(configLines[i], margin + colWidth + 4, yPos);
        yPos += 4;
      }
      
      // Pack Out Quantity (compact)
      if (packOutInfo) {
        yPos += 2;
        pdf.setDrawColor(59, 130, 246);
        pdf.setFillColor(239, 246, 255);
        pdf.rect(margin, yPos - 2, contentWidth, 10, 'FD');
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(37, 99, 235);
        pdf.text("Pack Out:", margin + 2, yPos + 4);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60);
        let packText = `Order: ${packOutInfo.packOutQty} | Per Pallet: ${packOutInfo.unitsPerPallet} | Full Pallets: ${packOutInfo.fullPallets}`;
        if (packOutInfo.remainingUnits > 0) packText += ` | Partial: ${packOutInfo.remainingUnits}`;
        pdf.text(packText, margin + 22, yPos + 4);
        pdf.setTextColor(0);
        yPos += 12;
      }
      
      // Box Types (compact)
      yPos += 2;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("Box Types:", margin, yPos);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      let boxX = margin + 22;
      snapshot.result.unitSummaries.forEach((summary, idx) => {
        const color = summary.color || '#3b82f6';
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(boxX, yPos - 2.5, 3, 3, 'F');
        const unit = units.find(u => u.id === summary.unitId);
        const dimStr = unit ? `${unit.externalL.toFixed(1)}x${unit.externalW.toFixed(1)}x${unit.externalH.toFixed(1)}` : '';
        const boxText = `${summary.unitName} (${dimStr}) x${summary.countPlaced}`;
        pdf.text(boxText, boxX + 4, yPos);
        boxX += pdf.getTextWidth(boxText) + 12;
        if (boxX > pageWidth - margin - 30 && idx < snapshot.result.unitSummaries.length - 1) {
          boxX = margin + 22;
          yPos += 4;
        }
      });
      yPos += 6;
      
      // Side-by-side visualizations if both exist, otherwise full width
      const hasPartial = partialPalletCapture && packOutInfo && packOutInfo.partialResult;
      
      if (fullPalletCapture || hasPartial) {
        pdf.setDrawColor(220);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 4;
      }
      
      if (fullPalletCapture && hasPartial) {
        // Side by side layout
        const vizWidth = (contentWidth - 6) / 2;
        const canvasAspect = fullPalletCapture.height / fullPalletCapture.width;
        const maxHeight = 80;
        let vizHeight = vizWidth * canvasAspect;
        if (vizHeight > maxHeight) vizHeight = maxHeight;
        
        // Full pallet (left)
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0);
        pdf.text(`Full Pallet (${snapshot.result.totalUnits} units)`, margin, yPos);
        yPos += 3;
        
        const leftX = margin;
        pdf.addImage(fullPalletCapture.image, 'PNG', leftX, yPos, vizWidth, vizHeight);
        
        // Partial pallet (right)
        const rightX = margin + vizWidth + 6;
        pdf.text(`Partial Pallet (${packOutInfo!.remainingUnits} units)`, rightX, yPos - 3);
        pdf.addImage(partialPalletCapture!.image, 'PNG', rightX, yPos, vizWidth, vizHeight);
        
        yPos += vizHeight + 2;
        
        // Compact dimension info
        pdf.setFontSize(7);
        pdf.setTextColor(80);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${snapshot.pallet.length}x${snapshot.pallet.width}${unitLabel} | H:${snapshot.result.totalHeight.toFixed(1)}${unitLabel}`, leftX + vizWidth/2, yPos, { align: 'center' });
        pdf.text(`${snapshot.pallet.length}x${snapshot.pallet.width}${unitLabel} | H:${packOutInfo!.partialResult!.totalHeight.toFixed(1)}${unitLabel}`, rightX + vizWidth/2, yPos, { align: 'center' });
        pdf.setTextColor(0);
        yPos += 5;
      } else if (fullPalletCapture) {
        // Full width single visualization
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0);
        const vizLabel = packOutInfo ? `Full Pallet (${snapshot.result.totalUnits} units)` : "3D Visualization";
        pdf.text(vizLabel, margin, yPos);
        yPos += 3;
        
        const canvasAspect = fullPalletCapture.height / fullPalletCapture.width;
        const maxHeight = 100;
        let visualizerWidth = contentWidth * 0.95;
        let visualizerHeight = visualizerWidth * canvasAspect;
        if (visualizerHeight > maxHeight) {
          visualizerHeight = maxHeight;
          visualizerWidth = visualizerHeight / canvasAspect;
        }
        
        const visualizerX = margin + (contentWidth - visualizerWidth) / 2;
        pdf.addImage(fullPalletCapture.image, 'PNG', visualizerX, yPos, visualizerWidth, visualizerHeight);
        yPos += visualizerHeight + 2;
        
        pdf.setFontSize(7);
        pdf.setTextColor(80);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${snapshot.pallet.length}x${snapshot.pallet.width}${unitLabel} | Height: ${snapshot.result.totalHeight.toFixed(1)}${unitLabel}`, visualizerX + visualizerWidth/2, yPos, { align: 'center' });
        pdf.setTextColor(0);
        yPos += 5;
      }
      
      if (includeLayerViews && snapshot.result.layers.length > 0) {
        pdf.addPage();
        yPos = 12;
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0);
        pdf.text("Layer Details", margin, yPos);
        yPos += 8;
        
        const palletLength = snapshot.pallet.length;
        const palletWidth = snapshot.pallet.width;
        const layerDiagramWidth = 80;
        const layerDiagramHeight = (palletWidth / palletLength) * layerDiagramWidth;
        const layerBlockHeight = layerDiagramHeight + 14;
        const colGap = 10;
        
        for (let i = 0; i < snapshot.result.layers.length; i++) {
          const layer = snapshot.result.layers[i];
          const isLeftCol = i % 2 === 0;
          const colX = isLeftCol ? margin : margin + layerDiagramWidth + colGap + 15;
          
          if (isLeftCol && yPos + layerBlockHeight > 285) {
            pdf.addPage();
            yPos = 12;
          }
          
          const labelY = isLeftCol ? yPos : yPos;
          
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0);
          pdf.text(`Layer ${i + 1}`, colX, labelY);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(80);
          pdf.text(`${layer.placements.length} boxes | H:${layer.height.toFixed(1)}${unitLabel} | ${((layer.areaUsed / layer.areaTotal) * 100).toFixed(0)}%`, colX + 16, labelY);
          
          const diagramY = labelY + 4;
          const diagramX = colX + 8;
          
          pdf.setFillColor(255, 243, 224);
          pdf.setDrawColor(180, 120, 60);
          pdf.setLineWidth(0.3);
          pdf.rect(diagramX, diagramY, layerDiagramWidth, layerDiagramHeight, 'FD');
          
          const scaleX = layerDiagramWidth / palletLength;
          const scaleZ = layerDiagramHeight / palletWidth;
          
          layer.placements.forEach((placement) => {
            const boxCenterX = placement.position.x + palletLength / 2;
            const boxCenterZ = placement.position.z + palletWidth / 2;
            const boxX = diagramX + (boxCenterX - placement.dimensions.l / 2) * scaleX;
            const boxY = diagramY + (boxCenterZ - placement.dimensions.w / 2) * scaleZ;
            const boxW = placement.dimensions.l * scaleX;
            const boxH = placement.dimensions.w * scaleZ;
            
            const color = placement.color || '#3b82f6';
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            pdf.setFillColor(r, g, b);
            pdf.setDrawColor(40, 40, 40);
            pdf.setLineWidth(0.2);
            pdf.rect(boxX, boxY, boxW, boxH, 'FD');
            
            if (boxW > 8 && boxH > 5) {
              const dimLabel = `${placement.dimensions.l.toFixed(0)}x${placement.dimensions.w.toFixed(0)}`;
              pdf.setFontSize(5);
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(255, 255, 255);
              pdf.text(dimLabel, boxX + boxW / 2, boxY + boxH / 2 + 1, { align: 'center' });
            }
          });
          
          // Only advance yPos after right column (or last item if odd)
          if (!isLeftCol || i === snapshot.result.layers.length - 1) {
            yPos += layerBlockHeight;
          }
        }
      }
      
      pdf.save(`pallet_config_${projectInfo.projectName || "export"}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setSystem("in");
    setProjectInfo({
      customerName: "",
      projectName: "",
      contactName: "",
      customerOrderNumber: "",
      customerOrderQty: "",
      packOutQty: "",
      notes: ""
    });
    setUnits([]);
    setPalletData({
      length: 48,
      width: 40,
      height: 5.9,
      maxHeight: 52,
      palletWeight: 45
    });
    setSnapshot(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Pallet Configurator</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="gap-1"
              data-testid="button-show-help"
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              data-testid="button-theme-toggle"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="gap-2"
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <span className="text-sm text-muted-foreground font-mono">v1.0.0</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Getting Started Guide */}
        {showHelp && (
          <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <CardTitle className="text-base font-semibold">Getting Started</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowHelp(false)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                data-testid="button-close-help"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <p className="text-sm text-muted-foreground mb-3">
                This tool helps you calculate how many boxes fit on a pallet and visualizes the optimal stacking arrangement.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">1. Add Your Boxes</p>
                    <p className="text-xs text-muted-foreground">Enter box dimensions (L x W x H) for each type you need to ship</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">2. Set Pallet Size</p>
                    <p className="text-xs text-muted-foreground">Choose a standard pallet or enter custom dimensions</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">3. Calculate</p>
                    <p className="text-xs text-muted-foreground">Click "Optimize" to see how boxes stack on the pallet</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">4. Export PDF</p>
                    <p className="text-xs text-muted-foreground">Download a report to share with your team</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-6">
            <ProjectInfoForm info={projectInfo} onChange={handleProjectChange} />
            
            <Separator className="my-4" />
            
            <UnitManager 
              units={units} 
              system={system} 
              onSystemChange={handleSystemChange}
              onAddUnit={handleAddUnit}
              onRemoveUnit={handleRemoveUnit}
              onUpdateUnit={handleUpdateUnit}
            />

            <PalletConfig 
              data={palletData} 
              system={system} 
              onChange={handlePalletChange} 
            />

            <div className="pt-4">
              <Button 
                size="lg" 
                className="w-full text-lg shadow-lg hover:shadow-primary/20 transition-all gap-2" 
                onClick={handleCalculate} 
                disabled={units.length === 0}
              >
                <Sparkles className="w-5 h-5" />
                Optimize Pallet Configuration
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Packs all box sizes onto a single pallet for maximum efficiency
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              <div ref={resultsRef}>
                <MixedResults 
                  result={snapshot?.result || null} 
                  project={projectInfo} 
                  pallet={palletData}
                  system={system}
                  onDownload={handleDownload}
                  isExporting={isExporting}
                  includeLayerViews={includeLayerViews}
                  onIncludeLayerViewsChange={setIncludeLayerViews}
                />
              </div>
              
              {snapshot && snapshot.result.placements.length > 0 && (
                <>
                  {/* View Mode Toggle for Pack Out Qty */}
                  {packOutInfo && packOutInfo.remainingUnits > 0 && (
                    <Card className="shadow-md border-blue-500/30 bg-blue-500/5">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">
                              {packOutInfo.fullPallets} full pallet{packOutInfo.fullPallets !== 1 ? 's' : ''} + 1 partial ({packOutInfo.remainingUnits} units)
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant={viewMode === 'full' ? 'default' : 'outline'}
                              onClick={() => setViewMode('full')}
                              className="h-7 text-xs"
                            >
                              Full Pallet
                            </Button>
                            <Button
                              size="sm"
                              variant={viewMode === 'partial' ? 'default' : 'outline'}
                              onClick={() => setViewMode('partial')}
                              className="h-7 text-xs"
                            >
                              Partial Pallet
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div ref={visualizerRef}>
                    <MixedPalletVisualizer 
                      result={viewMode === 'partial' && packOutInfo?.partialResult ? packOutInfo.partialResult : snapshot.result}
                      pallet={snapshot.pallet} 
                      system={system}
                    />
                  </div>
                  
                  <Card className="shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        Layer Views
                        {viewMode === 'partial' && packOutInfo?.partialResult && (
                          <span className="text-xs font-normal text-muted-foreground">(Partial Pallet)</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LayerView 
                        layers={viewMode === 'partial' && packOutInfo?.partialResult ? packOutInfo.partialResult.layers : snapshot.result.layers}
                        pallet={snapshot.pallet}
                        system={system}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
