'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

/** Naranja / dorado premium del design system */
const PREMIUM_GOLD = '#957327';

type MouseAxes = { x: number; y: number };

function PremiumSculpture({ mouse }: { mouse: MouseAxes }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const smoothedMouse = useRef(new THREE.Vector2(0, 0));

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    targetMouse.current.set(mouse.x, mouse.y);
    smoothedMouse.current.lerp(targetMouse.current, 0.08);

    g.rotation.y += delta * 0.22;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, smoothedMouse.current.y * 0.45, 0.06);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, smoothedMouse.current.x * 0.25, 0.06);
  });

  const ringRadii = [0.52, 0.74, 0.96];

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[1.08, 0]} />
        <meshStandardMaterial
          color={PREMIUM_GOLD}
          metalness={0.88}
          roughness={0.18}
          emissive={PREMIUM_GOLD}
          emissiveIntensity={0.16}
          envMapIntensity={1.05}
          toneMapped={true}
        />
      </mesh>
      {ringRadii.map((radius, idx) => (
        <mesh key={radius} rotation={[(Math.PI / 7) * (idx + 1), (Math.PI / 11) * idx, idx * 0.33]}>
          <torusGeometry args={[radius, 0.016, 32, 120]} />
          <meshStandardMaterial
            color={PREMIUM_GOLD}
            metalness={0.92}
            roughness={0.28}
            transparent
            opacity={0.5 + idx * 0.06}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ mouse }: { mouse: MouseAxes }) {
  return (
    <>
      <ambientLight intensity={0.28} />
      <directionalLight position={[8, 5, 7]} intensity={1.85} />
      <directionalLight position={[-7, -3, 2]} intensity={0.65} color="#c9a962" />
      <pointLight position={[0, 3, -4]} intensity={0.85} distance={22} decay={2} />
      <Float rotationIntensity={0.15} floatIntensity={0.35} speed={1.2}>
        <PremiumSculpture mouse={mouse} />
      </Float>
    </>
  );
}

/** Capa visual 3D para el Hero: canvas transparente, sin bloquear interacciones bajo él. */
export default function Hero3D({ className = '' }: { className?: string }) {
  const [mouse, setMouse] = useState<MouseAxes>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      setMouse({ x: nx * 0.4, y: -ny * 0.42 });
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      aria-hidden
    >
      <Canvas
        dpr={[1, 2]}
        gl={{
          alpha: true,
          antialias: true,
          stencil: false,
          depth: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0, 4.2], fov: 38 }}
        style={{ mixBlendMode: 'screen', opacity: 0.92 }}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}
