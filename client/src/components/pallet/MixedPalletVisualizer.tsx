import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid } from "@react-three/drei";
import { MixedPalletResult, PalletData, UnitSystem } from "@/lib/types";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

interface MixedPalletVisualizerProps {
  result: MixedPalletResult;
  pallet: PalletData;
  system: UnitSystem;
}

function Box({ 
  position, 
  dimensions, 
  color 
}: { 
  position: [number, number, number];
  dimensions: { l: number; w: number; h: number };
  color: string;
}) {
  const geometry = useMemo(() => 
    new THREE.BoxGeometry(dimensions.l, dimensions.h, dimensions.w),
    [dimensions.l, dimensions.h, dimensions.w]
  );
  
  const edgeGeometry = useMemo(() => 
    new THREE.EdgesGeometry(new THREE.BoxGeometry(dimensions.l, dimensions.h, dimensions.w)),
    [dimensions.l, dimensions.h, dimensions.w]
  );

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} />
      </mesh>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial color="#000000" opacity={0.3} transparent />
      </lineSegments>
    </group>
  );
}

function PalletBase({ 
  palletL, 
  palletW, 
  palletH 
}: { 
  palletL: number; 
  palletW: number; 
  palletH: number;
}) {
  return (
    <group>
      <mesh position={[0, palletH / 2, 0]}>
        <boxGeometry args={[palletL, palletH, palletW]} />
        <meshStandardMaterial color="#C19A6B" />
      </mesh>
      <lineSegments position={[0, palletH / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(palletL, palletH, palletW)]} />
        <lineBasicMaterial color="#8B7355" />
      </lineSegments>
    </group>
  );
}

function Scene({ result, pallet }: { result: MixedPalletResult; pallet: PalletData }) {
  const palletL = pallet.length;
  const palletW = pallet.width;
  const palletH = pallet.height;

  const boxes = useMemo(() => {
    return result.placements.map((placement, index) => (
      <Box 
        key={`box-${index}`}
        position={[
          placement.position.x,
          placement.position.y,
          placement.position.z
        ]}
        dimensions={{
          l: placement.dimensions.l,
          w: placement.dimensions.w,
          h: placement.dimensions.h
        }}
        color={placement.color}
      />
    ));
  }, [result.placements]);

  const dimOffset = Math.max(palletL, palletW) * 0.15;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[palletL, palletH * 10, palletW]} intensity={1} castShadow />
      <directionalLight position={[-palletL, palletH * 5, -palletW]} intensity={0.3} />
      
      <group>
        <PalletBase palletL={palletL} palletW={palletW} palletH={palletH} />
        
        {boxes}

        <mesh position={[0, pallet.maxHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[palletL * 1.1, palletW * 1.1]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
        
        <Grid 
          position={[0, 0, 0]} 
          args={[palletL * 3, palletW * 3]} 
          cellSize={Math.max(palletL, palletW) / 10} 
          sectionSize={Math.max(palletL, palletW) / 2} 
          fadeDistance={Math.max(palletL, palletW) * 5}
          sectionColor="#9ca3af" 
          cellColor="#e5e7eb"
        />

      </group>
    </>
  );
}

export default function MixedPalletVisualizer(props: MixedPalletVisualizerProps) {
  const maxDim = Math.max(props.pallet.length, props.pallet.width, props.pallet.maxHeight);
  const stackHeight = props.result.totalHeight || props.pallet.maxHeight / 2;
  const targetY = stackHeight / 2;
  const unitLabel = props.system === "in" ? '"' : "mm";
  
  if (props.result.placements.length === 0) {
    return (
      <div className="w-full h-[400px] bg-gradient-to-b from-gray-50 to-gray-200 rounded-lg overflow-hidden border shadow-inner flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No boxes placed yet</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-[400px] bg-gradient-to-b from-gray-50 to-gray-200 rounded-lg overflow-hidden border shadow-inner relative">
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md text-xs font-mono border shadow-sm">
        <span className="font-bold text-primary">3D View</span> 
        <span className="mx-2 text-muted-foreground">|</span> 
        Drag to Rotate
      </div>

      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-md text-xs border shadow-sm space-y-1">
        <p className="font-semibold text-foreground">{props.result.totalUnits} boxes</p>
        <p className="text-muted-foreground">{props.result.layers.length} layers</p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur px-4 py-2 border-t flex justify-center gap-8 text-sm font-medium">
        <span data-testid="dimension-length">
          <span className="text-muted-foreground">Length:</span> {props.pallet.length.toFixed(0)}{unitLabel}
        </span>
        <span data-testid="dimension-width">
          <span className="text-muted-foreground">Width:</span> {props.pallet.width.toFixed(0)}{unitLabel}
        </span>
        <span data-testid="dimension-height">
          <span className="text-muted-foreground">Stack Height:</span> {props.result.totalHeight.toFixed(1)}{unitLabel}
        </span>
      </div>

      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera 
          makeDefault 
          position={[maxDim * 1.5, maxDim * 1.2, maxDim * 1.5]} 
          fov={40} 
        />
        <OrbitControls 
          makeDefault 
          target={[0, targetY, 0]}
          minPolarAngle={0.1} 
          maxPolarAngle={Math.PI / 2.1}
          minDistance={maxDim * 0.5}
          maxDistance={maxDim * 4}
        />
        <Suspense fallback={null}>
          <Scene result={props.result} pallet={props.pallet} />
        </Suspense>
      </Canvas>
    </div>
  );
}
