import Image from 'next/image';

export function ComputeIcon({ size = 24, label = '', className = '' }: { size?: number; label?: string; className?: string }) {
  const height = Math.round(size * .72);
  return <Image unoptimized className={`compute-icon ${className}`} src="/compute/dell-icon.png" alt={label} width={size} height={height} style={{ width: size, height, objectFit: 'cover', objectPosition: 'center', flex: 'none' }} />;
}
