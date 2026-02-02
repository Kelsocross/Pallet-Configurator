import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid, Stage, Text, Html } from "@react-three/drei";
import { UnitTypeCalculated, PalletData, CalculationResult, UnitSystem } from "@/lib/types";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

interface PalletVisualizerProps {
  unit: UnitTypeCalculated;
  pallet: PalletData;
  result: CalculationResult;
  system: UnitSystem;
}

function Box({ position, args, color }: { position: [number, number, number], args: [number, number, number], color: string }) {
  // Add black edges to make individual boxes visible
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={args} />
        <meshStandardMaterial color={color} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...args)]} />
        <lineBasicMaterial color="black" opacity={0.3} transparent />
      </lineSegments>
    </group>
  );
}

function PalletBase({ width, length, height }: { width: number, length: number, height: number }) {
  // Wood texture approximation with color
  return (
    <group position={[0, height / 2, 0]}>
      {/* Main Deck */}
      <mesh position={[0, height/2 - height*0.1, 0]}>
        <boxGeometry args={[length, height * 0.2, width]} />
        <meshStandardMaterial color="#D2B48C" />
      </mesh>
      
      {/* Stringers (3 beams) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[length, height * 0.6, width * 0.15]} />
        <meshStandardMaterial color="#C19A6B" />
      </mesh>
      <mesh position={[0, 0, width/2 - width*0.075]}>
        <boxGeometry args={[length, height * 0.6, width * 0.15]} />
        <meshStandardMaterial color="#C19A6B" />
      </mesh>
      <mesh position={[0, 0, -width/2 + width*0.075]}>
        <boxGeometry args={[length, height * 0.6, width * 0.15]} />
        <meshStandardMaterial color="#C19A6B" />
      </mesh>

      {/* Bottom Deck */}
      <mesh position={[0, -height/2 + height*0.1, 0]}>
         <boxGeometry args={[length, height * 0.2, width]} />
         <meshStandardMaterial color="#D2B48C" />
      </mesh>
    </group>
  );
}

function Scene({ unit, pallet, result }: PalletVisualizerProps) {
  // Calculations to position everything
  // ThreeJS coordinate system: Y is Up. 
  // We'll map: Pallet Length -> X, Pallet Width -> Z, Pallet Height -> Y

  const { unitsPerLayer, maxLayers, layerCounts, orientation } = result;
  
  // Dimensions of the box in the scene based on orientation
  // If L_along_L: Box X = extL, Box Z = extW
  // If W_along_L: Box X = extW, Box Z = extL
  const boxDimX = orientation === "L_along_L" ? unit.externalL : unit.externalW;
  const boxDimZ = orientation === "L_along_L" ? unit.externalW : unit.externalL;
  const boxDimY = unit.externalH;

  const boxes = useMemo(() => {
    const list = [];
    
    // Start positions (bottom-left corner of the stack relative to pallet center)
    // We want the stack centered on the pallet if possible, OR aligned to corner?
    // Usually stacking starts from a corner. Let's align to corner (-L/2, -W/2)
    
    const startX = -pallet.length / 2 + boxDimX / 2;
    const startZ = -pallet.width / 2 + boxDimZ / 2;
    const startY = pallet.height + boxDimY / 2; // Start on top of pallet

    for (let layer = 0; layer < maxLayers; layer++) {
      for (let r = 0; r < layerCounts.width; r++) { // Rows (Z direction)
        for (let c = 0; c < layerCounts.length; c++) { // Cols (X direction)
          const x = startX + (c * boxDimX);
          const z = startZ + (r * boxDimZ);
          const y = startY + (layer * boxDimY);
          
          list.push(
            <Box 
              key={`box-${layer}-${r}-${c}`}
              position={[x, y, z]} 
              args={[boxDimX * 0.99, boxDimY * 0.99, boxDimZ * 0.99]} // Slight gap for visuals
              color={unit.color || "#3b82f6"}
            />
          );
        }
      }
    }
    return list;
  }, [result, unit, pallet, boxDimX, boxDimZ, boxDimY, layerCounts, maxLayers]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      
      <group>
        {/* Pallet */}
        <PalletBase width={pallet.width} length={pallet.length} height={pallet.height} />
        
        {/* Boxes */}
        {boxes}

        {/* Max Height Marker */}
        <mesh position={[0, pallet.maxHeight, 0]}>
          <planeGeometry args={[pallet.length * 1.2, pallet.width * 1.2]} />
          <meshBasicMaterial color="red" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Grid Floor */}
        <Grid 
          position={[0, 0, 0]} 
          args={[pallet.length * 3, pallet.width * 3]} 
          cellSize={10} 
          sectionSize={50} 
          fadeDistance={500}
          sectionColor="#9ca3af" 
          cellColor="#e5e7eb"
        />
      </group>
    </>
  );
}

export default function PalletVisualizer(props: PalletVisualizerProps) {
  // Determine camera position based on pallet size
  const maxDim = Math.max(props.pallet.length, props.pallet.width, props.pallet.maxHeight);
  
  return (
    <div className="w-full h-[400px] bg-gradient-to-b from-gray-50 to-gray-200 rounded-lg overflow-hidden border shadow-inner relative">
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md text-xs font-mono border shadow-sm">
        <span className="font-bold text-primary">3D View</span> 
        <span className="mx-2 text-muted-foreground">|</span> 
        Drag to Rotate • Scroll to Zoom
      </div>

      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[maxDim * 1.5, maxDim * 1.2, maxDim * 1.5]} fov={50} />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
