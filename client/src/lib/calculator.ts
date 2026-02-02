import { 
  UnitType, 
  UnitTypeCalculated, 
  PalletData, 
  MixedPalletResult,
  BoxPlacement,
  PalletLayer,
  UnitSummary,
  UnitSystem 
} from "./types";

export const convert = (value: number, from: UnitSystem, to: UnitSystem): number => {
  if (from === to) return value;
  if (from === "in" && to === "mm") return value * 25.4;
  if (from === "mm" && to === "in") return value / 25.4;
  return value;
};

// External dims are now entered directly, no calculation needed
export const calculateExternalDims = (unit: UnitType): UnitTypeCalculated => {
  return unit;
};

interface BoxOrientation {
  l: number;
  w: number;
  h: number;
  orientationId: number;
}

function getAllOrientations(unit: UnitTypeCalculated): BoxOrientation[] {
  const dims = [unit.externalL, unit.externalW, unit.externalH];
  const orientations: BoxOrientation[] = [];
  
  for (let heightIdx = 0; heightIdx < 3; heightIdx++) {
    const h = dims[heightIdx];
    const remaining = dims.filter((_, i) => i !== heightIdx);
    
    // Try both footprint permutations (l×w and w×l) to find optimal packing
    const permutations = [
      { l: remaining[0], w: remaining[1] },
      { l: remaining[1], w: remaining[0] }
    ];
    
    for (const perm of permutations) {
      const exists = orientations.some(o => 
        Math.abs(o.l - perm.l) < 0.01 && Math.abs(o.w - perm.w) < 0.01 && Math.abs(o.h - h) < 0.01
      );
      
      if (!exists) {
        orientations.push({ l: perm.l, w: perm.w, h, orientationId: heightIdx });
      }
    }
  }
  
  return orientations;
}

interface BoxToPack {
  unit: UnitTypeCalculated;
  remaining: number;
  originalQty: number | null;
  l: number;
  w: number;
  h: number;
  orientationId: number;
}

interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface PlacedBox {
  unitId: string;
  unitName: string;
  color: string;
  x: number;
  z: number;
  dimL: number;
  dimW: number;
  dimH: number;
  rotated: boolean;
}

function packLayerWithFreeRects(
  boxes: BoxToPack[],
  palletL: number,
  palletW: number,
  maxLayerHeight: number
): { placements: PlacedBox[]; layerThickness: number; boxesUsed: Map<string, number> } {
  const placements: PlacedBox[] = [];
  let layerThickness = 0;
  const boxesUsed = new Map<string, number>();
  
  let freeRects: Rect[] = [{ x: 0, z: 0, w: palletL, d: palletW }];

  const eligibleBoxes = boxes
    .filter(b => b.remaining > 0 && b.h <= maxLayerHeight)
    .sort((a, b) => (b.l * b.w) - (a.l * a.w));

  if (eligibleBoxes.length === 0) {
    return { placements: [], layerThickness: 0, boxesUsed };
  }

  for (const boxEntry of eligibleBoxes) {
    while (boxEntry.remaining > 0) {
      const boxL = boxEntry.l;
      const boxW = boxEntry.w;
      const boxH = boxEntry.h;

      let bestRect: Rect | null = null;
      let bestRectIndex = -1;
      let bestFitL = 0;
      let bestFitW = 0;
      let bestScore = Infinity;

      for (let i = 0; i < freeRects.length; i++) {
        const rect = freeRects[i];
        
        if (boxL <= rect.w + 0.001 && boxW <= rect.d + 0.001) {
          const score = rect.x + rect.z;
          if (score < bestScore) {
            bestScore = score;
            bestRect = rect;
            bestRectIndex = i;
            bestFitL = boxL;
            bestFitW = boxW;
          }
        }
        
        if (boxW <= rect.w + 0.001 && boxL <= rect.d + 0.001) {
          const score = rect.x + rect.z;
          if (score < bestScore) {
            bestScore = score;
            bestRect = rect;
            bestRectIndex = i;
            bestFitL = boxW;
            bestFitW = boxL;
          }
        }
      }

      if (!bestRect) {
        break;
      }

      placements.push({
        unitId: boxEntry.unit.id,
        unitName: boxEntry.unit.name,
        color: boxEntry.unit.color || '#3b82f6',
        x: bestRect.x,
        z: bestRect.z,
        dimL: bestFitL,
        dimW: bestFitW,
        dimH: boxH,
        rotated: bestFitL !== boxL
      });

      boxEntry.remaining--;
      boxesUsed.set(boxEntry.unit.id, (boxesUsed.get(boxEntry.unit.id) || 0) + 1);
      layerThickness = Math.max(layerThickness, boxH);

      freeRects.splice(bestRectIndex, 1);

      const rightRect: Rect = {
        x: bestRect.x + bestFitL,
        z: bestRect.z,
        w: bestRect.w - bestFitL,
        d: bestFitW
      };
      
      const topRect: Rect = {
        x: bestRect.x,
        z: bestRect.z + bestFitW,
        w: bestRect.w,
        d: bestRect.d - bestFitW
      };

      if (rightRect.w > 0.1 && rightRect.d > 0.1) {
        freeRects.push(rightRect);
      }
      if (topRect.w > 0.1 && topRect.d > 0.1) {
        freeRects.push(topRect);
      }

      freeRects.sort((a, b) => (a.x + a.z) - (b.x + b.z));
    }
  }

  return { placements, layerThickness, boxesUsed };
}

