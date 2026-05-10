'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function StepShell({ stepIndex, children }: { stepIndex: number; children: ReactNode }) {
  const isEven = stepIndex % 2 === 0;
  const sideClasses = isEven ? 'mr-auto md:pr-12' : 'ml-auto md:pl-12';
  const initialX = isEven ? -80 : 80;
  const exitX = isEven ? 80 : -80;
  return (
    <motion.div
      initial={{ y: 32, x: initialX, opacity: 0 }}
      animate={{ y: 0, x: 0, opacity: 1 }}
      exit={{ y: -24, x: exitX, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full max-w-3xl space-y-10 ${sideClasses}`}
    >
      {children}
    </motion.div>
  );
}
