// SVG logo mark for BUAP — Facultad de Administración
// Uses primary-800 as base color; pass className to override

interface BuapLogoProps {
  size?: number
  className?: string
}

export function BuapLogo({ size = 56, className = '' }: BuapLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BUAP — Facultad de Administración"
    >
      {/* Background rounded square */}
      <rect width="56" height="56" rx="14" fill="#003366" />

      {/* Stylized "FA" lettermark */}
      {/* F */}
      <rect x="10" y="13" width="3" height="30" rx="1.5" fill="white" />
      <rect x="10" y="13" width="13" height="3" rx="1.5" fill="white" />
      <rect x="10" y="25" width="10" height="3" rx="1.5" fill="white" />

      {/* A */}
      <path
        d="M28 43 L35 13 L42 43"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="30"
        y1="32"
        x2="40"
        y2="32"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Accent line bottom */}
      <rect x="10" y="50" width="36" height="2" rx="1" fill="#3399FF" />
    </svg>
  )
}