interface BoxVariant {
  unit: UnitTypeCalculated;
  orient: BoxOrientation;
  variantId: string;
}

function countGridFit(l: number, w: number, palletL: number, palletW: number): number {
  // Directional scoring - only count boxes for this specific orientation
  // This allows the algorithm to prefer 12×19 over 19×12 when 12×19 fits more
  const fitAlongLength = Math.floor(palletL / l);
  const fitAlongWidth = Math.floor(palletW / w);
  return fitAlongLength * fitAlongWidth;
}

function scoreTotalBoxes(orient: BoxOrientation, palletL: number, palletW: number, maxHeight: number, palletBaseHeight: number): number {
  // Calculate total boxes that could fit considering both area and height
  const boxesPerLayer = countGridFit(orient.l, orient.w, palletL, palletW);
  const usableHeight = maxHeight - palletBaseHeight;
  const layersThatFit = Math.floor(usableHeight / orient.h);
  return boxesPerLayer * layersThatFit;
}

interface RowPlacement {
  orientations: { orient: BoxOrientation; fitL: number; fitW: number; unit: UnitTypeCalculated }[];
  totalWidth: number;
  boxCount: number;
  maxHeight: number;
}

function findBestRowSequence(
  variants: BoxVariant[],
  cellWidth: number,
  cellDepth: number,
  remainingHeight: number
): RowPlacement | null {
  // Find all orientations that fit in this cell's depth and height
  const fittingVariants: { variant: BoxVariant; fitL: number; fitW: number }[] = [];
  
  for (const variant of variants) {
    const { orient } = variant;
    if (orient.h > remainingHeight + 0.01) continue;
    
    // Check both rotation options
    if (orient.l <= cellWidth + 0.01 && orient.w <= cellDepth + 0.01) {
      fittingVariants.push({ variant, fitL: orient.l, fitW: orient.w });
    }
    if (orient.w <= cellWidth + 0.01 && orient.l <= cellDepth + 0.01) {
      // Avoid duplicate if l === w
      if (Math.abs(orient.l - orient.w) > 0.01) {
        fittingVariants.push({ variant, fitL: orient.w, fitW: orient.l });
      }
    }
  }
  
  if (fittingVariants.length === 0) return null;
  
  // Group by depth (fitW) - we can only combine boxes with same depth in a row
  type FittingVariant = { variant: BoxVariant; fitL: number; fitW: number };
  const byDepth = new Map<number, FittingVariant[]>();
  for (const fv of fittingVariants) {
    const depthKey = Math.round(fv.fitW * 100) / 100;
    if (!byDepth.has(depthKey)) byDepth.set(depthKey, []);
    byDepth.get(depthKey)!.push(fv);
  }
  
  let bestRow: RowPlacement | null = null;
  
  // For each possible depth, find the best combination of widths
  const depthEntries = Array.from(byDepth.entries());
  for (let i = 0; i < depthEntries.length; i++) {
    const [depth, depthVariants] = depthEntries[i];
    if (depth > cellDepth + 0.01) continue;
    
    // Sort by width (fitL) to help with greedy packing
    depthVariants.sort((a: FittingVariant, b: FittingVariant) => b.fitL - a.fitL);
    
    // Try to pack as many boxes as possible in the row width
    // Use a simple greedy approach with backtracking for small sets
    const result = packRowGreedy(depthVariants, cellWidth, remainingHeight);
    
    if (result && (!bestRow || result.boxCount > bestRow.boxCount)) {
      bestRow = result;
    }
  }
  
  return bestRow;
}

function packRowGreedy(
  variants: { variant: BoxVariant; fitL: number; fitW: number }[],
  maxWidth: number,
  remainingHeight: number
): RowPlacement | null {
  // Try all combinations using DFS to find maximum boxes
  const placements: RowPlacement['orientations'] = [];
  let currentWidth = 0;
  let maxBoxHeight = 0;
  
  // Sort by width descending for initial greedy pass
  const sorted = [...variants].sort((a, b) => b.fitL - a.fitL);
  
  // First pass: greedy with largest first
  for (const v of sorted) {
    while (currentWidth + v.fitL <= maxWidth + 0.01) {
      placements.push({
        orient: v.variant.orient,
        fitL: v.fitL,
        fitW: v.fitW,
        unit: v.variant.unit
      });
      currentWidth += v.fitL;
      maxBoxHeight = Math.max(maxBoxHeight, v.variant.orient.h);
    }
  }
  
  // Second pass: try to fill remaining gap with smaller orientations
  const remainingWidth = maxWidth - currentWidth;
  if (remainingWidth > 0.5) {
    // Sort by width ascending to find smallest that fits
    const smallerSorted = [...variants].sort((a, b) => a.fitL - b.fitL);
    for (const v of smallerSorted) {
      if (v.fitL <= remainingWidth + 0.01) {
        placements.push({
          orient: v.variant.orient,
          fitL: v.fitL,
          fitW: v.fitW,
          unit: v.variant.unit
        });
        currentWidth += v.fitL;
        maxBoxHeight = Math.max(maxBoxHeight, v.variant.orient.h);
        break;
      }
    }
  }
  
  if (placements.length === 0) return null;
  
  return {
    orientations: placements,
    totalWidth: currentWidth,
    boxCount: placements.length,
    maxHeight: maxBoxHeight
  };
}

