import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnitType, UnitTypeCalculated, UnitSystem } from "@/lib/types";
import { Trash2, Plus, Box } from "lucide-react";

interface UnitManagerProps {
  units: UnitTypeCalculated[];
  system: UnitSystem;
  onSystemChange: (val: UnitSystem) => void;
  onAddUnit: () => void;
  onRemoveUnit: (id: string) => void;
  onUpdateUnit: (id: string, field: keyof UnitType, value: any) => void;
}

export function UnitManager({ 
  units, 
  system, 
  onSystemChange, 
  onAddUnit, 
  onRemoveUnit, 
  onUpdateUnit 
}: UnitManagerProps) {
  
  const unitLabel = system === "in" ? "in" : "mm";
  const weightLabel = system === "in" ? "lbs" : "kg";

  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="bg-muted/30 pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full"></span>
          Unit Information (Cartons)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground font-medium uppercase">Units:</Label>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button 
              onClick={() => onSystemChange("in")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${system === "in" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              Inches
            </button>
            <div className="w-[1px] h-full bg-border"></div>
            <button 
              onClick={() => onSystemChange("mm")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${system === "mm" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              Millimeters
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {units.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No unit types defined.</p>
            <Button variant="link" onClick={onAddUnit} className="text-primary">Add your first unit type</Button>
          </div>
        )}

        {units.map((unit) => (
          <div key={unit.id} className="grid grid-cols-12 gap-4 p-4 rounded-lg border bg-card hover:bg-muted/10 transition-colors items-start relative group">
            
            {/* Header / Name */}
            <div className="col-span-12 md:col-span-3 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Unit Name / SKU</Label>
              <Input 
                value={unit.name} 
                onChange={(e) => onUpdateUnit(unit.id, "name", e.target.value)}
                placeholder="Box A"
                className="font-medium"
              />
              <div className="flex items-center gap-2 pt-2">
                <div 
                  className="w-4 h-4 rounded-full border shadow-sm"
                  style={{ backgroundColor: unit.color || '#ccc' }}
                />
                <span className="text-xs text-muted-foreground">Color ID</span>
              </div>
            </div>

            {/* External Dims */}
            <div className="col-span-12 md:col-span-4 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Dimensions ({unitLabel})</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input 
                    type="number" 
                    value={unit.externalL || ""} 
                    onChange={(e) => onUpdateUnit(unit.id, "externalL", parseFloat(e.target.value) || 0)}
                    placeholder="L"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Input 
                    type="number" 
                    value={unit.externalW || ""} 
                    onChange={(e) => onUpdateUnit(unit.id, "externalW", parseFloat(e.target.value) || 0)}
                    placeholder="W"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Input 
                    type="number" 
                    value={unit.externalH || ""} 
                    onChange={(e) => onUpdateUnit(unit.id, "externalH", parseFloat(e.target.value) || 0)}
                    placeholder="H"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Weight (Optional) */}
            <div className="col-span-12 md:col-span-3 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Weight ({weightLabel}) - Optional</Label>
              <Input 
                type="number"
                value={unit.weight || ""}
                onChange={(e) => onUpdateUnit(unit.id, "weight", parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
                placeholder="Optional"
              />
            </div>

            {/* Actions */}
            <div className="col-span-12 md:col-span-2 flex justify-end items-start pt-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onRemoveUnit(unit.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button onClick={onAddUnit} variant="outline" className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all">
          <Plus className="w-4 h-4 mr-2" /> Add Unit Type
        </Button>
      </CardContent>
    </Card>
  );
}
