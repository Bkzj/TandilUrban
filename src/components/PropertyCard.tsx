'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface PropertyCardProps {
  id: string; // Agregamos el ID
  titulo: string;
  precio: number;
  moneda: string;
  operacion: string;
  ambientes: number;
  m2Total: number;
  esSustentable: boolean;
  imagenUrl: string;
}

export default function PropertyCard({ 
  id, titulo, precio, moneda, operacion, ambientes, m2Total, esSustentable, imagenUrl 
}: PropertyCardProps) {
  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const rotateX = useSpring(rotateXRaw, { stiffness: 160, damping: 18, mass: 0.45 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 160, damping: 18, mass: 0.45 });

  // Posiciones del glare derivadas de cada spring por separado
  const glarePosX = useTransform(rotateY, (v: number) => `${50 + v * 2}%`);
  const glarePosY = useTransform(rotateX, (v: number) => `${50 - v * 2}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glarePosX} ${glarePosY}, rgba(255,255,255,0.18), rgba(255,255,255,0) 45%)`;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    rotateYRaw.set((px - 0.5) * 10);
    rotateXRaw.set((0.5 - py) * 10);
  };

  const resetTilt = () => {
    rotateXRaw.set(0);
    rotateYRaw.set(0);
  };

  return (
    <Link href={`/propiedades/${id}`} className="block h-full w-full min-w-0">
      <motion.div
        className="group relative flex h-full w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-border-light bg-surface shadow-lg transition-all duration-300 hover:shadow-2xl"
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetTilt}
        whileHover={{ y: -6 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] rounded-2xl"
          style={{ background: glare }}
        />
        
        <div className="relative h-64 w-full overflow-hidden">
          <div className="absolute left-4 top-4 z-10 rounded-full bg-verde px-3 py-1 text-xs font-bold uppercase text-surface">{operacion}</div>
          {esSustentable && (
            <div className="absolute right-4 top-4 z-10 rounded-full bg-verde-hover px-3 py-1 text-xs font-bold text-surface shadow-md">🌱 Sustentable</div>
          )}
          <Image
            src={imagenUrl}
            alt={titulo}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        <div className="p-6 flex flex-col flex-grow">
          <h3 className="mb-2 line-clamp-1 text-xl font-bold text-text-primary">{titulo}</h3>
          <div className="text-2xl font-light text-naranja mb-4">{moneda} {precio.toLocaleString('es-AR')}</div>
          <div className="mb-4 h-[1px] w-full bg-border-light"></div>
          <div className="mt-auto flex items-center justify-between text-sm text-text-secondary">
            <div className="flex items-center gap-1"><span>📐</span> {m2Total} m²</div>
            <div className="flex items-center gap-1"><span>🚪</span> {ambientes} Amb.</div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}