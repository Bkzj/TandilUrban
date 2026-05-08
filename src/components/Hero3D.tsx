'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Float,
  ContactShadows,
  MeshTransmissionMaterial,
} from '@react-three/drei';
import * as THREE from 'three';

// ─── shared mouse ref (raw normalized coords -1..1) ───────────────────────────
const mouse = { x: 0, y: 0 };

// ─── 1. Prisma de cristal central ─────────────────────────────────────────────
function CrystalPrism() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.18;
    meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.08;
  });

  return (
    <Float floatIntensity={1.8} speed={1.4} rotationIntensity={0.4}>
      <mesh ref={meshRef} castShadow position={[0, 0.4, 0]}>
        <octahedronGeometry args={[0.9, 0]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          resolution={512}
          transmission={1}
          roughness={0.05}
          thickness={1.2}
          ior={1.5}
          chromaticAberration={0.08}
          anisotropy={0.1}
          color="#e8f4f0"
          attenuationDistance={2}
          attenuationColor="#a8d5c5"
        />
      </mesh>
    </Float>
  );
}

// ─── 2. Anillo metálico ────────────────────────────────────────────────────────
function MetallicRing() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.22;
    meshRef.current.rotation.z = t * 0.11;
  });

  return (
    <Float floatIntensity={1.2} speed={1.1} rotationIntensity={0.2}>
      <mesh ref={meshRef} position={[0, 0.4, 0]}>
        <torusGeometry args={[1.4, 0.045, 32, 120]} />
        <meshPhysicalMaterial
          color="#8ecfc0"
          metalness={0.96}
          roughness={0.08}
          envMapIntensity={2.2}
        />
      </mesh>
    </Float>
  );
}

// ─── 3. Caja minimalista (acero cepillado) ─────────────────────────────────────
function BrushedBox() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.y = -t * 0.14;
    meshRef.current.rotation.x = Math.cos(t * 0.4) * 0.12;
  });

  return (
    <Float floatIntensity={2.2} speed={0.9} rotationIntensity={0.5}>
      <mesh ref={meshRef} position={[1.7, 0.1, -0.6]} castShadow>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshPhysicalMaterial
          color="#c5e4dc"
          metalness={0.88}
          roughness={0.15}
          envMapIntensity={1.8}
        />
      </mesh>
    </Float>
  );
}

// ─── 4. Icosaedro pequeño de acento ───────────────────────────────────────────
function AccentIcosahedron() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.31;
    meshRef.current.rotation.y = t * 0.19;
  });

  return (
    <Float floatIntensity={2.8} speed={1.7} rotationIntensity={0.8}>
      <mesh ref={meshRef} position={[-1.9, 0.3, -0.3]} castShadow>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshPhysicalMaterial
          color="#f0a878"
          metalness={0.5}
          roughness={0.2}
          envMapIntensity={1.5}
        />
      </mesh>
    </Float>
  );
}

// ─── Grupo raíz que sigue el mouse via lerp ────────────────────────────────────
function SceneRoot() {
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / size.width) * 2 - 1;
      mouse.y = -(e.clientY / size.height) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [size]);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      mouse.x * 0.18,
      0.06,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      mouse.y * 0.1,
      0.06,
    );
  });

  return (
    <group ref={groupRef}>
      <CrystalPrism />
      <MetallicRing />
      <BrushedBox />
      <AccentIcosahedron />
    </group>
  );
}

// ─── Escena completa ───────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} castShadow />
      <pointLight position={[-4, 3, -2]} intensity={0.6} color="#8ecfc0" />

      <Environment preset="city" />

      <SceneRoot />

      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.5}
        scale={8}
        blur={2.4}
        far={3}
        color="#1a3a30"
      />
    </>
  );
}

// ─── Export: Canvas envuelto en div absoluto ───────────────────────────────────
export default function Hero3D({ className }: { className?: string }) {
  return (
    <div className={className ?? 'h-full w-full'} aria-hidden>
      <Canvas
        camera={{ position: [0, 0.5, 5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        shadows
      >
        <Scene />
      </Canvas>
    </div>
  );
}