function packWithMixedOrientations(
  units: UnitTypeCalculated[],
  palletL: number,
  palletW: number,
  maxHeight: number,
  palletBaseHeight: number
): { layers: PalletLayer[]; placements: BoxPlacement[]; totalHeight: number } {
  // Track remaining quantities for each unit
  const remainingQty = new Map<string, number>();
  
  for (const unit of units) {
    if (unit.quantity !== undefined && unit.quantity !== null && unit.quantity > 0) {
      remainingQty.set(unit.id, unit.quantity);
    } else {
      remainingQty.set(unit.id, Number.MAX_SAFE_INTEGER);
    }
  }
  
  // Generate all box variants with their orientations
  interface BoxVariantWithQty extends BoxVariant {
    area: number;
  }
  
  const getAvailableVariants = (): BoxVariantWithQty[] => {
    const variants: BoxVariantWithQty[] = [];
    for (const unit of units) {
      const qty = remainingQty.get(unit.id) || 0;
      if (qty <= 0) continue;
      
      const orients = getAllOrientations(unit);
      for (let i = 0; i < orients.length; i++) {
        variants.push({
          unit,
          orient: orients[i],
          variantId: `${unit.id}_orient${i}`,
          area: orients[i].l * orients[i].w
        });
      }
    }
    return variants;
  };
  
  const allPlacements: BoxPlacement[] = [];
  
  // Height-map grid approach: discretize the pallet into cells
  // Each cell tracks its current height independently
  const GRID_RESOLUTION = 0.5; // Grid cell size in the same units as pallet
  const gridCols = Math.ceil(palletL / GRID_RESOLUTION);
  const gridRows = Math.ceil(palletW / GRID_RESOLUTION);
  
  // Height map: heightMap[row][col] = current height at that grid cell
  const heightMap: number[][] = [];
  for (let r = 0; r < gridRows; r++) {
    heightMap[r] = [];
    for (let c = 0; c < gridCols; c++) {
      heightMap[r][c] = palletBaseHeight;
    }
  }
  
  // Convert grid coordinates to pallet coordinates
  const gridToX = (col: number) => col * GRID_RESOLUTION;
  const gridToZ = (row: number) => row * GRID_RESOLUTION;
  
  // Find the maximum height in a rectangular grid region
  const getMaxHeightInRegion = (startCol: number, startRow: number, endCol: number, endRow: number): number => {
    let maxH = 0;
    for (let r = startRow; r < endRow && r < gridRows; r++) {
      for (let c = startCol; c < endCol && c < gridCols; c++) {
        maxH = Math.max(maxH, heightMap[r][c]);
      }
    }
    return maxH;
  };
  
  // Set height for a rectangular grid region
  const setHeightInRegion = (startCol: number, startRow: number, endCol: number, endRow: number, height: number): void => {
    for (let r = startRow; r < endRow && r < gridRows; r++) {
      for (let c = startCol; c < endCol && c < gridCols; c++) {
        heightMap[r][c] = height;
      }
    }
  };
  
  // Check if a region has uniform height
  const hasUniformHeight = (startCol: number, startRow: number, endCol: number, endRow: number): { uniform: boolean; height: number } => {
    const firstHeight = heightMap[startRow]?.[startCol] ?? palletBaseHeight;
    for (let r = startRow; r < endRow && r < gridRows; r++) {
      for (let c = startCol; c < endCol && c < gridCols; c++) {
        if (Math.abs(heightMap[r][c] - firstHeight) > 0.01) {
          return { uniform: false, height: firstHeight };
        }
      }
    }
    return { uniform: true, height: firstHeight };
  };
  
  // Track PRIMARY footprint per unit - each unit type is locked to ONE column
  // until that column is truly full (can't fit any more boxes due to height)
  interface PrimaryFootprint {
    unitId: string;
    topHeight: number;
    exactL: number;  // Exact box length placed
    exactW: number;  // Exact box width placed
    gridCol: number;
    gridRow: number;
    isFull: boolean; // True when no more boxes can fit (height limit)
  }
  // Map from unitId to primary footprint
  const primaryFootprints = new Map<string, PrimaryFootprint>();
  
  let iterations = 0;
  const maxIterations = 5000;
  
  while (iterations < maxIterations) {
    iterations++;
    
    const variants = getAvailableVariants();
    if (variants.length === 0) break;
    
    // Find the best placement position for any box
    type PlacementCandidate = {
      variant: BoxVariantWithQty;
      fitL: number;
      fitW: number;
      gridCol: number;
      gridRow: number;
      baseHeight: number;
      score: number;
      isStackContinuation: boolean;
    };
    
    let bestCandidate: PlacementCandidate | null = null;
    
    // Update "isFull" status for all primary footprints
    // A footprint is "full" ONLY if no box orientation with EXACT footprint dimensions 
    // can fit in the remaining height (max height limit reached)
    // Note: Temporary non-uniformity does NOT make a footprint "full"
    for (const [unitId, footprint] of primaryFootprints.entries()) {
      if (footprint.isFull) continue;
      
      const remainingHeight = maxHeight - footprint.topHeight;
      const unit = units.find(u => u.id === unitId);
      if (!unit) continue;
      
      // Check if ANY orientation with EXACT footprint dimensions can still fit
      const orients = getAllOrientations(unit);
      const canFit = orients.some(o => {
        // Check if this orientation matches the footprint dimensions
        const matchesL = Math.abs(o.l - footprint.exactL) < 0.01 && Math.abs(o.w - footprint.exactW) < 0.01;
        const matchesW = Math.abs(o.w - footprint.exactL) < 0.01 && Math.abs(o.l - footprint.exactW) < 0.01;
        if (!matchesL && !matchesW) return false;
        
        return o.h <= remainingHeight + 0.01;
      });
      
      if (!canFit) {
        footprint.isFull = true;
      }
    }
    
    // PHASE 1: For each unit with a non-full primary footprint, try to continue stacking
    for (const [unitId, footprint] of primaryFootprints.entries()) {
      if (footprint.isFull) continue;
      
      const col = footprint.gridCol;
      const row = footprint.gridRow;
      const baseHeight = footprint.topHeight;
      const remainingHeight = maxHeight - baseHeight;
      
      if (remainingHeight < 0.5) continue;
      
      // Check if the height map matches the footprint top
      const endCol = col + Math.ceil(footprint.exactL / GRID_RESOLUTION);
      const endRow = row + Math.ceil(footprint.exactW / GRID_RESOLUTION);
      const { uniform, height: regionHeight } = hasUniformHeight(col, row, endCol, endRow);
      if (!uniform) continue;
      if (Math.abs(regionHeight - baseHeight) > 0.01) continue;
      
      // Find a variant that matches this footprint's unit type
      for (const variant of variants) {
        if (variant.unit.id !== unitId) continue;
        
        const qty = remainingQty.get(variant.unit.id) || 0;
        if (qty <= 0) continue;
        if (variant.orient.h > remainingHeight + 0.01) continue;
        
        // Try both rotations to match footprint dimensions EXACTLY
        const rotations = [
          { fitL: variant.orient.l, fitW: variant.orient.w },
          ...(Math.abs(variant.orient.l - variant.orient.w) > 0.01 
            ? [{ fitL: variant.orient.w, fitW: variant.orient.l }] 
            : [])
        ];
        
        for (const { fitL, fitW } of rotations) {
          // Check if this rotation matches the footprint's EXACT dimensions
          if (Math.abs(fitL - footprint.exactL) > 0.01) continue;
          if (Math.abs(fitW - footprint.exactW) > 0.01) continue;
          
          // This is a valid stack continuation!
          // Score by remaining height (prefer continuing lower stacks first)
          const score = 1000 + (maxHeight - baseHeight);
          
          if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = {
              variant,
              fitL,
              fitW,
              gridCol: col,
              gridRow: row,
              baseHeight,
              score,
              isStackContinuation: true
            };
          }
        }
      }
    }
    
    // PHASE 2: If no stack continuation found, look for new positions
    // Only allow new positions for unit types that DON'T have a primary footprint
    // OR have a primary footprint that is marked as FULL
    if (!bestCandidate) {
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const baseHeight = heightMap[row][col];
          const remainingHeight = maxHeight - baseHeight;
          if (remainingHeight < 0.5) continue;
          
          for (const variant of variants) {
            // Check if this unit has a primary footprint that is NOT full
            const existingFootprint = primaryFootprints.get(variant.unit.id);
            if (existingFootprint && !existingFootprint.isFull) {
              // This unit MUST use its primary footprint - skip new positions
              continue;
            }
            
            const qty = remainingQty.get(variant.unit.id) || 0;
            if (qty <= 0) continue;
            if (variant.orient.h > remainingHeight + 0.01) continue;
            
            // Try both rotations inline
            const rotations = [
              { fitL: variant.orient.l, fitW: variant.orient.w },
              ...(Math.abs(variant.orient.l - variant.orient.w) > 0.01 
                ? [{ fitL: variant.orient.w, fitW: variant.orient.l }] 
                : [])
            ];
            
            for (const { fitL, fitW } of rotations) {
              // Calculate grid span for this box
              const endCol = col + Math.ceil(fitL / GRID_RESOLUTION);
              const endRow = row + Math.ceil(fitW / GRID_RESOLUTION);
              
              // Check if box fits within pallet bounds
              if (gridToX(endCol) > palletL + 0.01) continue;
              if (gridToZ(endRow) > palletW + 0.01) continue;
              
              // Check if the region has uniform height (can stack on top)
              const { uniform, height: regionHeight } = hasUniformHeight(col, row, endCol, endRow);
              if (!uniform) continue; // Can't place on uneven surface
              if (Math.abs(regionHeight - baseHeight) > 0.01) continue; // Height mismatch
              
              // Calculate score for new positions
              // Prefer: 1) lower heights (can stack more), 2) area fill, 3) corner/edge
              const heightScore = (maxHeight - baseHeight) / (maxHeight - palletBaseHeight) * 50;
              const areaScore = (fitL * fitW) / (palletL * palletW) * 30;
              const positionScore = (col === 0 ? 5 : 0) + (row === 0 ? 5 : 0);
              
              const score = heightScore + areaScore + positionScore;
              
              if (!bestCandidate || score > bestCandidate.score) {
                bestCandidate = {
                  variant,
                  fitL,
                  fitW,
                  gridCol: col,
                  gridRow: row,
                  baseHeight,
                  score,
                  isStackContinuation: false
                };
              }
            }
          }
        }
      }
    }
    
    if (!bestCandidate) break;
    
    // Place the box
    const { variant: bestVariant, fitL, fitW, gridCol, gridRow, baseHeight } = bestCandidate;
    
    const posX = -palletL / 2 + gridToX(gridCol) + fitL / 2;
    const posZ = -palletW / 2 + gridToZ(gridRow) + fitW / 2;
    const posY = baseHeight + bestVariant.orient.h / 2;
    
    allPlacements.push({
      unitId: bestVariant.unit.id,
      unitName: bestVariant.unit.name,
      color: bestVariant.unit.color || '#3b82f6',
      position: { x: posX, y: posY, z: posZ },
      dimensions: { l: fitL, w: fitW, h: bestVariant.orient.h },
      rotated: Math.abs(fitL - bestVariant.orient.l) > 0.01
    });
    
    // Update height map
    const endCol = gridCol + Math.ceil(fitL / GRID_RESOLUTION);
    const endRow = gridRow + Math.ceil(fitW / GRID_RESOLUTION);
    const newHeight = baseHeight + bestVariant.orient.h;
    setHeightInRegion(gridCol, gridRow, endCol, endRow, newHeight);
    
    // Record/update primary footprint for this unit
    const existingFootprint = primaryFootprints.get(bestVariant.unit.id);
    
    if (existingFootprint) {
      // Update existing primary footprint's top height
      existingFootprint.topHeight = newHeight;
    } else {
      // Create new primary footprint for this unit
      primaryFootprints.set(bestVariant.unit.id, {
        unitId: bestVariant.unit.id,
        topHeight: newHeight,
        exactL: fitL,
        exactW: fitW,
        gridCol,
        gridRow,
        isFull: false
      });
    }
    
    // Decrement quantity
    remainingQty.set(bestVariant.unit.id, (remainingQty.get(bestVariant.unit.id) || 1) - 1);
  }
  
  // Group placements into layers by base Y
  const layers: PalletLayer[] = [];
  const heightGroups = new Map<number, BoxPlacement[]>();
  for (const p of allPlacements) {
    const baseY = Math.round((p.position.y - p.dimensions.h / 2) * 100) / 100;
    if (!heightGroups.has(baseY)) {
      heightGroups.set(baseY, []);
    }
    heightGroups.get(baseY)!.push(p);
  }
  
  const sortedHeights = Array.from(heightGroups.keys()).sort((a, b) => a - b);
  for (let i = 0; i < sortedHeights.length; i++) {
    const baseY = sortedHeights[i];
    const layerPlacements = heightGroups.get(baseY)!;
    const layerHeight = Math.max(...layerPlacements.map(p => p.dimensions.h));
    
    layers.push({
      layerIndex: i,
      height: layerHeight,
      baseY: baseY,
      placements: layerPlacements,
      areaUsed: layerPlacements.reduce((sum, p) => sum + p.dimensions.l * p.dimensions.w, 0),
      areaTotal: palletL * palletW
    });
  }
  
  const totalHeight = allPlacements.length > 0 
    ? Math.max(...allPlacements.map(p => p.position.y + p.dimensions.h / 2))
    : palletBaseHeight;
  
  return { layers, placements: allPlacements, totalHeight };
}

