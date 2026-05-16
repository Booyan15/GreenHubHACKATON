import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { SavedLocation } from "./LocationChooser";

function latLonToVector(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function Earth({ location }: { location: SavedLocation }) {
  const groupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const earthTexture = useTexture("/earth-satellite.jpg");

  useEffect(() => {
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 8;
  }, [earthTexture]);

  const markerPosition = useMemo(
    () => latLonToVector(location.lat, location.lon, 2.045),
    [location.lat, location.lon],
  );

  const targetQuaternion = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(
      markerPosition.clone().normalize(),
      new THREE.Vector3(0, 0, 1),
    );
  }, [markerPosition]);

  useEffect(() => {
    groupRef.current?.quaternion.copy(targetQuaternion);
  }, [targetQuaternion]);

  useFrame((_, delta) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.018;
  });

  return (
    <group>
      <Sphere args={[2.16, 96, 96]}>
        <meshBasicMaterial
          color="#69b7ff"
          transparent
          opacity={0.16}
          side={THREE.BackSide}
        />
      </Sphere>

      <group ref={groupRef}>
        <Sphere args={[2, 128, 128]}>
          <meshStandardMaterial
            map={earthTexture}
            roughness={0.86}
            metalness={0}
            emissive="#0b2238"
            emissiveIntensity={0.08}
          />
        </Sphere>

        <Sphere ref={cloudsRef} args={[2.035, 96, 96]}>
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.08}
            depthWrite={false}
            roughness={1}
          />
        </Sphere>

        <PulseMarker position={markerPosition} />
      </group>
    </group>
  );
}

function PulseMarker({ position }: { position: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 2) * 0.4;
      ringRef.current.scale.set(s, s, s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.6 - Math.sin(t * 2) * 0.4;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.05, 24, 24]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      <mesh ref={ringRef}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

export default function Globe({ location }: { location: SavedLocation }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.8], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={1.05} />
      <directionalLight position={[4, 3, 6]} intensity={1.8} color="#ffffff" />
      <directionalLight position={[-4, -1, 2]} intensity={0.35} color="#7ec8ff" />
      <Suspense fallback={null}>
        <Earth location={location} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  );
}
