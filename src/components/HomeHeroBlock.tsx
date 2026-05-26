'use client';

import Navbar from '@/components/Navbar';
import HeroSearch from '@/components/public/HeroSearch';
import { HeroColumns } from '@/components/public/HeroColumns';

type HomeHeroBlockProps = {
  barrios: string[];
};

export function HomeHeroBlock({ barrios }: HomeHeroBlockProps) {
  return (
    <>
      <Navbar />
      <HeroColumns>
        <HeroSearch barrios={barrios} />
      </HeroColumns>
    </>
  );
}
