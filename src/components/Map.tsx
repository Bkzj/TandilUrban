'use client';

import dynamic from 'next/dynamic';

import { LeafletMapLoading } from '@/components/maps/LeafletMapLoading';

export default dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: LeafletMapLoading,
});
