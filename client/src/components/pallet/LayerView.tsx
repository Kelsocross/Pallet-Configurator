import { useState, useEffect } from "react";
import { PalletLayer, PalletData, UnitSystem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayerViewProps {
  layers: PalletLayer[];
  pallet: PalletData;
  system: UnitSystem;
}

export default function LayerView({ layers, pallet, system }: LayerViewProps) {
  const [selectedLayer, setSelectedLayer] = useState(0);
  const unitLabel = system === "in" ? '"' : "mm";

  useEffect(() => {
    if (selectedLayer >= layers.length) {
      setSelectedLayer(Math.max(0, layers.length - 1));
    }
  }, [layers.length, selectedLayer]);

  if (layers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No layers to display
      </div>
    );
  }

  const safeIndex = Math.min(selectedLayer, layers.length - 1);
  const currentLayer = layers[safeIndex];
  const maxViewWidth = 320;
  const aspectRatio = pallet.width / pallet.length;
  const viewWidth = maxViewWidth;
  const viewHeight = maxViewWidth * aspectRatio;
  const scale = maxViewWidth / pallet.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" data-testid="layer-tabs">
        {layers.map((layer, index) => (
          <Button
            key={index}
            variant={selectedLayer === index ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLayer(index)}
            data-testid={`layer-tab-${index + 1}`}
            className={cn(
              "min-w-[60px]",
              selectedLayer === index && "shadow-md"
            )}
          >
            Layer {index + 1}
          </Button>
        ))}
      </div>

      <div className="bg-white border rounded-lg p-4 shadow-inner">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-sm">
            Layer {selectedLayer + 1} - Top Down View
          </h4>
          <div className="text-xs text-muted-foreground">
            {currentLayer.placements.length} boxes | 
            Height: {currentLayer.height.toFixed(1)}{unitLabel} | 
            Area: {((currentLayer.areaUsed / currentLayer.areaTotal) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="flex justify-center pl-10 pb-8">
          <div 
            className="relative bg-amber-100 border-2 border-amber-600"
            style={{ 
              width: viewWidth, 
              height: viewHeight
            }}
            data-testid={`layer-view-${selectedLayer + 1}`}
          >
          {currentLayer.placements.map((placement, boxIndex) => {
            const boxCenterX = placement.position.x + pallet.length / 2;
            const boxCenterZ = placement.position.z + pallet.width / 2;
            const left = (boxCenterX - placement.dimensions.l / 2) * scale;
            const top = (boxCenterZ - placement.dimensions.w / 2) * scale;
            const width = placement.dimensions.l * scale;
            const height = placement.dimensions.w * scale;

            return (
              <div
                key={boxIndex}
                className="absolute border border-gray-700 flex items-center justify-center text-[8px] font-medium overflow-hidden"
                style={{
                  left,
                  top,
                  width,
                  height,
                  backgroundColor: placement.color || '#3b82f6',
                  opacity: 0.9,
                }}
                title={`${placement.unitName} (${placement.dimensions.l.toFixed(1)} x ${placement.dimensions.w.toFixed(1)}${unitLabel})`}
              >
                <span className="text-white drop-shadow-sm truncate px-0.5">
                  {placement.dimensions.l.toFixed(0)}x{placement.dimensions.w.toFixed(0)}
                </span>
              </div>
            );
          })}

          <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-muted-foreground">
            {pallet.length.toFixed(0)}{unitLabel} (Length)
          </div>
          <div 
            className="absolute -left-8 top-0 bottom-0 flex items-center justify-center text-xs text-muted-foreground"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {pallet.width.toFixed(0)}{unitLabel} (Width)
          </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Click on layer tabs above to view different layers
      </div>
    </div>
  );
}