// Helper function to merge adjacent rectangles at same height
function mergeAdjacentRects(rects: { x: number; z: number; w: number; d: number; baseY: number }[]): typeof rects {
  if (rects.length < 2) return rects;
  
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < rects.length && !merged; i++) {
      for (let j = i + 1; j < rects.length && !merged; j++) {
        const a = rects[i];
        const b = rects[j];
        
        // Must be at same height
        if (Math.abs(a.baseY - b.baseY) > 0.01) continue;
        
        // Check if horizontally adjacent (same z, same d, touching x)
        if (Math.abs(a.z - b.z) < 0.01 && Math.abs(a.d - b.d) < 0.01) {
          if (Math.abs(a.x + a.w - b.x) < 0.01) {
            // a is to the left of b
            rects[i] = { x: a.x, z: a.z, w: a.w + b.w, d: a.d, baseY: a.baseY };
            rects.splice(j, 1);
            merged = true;
          } else if (Math.abs(b.x + b.w - a.x) < 0.01) {
            // b is to the left of a
            rects[i] = { x: b.x, z: a.z, w: a.w + b.w, d: a.d, baseY: a.baseY };
            rects.splice(j, 1);
            merged = true;
          }
        }
        
        // Check if vertically adjacent (same x, same w, touching z)
        if (Math.abs(a.x - b.x) < 0.01 && Math.abs(a.w - b.w) < 0.01) {
          if (Math.abs(a.z + a.d - b.z) < 0.01) {
            // a is below b
            rects[i] = { x: a.x, z: a.z, w: a.w, d: a.d + b.d, baseY: a.baseY };
            rects.splice(j, 1);
            merged = true;
          } else if (Math.abs(b.z + b.d - a.z) < 0.01) {
            // b is below a
            rects[i] = { x: a.x, z: b.z, w: a.w, d: a.d + b.d, baseY: a.baseY };
            rects.splice(j, 1);
            merged = true;
          }
        }
      }
    }
  }
  
  return rects;
}

