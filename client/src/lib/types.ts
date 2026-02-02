import { z } from "zod";

export type UnitSystem = "in" | "mm";

export interface ProjectInfo {
  customerName: string;
  projectName: string;
  contactName: string;
  customerOrderNumber: string;
  customerOrderQty: string;
  packOutQty: string;
  notes: string;
}

export interface UnitType {
  id: string;
  name: string;
  externalL: number;
  externalW: number;
  externalH: number;
  weight: number;
  quantity?: number;
  color?: string;
}

// For backwards compatibility, UnitTypeCalculated is now the same as UnitType
export type UnitTypeCalculated = UnitType;

export interface PalletData {
  length: number;
  width: number;
  height: number;
  maxHeight: number;
  palletWeight: number;
  weightCapacity?: number;
}

// Placement of a single box on the pallet
export interface BoxPlacement {
  unitId: string;
  unitName: string;
  color: string;
  position: { x: number; y: number; z: number };
  dimensions: { l: number; w: number; h: number };
  rotated: boolean;
}

// A layer contains multiple box placements
export interface PalletLayer {
  layerIndex: number;
  height: number; // Height of this layer (tallest box in it)
  baseY: number;  // Y position where this layer starts
  placements: BoxPlacement[];
  areaUsed: number;
  areaTotal: number;
}

// Summary of how many of each unit type fit
export interface UnitSummary {
  unitId: string;
  unitName: string;
  color: string;
  countPlaced: number;
  quantityRequested: number | null;
  quantityRemaining: number | null;
}

// Mixed pallet configuration result
export interface MixedPalletResult {
  layers: PalletLayer[];
  placements: BoxPlacement[]; // Flat list of all placements for easy 3D rendering
  unitSummaries: UnitSummary[];
  totalUnits: number;
  totalWeight: number;      // Weight of units only
  palletWeight: number;     // Weight of pallet itself
  combinedWeight: number;   // Pallet + units weight
  totalHeight: number;
  volumeEfficiency: number;
  areaEfficiency: number;
  warnings: string[];
  isValid: boolean;
}

export interface CalculationResult {
  unitsPerLayer: number;
  orientation: "L_along_L" | "W_along_L";
  maxLayers: number;
  totalUnits: number;
  totalHeight: number;
  totalWeight: number;
  layerAreaUsage: number;
  layerCounts: { length: number; width: number };
  warnings: string[];
}

export interface UnitOptimizationResult {
  unit: UnitTypeCalculated;
  result: CalculationResult;
  rank: number;
  volumeEfficiency: number;
  palletsNeeded: number | null;
}

// Standard pallet sizes with typical weights (in lbs for imperial, kg for metric)
export const COMMON_PALLETS = [
  { name: "Standard NA (48 x 40 in)", w: 40, l: 48, units: "in", weight: 45, weightUnit: "lbs" },
  { name: "Standard NA (48 x 48 in)", w: 48, l: 48, units: "in", weight: 55, weightUnit: "lbs" },
  { name: "Euro (1200 x 800 mm)", w: 800, l: 1200, units: "mm", weight: 25, weightUnit: "kg" },
  { name: "Industry (1200 x 1000 mm)", w: 1000, l: 1200, units: "mm", weight: 30, weightUnit: "kg" },
  { name: "Half Pallet (40 x 24 in)", w: 24, l: 40, units: "in", weight: 25, weightUnit: "lbs" },
];
