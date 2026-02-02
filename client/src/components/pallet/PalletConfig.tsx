import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PalletData, UnitSystem } from "@/lib/types";

interface PalletConfigProps {
  data: PalletData;
  system: UnitSystem;
  onChange: (field: keyof PalletData, value: number) => void;
}

const PALLET_PRESETS = {
  standard: { length: 48, width: 40, height: 5.9, maxHeight: 52, palletWeight: 45, label: "48 x 40 in (Standard NA GMA)" },
  custom: { length: 48, width: 40, height: 5.9, maxHeight: 52, palletWeight: 45, label: "Custom Size" }
};

export function PalletConfig({ data, system, onChange }: PalletConfigProps) {
  const [palletType, setPalletType] = useState<string>("standard");
  const unitLabel = system === "in" ? "in" : "mm";
  const weightLabel = system === "in" ? "lbs" : "kg";
  
  const isCustom = palletType === "custom";

  const handlePresetChange = (value: string) => {
    setPalletType(value);
    if (value !== "custom") {
      const preset = PALLET_PRESETS[value as keyof typeof PALLET_PRESETS];
      onChange("length", preset.length);
      onChange("width", preset.width);
      onChange("height", preset.height);
      onChange("maxHeight", preset.maxHeight);
      onChange("palletWeight", preset.palletWeight);
    }
  };

  const handleInputChange = (field: keyof PalletData, value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange(field, numValue);
  };

  return (
    <Card className="shadow-sm border-primary/20" data-testid="card-pallet-config">
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full"></span>
          Pallet Data
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Pallet Size</Label>
          <Select value={palletType} onValueChange={handlePresetChange}>
            <SelectTrigger data-testid="select-pallet-type">
              <SelectValue placeholder="Select pallet size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">48 x 40 in (Standard NA GMA)</SelectItem>
              <SelectItem value="custom">Custom Size</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            {isCustom ? "Enter your custom pallet dimensions below" : "Standard pallet dimensions applied"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Length ({unitLabel})</Label>
            <Input 
              type="number" 
              value={data.length}
              onChange={(e) => handleInputChange("length", e.target.value)}
              readOnly={!isCustom}
              disabled={!isCustom}
              className={isCustom ? "" : "bg-muted/30 cursor-not-allowed"}
              data-testid="input-pallet-length"
            />
          </div>
          <div className="space-y-2">
            <Label>Width ({unitLabel})</Label>
            <Input 
              type="number" 
              value={data.width}
              onChange={(e) => handleInputChange("width", e.target.value)}
              readOnly={!isCustom}
              disabled={!isCustom}
              className={isCustom ? "" : "bg-muted/30 cursor-not-allowed"}
              data-testid="input-pallet-width"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-2">
            <Label>Pallet Height ({unitLabel})</Label>
            <Input 
              type="number" 
              value={data.height}
              onChange={(e) => handleInputChange("height", e.target.value)}
              readOnly={!isCustom}
              disabled={!isCustom}
              className={isCustom ? "" : "bg-muted/30 cursor-not-allowed"}
              data-testid="input-pallet-height"
            />
            <p className="text-[10px] text-muted-foreground">Height of the empty wooden pallet</p>
          </div>
          <div className="space-y-2">
            <Label className="text-primary font-medium">Max Stack Height ({unitLabel})</Label>
            <Input 
              type="number" 
              value={data.maxHeight}
              onChange={(e) => handleInputChange("maxHeight", e.target.value)}
              readOnly={!isCustom}
              disabled={!isCustom}
              className={isCustom ? "border-primary/30" : "border-primary/30 bg-primary/10 font-medium cursor-not-allowed"}
              data-testid="input-max-height"
            />
            <p className="text-[10px] text-muted-foreground">
              {isCustom ? "Maximum height from floor" : "Fixed at 52\" from floor (shipping standard)"}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="space-y-2">
            <Label>Pallet Weight ({weightLabel})</Label>
            <Input 
              type="number" 
              value={data.palletWeight}
              onChange={(e) => handleInputChange("palletWeight", e.target.value)}
              readOnly={!isCustom}
              disabled={!isCustom}
              className={isCustom ? "" : "bg-muted/30 cursor-not-allowed"}
              data-testid="input-pallet-weight"
            />
            <p className="text-[10px] text-muted-foreground">Weight of the empty pallet</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