interface PackingStrategy {
  orientationPerUnit: Map<string, BoxOrientation>;
  description: string;
}

interface StrategyResult {
  strategy: PackingStrategy;
  totalUnits: number;
  totalHeight: number;
  layers: PalletLayer[];
  placements: BoxPlacement[];
  isValid: boolean;
}

function runStrategyPacking(
  strategy: PackingStrategy,
  units: UnitTypeCalculated[],
  pallet: PalletData
): StrategyResult {
  const palletL = pallet.length;
  const palletW = pallet.width;
  const palletH = pallet.height;
  const maxHeight = pallet.maxHeight;
  
  const boxCounts: BoxToPack[] = units.map(u => {
    const orient = strategy.orientationPerUnit.get(u.id)!;
    return {
      unit: u,
      remaining: 9999,
      originalQty: null,
      l: orient.l,
      w: orient.w,
      h: orient.h,
      orientationId: orient.orientationId
    };
  });
  
  const allPlacements: BoxPlacement[] = [];
  const layers: PalletLayer[] = [];
  let layerBaseY = palletH;
  let layerIndex = 0;
  const maxLayers = 100;
  
  while (layerIndex < maxLayers) {
    const remainingHeight = maxHeight - layerBaseY;
    if (remainingHeight < 0.1) break;
    
    const fittableBoxes = boxCounts.filter(b => b.remaining > 0 && b.h <= remainingHeight);
    if (fittableBoxes.length === 0) break;
    
    const { placements: layerBoxes, layerThickness } = packLayerWithFreeRects(
      boxCounts,
      palletL,
      palletW,
      remainingHeight
    );
    
    if (layerBoxes.length === 0 || layerThickness === 0) break;
    if (layerBaseY + layerThickness > maxHeight + 0.01) break;
    
    const layerPlacements: BoxPlacement[] = layerBoxes.map(box => ({
      unitId: box.unitId,
      unitName: box.unitName,
      color: box.color,
      position: {
        x: -palletL / 2 + box.x + box.dimL / 2,
        y: layerBaseY + box.dimH / 2,
        z: -palletW / 2 + box.z + box.dimW / 2
      },
      dimensions: { l: box.dimL, w: box.dimW, h: box.dimH },
      rotated: box.rotated
    }));
    
    layers.push({
      layerIndex,
      height: layerThickness,
      baseY: layerBaseY,
      placements: layerPlacements,
      areaUsed: layerPlacements.reduce((sum, p) => sum + p.dimensions.l * p.dimensions.w, 0),
      areaTotal: palletL * palletW
    });
    
    allPlacements.push(...layerPlacements);
    layerBaseY += layerThickness;
    layerIndex++;
  }
  
  return {
    strategy,
    totalUnits: allPlacements.length,
    totalHeight: layerBaseY,
    layers,
    placements: allPlacements,
    isValid: allPlacements.length > 0 && layerBaseY <= maxHeight + 0.01
  };
}

