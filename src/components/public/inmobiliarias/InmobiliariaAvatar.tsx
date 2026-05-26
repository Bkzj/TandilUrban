import Image from 'next/image';
import { Building2 } from 'lucide-react';

type InmobiliariaAvatarProps = {
  imageUrl: string | null;
  alt: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
};

const SIZE = {
  md: 'h-16 w-16 sm:h-20 sm:w-20',
  lg: 'h-24 w-24 sm:h-28 sm:w-28',
  xl: 'h-32 w-32 sm:h-36 sm:w-36',
} as const;

const ICON = {
  md: 'h-8 w-8 sm:h-9 sm:w-9',
  lg: 'h-10 w-10 sm:h-12 sm:w-12',
  xl: 'h-12 w-12 sm:h-14 sm:w-14',
} as const;

export function InmobiliariaAvatar({
  imageUrl,
  alt,
  size = 'md',
  className = '',
}: InmobiliariaAvatarProps) {
  const box = `${SIZE[size]} shrink-0 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-md ring-1 ring-black/5`;

  if (imageUrl?.trim()) {
    return (
      <div className={`relative ${box} ${className}`}>
        <Image src={imageUrl} alt={alt} fill className="object-cover" sizes="144px" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${box} ${className}`}
      aria-hidden
    >
      <Building2 className={`${ICON[size]} text-verde/70`} strokeWidth={1.5} />
    </div>
  );
}
