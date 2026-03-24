import React, { useId } from 'react';

type MarkProps = {
  className?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
};

/**
 * Simple logomark: rounded tile + two stepped bars (cascade / layers).
 */
export const CascadeMark: React.FC<MarkProps> = ({
  className = 'w-9 h-9',
  'aria-label': ariaLabel = 'Cascade',
  'aria-hidden': ariaHidden,
}) => {
  const gid = `cascade-g-${useId().replace(/\W/g, '')}`;
  const decorative = ariaHidden === true;

  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : ariaLabel}
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gid})`} />
      <rect x="8" y="12" width="18" height="7" rx="3.5" fill="white" fillOpacity={0.95} />
      <rect x="14" y="22" width="18" height="7" rx="3.5" fill="white" fillOpacity={0.88} />
    </svg>
  );
};

type HeaderBrandProps = {
  tagline?: string;
  showTagline?: boolean;
  titleClassName?: string;
  taglineClassName?: string;
  wordmarkClassName?: string;
};

export const CascadeHeaderBrand: React.FC<HeaderBrandProps> = ({
  tagline = 'Data Analytics Platform',
  showTagline = true,
  titleClassName = 'text-lg font-bold text-gray-900 tracking-tight',
  taglineClassName = 'text-xs text-gray-500',
  wordmarkClassName,
}) => (
  <div className="flex items-center gap-3">
    <CascadeMark className="w-9 h-9 shrink-0 shadow-md" aria-hidden />
    <div className={wordmarkClassName ? `min-w-0 ${wordmarkClassName}` : 'min-w-0'}>
      <h1 className={titleClassName}>Cascade</h1>
      {showTagline ? <p className={taglineClassName}>{tagline}</p> : null}
    </div>
  </div>
);