function tryMixedLayerPacking(
  units: UnitTypeCalculated[],
  pallet: PalletData
): StrategyResult[] {
  const results: StrategyResult[] = [];
  
  const palletL = pallet.length;
  const palletW = pallet.width;
  const palletH = pallet.height;
  const maxHeight = pallet.maxHeight;
  
  const unitOrientations = units.map(u => ({
    unit: u,
    orientations: getAllOrientations(u)
  }));
  
  function generateOrientationMaps(): Map<string, BoxOrientation>[] {
    function recurse(idx: number, current: Map<string, BoxOrientation>): Map<string, BoxOrientation>[] {
      if (idx >= unitOrientations.length) {
        return [new Map(current)];
      }
      const uo = unitOrientations[idx];
      const res: Map<string, BoxOrientation>[] = [];
      for (const o of uo.orientations) {
        current.set(uo.unit.id, o);
        res.push(...recurse(idx + 1, current));
      }
      return res;
    }
    return recurse(0, new Map());
  }
  
  const allOrientMaps = generateOrientationMaps();
  if (allOrientMaps.length < 2) return results;
  
  for (let primaryIdx = 0; primaryIdx < allOrientMaps.length; primaryIdx++) {
    for (let secondaryIdx = 0; secondaryIdx < allOrientMaps.length; secondaryIdx++) {
      if (primaryIdx === secondaryIdx) continue;
      
      const primaryMap = allOrientMaps[primaryIdx];
      const secondaryMap = allOrientMaps[secondaryIdx];
      
      for (let switchAfter = 1; switchAfter <= 15; switchAfter++) {
        const allPlacements: BoxPlacement[] = [];
        const layers: PalletLayer[] = [];
        let layerBaseY = palletH;
        let layerIndex = 0;
        
        while (layerBaseY < maxHeight - 0.1 && layerIndex < 100) {
          const remainingHeight = maxHeight - layerBaseY;
          const useSecondary = layerIndex >= switchAfter;
          const orientMap = useSecondary ? secondaryMap : primaryMap;
          
          const boxCounts: BoxToPack[] = units.map(u => {
            const orient = orientMap.get(u.id)!;
            return {
              unit: u,
              remaining: 9999,
              originalQty: null,
              l: orient.l,
              w: orient.w,
              h: orient.h,
              orientationId: orient.orientationId
            };
          });
          
          const minH = Math.min(...boxCounts.map(b => b.h));
          if (minH > remainingHeight + 0.01) {
            const altMap = useSecondary ? primaryMap : secondaryMap;
            const altBoxCounts: BoxToPack[] = units.map(u => {
              const orient = altMap.get(u.id)!;
              return {
                unit: u,
                remaining: 9999,
                originalQty: null,
                l: orient.l,
                w: orient.w,
                h: orient.h,
                orientationId: orient.orientationId
              };
            });
            
            const altMinH = Math.min(...altBoxCounts.map(b => b.h));
            if (altMinH <= remainingHeight + 0.01) {
              const { placements: layerBoxes, layerThickness } = packLayerWithFreeRects(
                altBoxCounts,
                palletL,
                palletW,
                remainingHeight
              );
              
              if (layerBoxes.length > 0 && layerThickness > 0) {
                const layerPlacements: BoxPlacement[] = layerBoxes.map(box => ({
                  unitId: box.unitId,
                  unitName: box.unitName,
                  color: box.color,
                  position: {
                    x: -palletL / 2 + box.x + box.dimL / 2,
                    y: layerBaseY + box.dimH / 2,
                    z: -palletW / 2 + box.z + box.dimW / 2
                  },
                  dimensions: { l: box.dimL, w: box.dimW, h: box.dimH },
                  rotated: box.rotated
                }));
                
                layers.push({
                  layerIndex,
                  height: layerThickness,
                  baseY: layerBaseY,
                  placements: layerPlacements,
                  areaUsed: layerPlacements.reduce((sum, p) => sum + p.dimensions.l * p.dimensions.w, 0),
                  areaTotal: palletL * palletW
                });
                
                allPlacements.push(...layerPlacements);
                layerBaseY += layerThickness;
                layerIndex++;
                continue;
              }
            }
            break;
          }
          
          const { placements: layerBoxes, layerThickness } = packLayerWithFreeRects(
            boxCounts,
            palletL,
            palletW,
            remainingHeight
          );
          
          if (layerBoxes.length === 0 || layerThickness === 0) break;
          if (layerBaseY + layerThickness > maxHeight + 0.01) break;
          
          const layerPlacements: BoxPlacement[] = layerBoxes.map(box => ({
            unitId: box.unitId,
            unitName: box.unitName,
            color: box.color,
            position: {
              x: -palletL / 2 + box.x + box.dimL / 2,
              y: layerBaseY + box.dimH / 2,
              z: -palletW / 2 + box.z + box.dimW / 2
            },
            dimensions: { l: box.dimL, w: box.dimW, h: box.dimH },
            rotated: box.rotated
          }));
          
          layers.push({
            layerIndex,
            height: layerThickness,
            baseY: layerBaseY,
            placements: layerPlacements,
            areaUsed: layerPlacements.reduce((sum, p) => sum + p.dimensions.l * p.dimensions.w, 0),
            areaTotal: palletL * palletW
          });
          
          allPlacements.push(...layerPlacements);
          layerBaseY += layerThickness;
          layerIndex++;
        }
        
        if (allPlacements.length > 0 && layerBaseY <= maxHeight + 0.01) {
          results.push({
            strategy: {
              orientationPerUnit: primaryMap,
              description: `Mixed layers: ${switchAfter} primary, then alternate`
            },
            totalUnits: allPlacements.length,
            totalHeight: layerBaseY,
            layers,
            placements: allPlacements,
            isValid: true
          });
        }
      }
    }
  }
  
  return results;
}

export const calculateMixedPallet = (
  units: UnitTypeCalculated[],
  pallet: PalletData
): MixedPalletResult => {
  if (units.length === 0) {
    return {
      layers: [],
      placements: [],
      unitSummaries: [],
      totalUnits: 0,
      totalWeight: 0,
      palletWeight: pallet.palletWeight || 0,
      combinedWeight: pallet.palletWeight || 0,
      totalHeight: pallet.height,
      volumeEfficiency: 0,
      areaEfficiency: 0,
      warnings: ["No unit types defined"],
      isValid: false
    };
  }

  const palletL = pallet.length;
  const palletW = pallet.width;
  const palletH = pallet.height;
  const maxHeight = pallet.maxHeight;
  
  const mixedResult = packWithMixedOrientations(units, palletL, palletW, maxHeight, palletH);
  
  const unitSummaries: UnitSummary[] = units.map(u => {
    const placed = mixedResult.placements.filter(p => p.unitId === u.id).length;
    const requested = u.quantity && u.quantity > 0 ? u.quantity : null;
    const remaining = requested !== null ? Math.max(0, requested - placed) : null;
    return {
      unitId: u.id,
      unitName: u.name,
      color: u.color || '#3b82f6',
      countPlaced: placed,
      quantityRequested: requested,
      quantityRemaining: remaining
    };
  });

  const totalUnits = mixedResult.placements.length;
  const totalWeight = mixedResult.placements.reduce((sum, p) => {
    const unit = units.find(u => u.id === p.unitId);
    return sum + (unit?.weight || 0);
  }, 0);

  const availableHeight = maxHeight - palletH;
  const palletVolume = palletL * palletW * availableHeight;
  const usedVolume = mixedResult.placements.reduce((sum, p) => 
    sum + (p.dimensions.l * p.dimensions.w * p.dimensions.h), 0);
  const volumeEfficiency = palletVolume > 0 ? (usedVolume / palletVolume) * 100 : 0;

  const palletArea = palletL * palletW;
  const maxLayerArea = mixedResult.layers.length > 0 ? Math.max(...mixedResult.layers.map(l => l.areaUsed)) : 0;
  const areaEfficiency = palletArea > 0 ? (maxLayerArea / palletArea) * 100 : 0;

  const palletWeight = pallet.palletWeight || 0;
  const combinedWeight = palletWeight + totalWeight;

  return {
    layers: mixedResult.layers,
    placements: mixedResult.placements,
    unitSummaries,
    totalUnits,
    totalWeight,
    palletWeight,
    combinedWeight,
    totalHeight: mixedResult.totalHeight,
    volumeEfficiency,
    areaEfficiency,
    warnings: [],
    isValid: totalUnits > 0 && mixedResult.totalHeight <= maxHeight + 0.01
  };
};

export const generateMixedCSV = (
  project: any,
  units: UnitTypeCalculated[],
  pallet: PalletData,
  result: MixedPalletResult
): string => {
  const rows = [];
  
  rows.push(["PALLET CONFIGURATION REPORT"]);
  rows.push([]);
  
  rows.push(["PROJECT INFORMATION"]);
  rows.push(["Customer", project.customerName]);
  rows.push(["Project", project.projectName]);
  rows.push(["Contact", project.contactName]);
  rows.push(["Customer Order Number", project.customerOrderNumber]);
  rows.push(["Customer Order Qty", project.customerOrderQty]);
  rows.push(["Pack Out Qty", project.packOutQty]);
  rows.push(["Notes", project.notes]);
  rows.push([]);

  rows.push(["PALLET SPECIFICATIONS"]);
  rows.push(["Dimensions (L x W)", `${pallet.length} x ${pallet.width}`]);
  rows.push(["Base Height", pallet.height]);
  rows.push(["Max Allowed Height", pallet.maxHeight]);
  rows.push(["Pallet Weight", pallet.palletWeight || 0]);
  rows.push([]);

  rows.push(["UNIT TYPES"]);
  rows.push(["Name", "External L", "External W", "External H", "Weight", "Qty Requested"]);
  units.forEach(u => {
    rows.push([
      u.name,
      u.externalL.toFixed(2),
      u.externalW.toFixed(2),
      u.externalH.toFixed(2),
      u.weight,
      u.quantity || "Unlimited"
    ]);
  });
  rows.push([]);

  rows.push(["OPTIMIZATION RESULTS"]);
  rows.push(["Total Units on Pallet", result.totalUnits]);
  rows.push(["Total Layers", result.layers.length]);
  rows.push(["Total Height", result.totalHeight.toFixed(2)]);
  rows.push(["Units Weight", result.totalWeight.toFixed(2)]);
  rows.push(["Pallet Weight", result.palletWeight.toFixed(2)]);
  rows.push(["Combined Weight (Pallet + Units)", result.combinedWeight.toFixed(2)]);
  rows.push(["Volume Efficiency", result.volumeEfficiency.toFixed(1) + "%"]);
  rows.push([]);

  rows.push(["UNITS PLACED BY TYPE"]);
  rows.push(["Unit Name", "Qty Placed", "Qty Requested", "Remaining"]);
  result.unitSummaries.forEach(s => {
    rows.push([
      s.unitName,
      s.countPlaced,
      s.quantityRequested ?? "Unlimited",
      s.quantityRemaining ?? "N/A"
    ]);
  });
  rows.push([]);

  if (result.warnings.length > 0) {
    rows.push(["WARNINGS"]);
    result.warnings.forEach(w => rows.push([w]));
  }

  return rows.map(r => r.join(",")).join("\n");
};
