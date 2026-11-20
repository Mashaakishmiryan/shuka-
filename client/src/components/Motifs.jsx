import { useId } from 'react';

/** The apron's stepped diamond. Used as logo mark, spinner and empty-state picture. */
export function SteppedDiamond({ size = 64, spin = false, className = '', title }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" className={`${spin ? 'diamond-spin' : ''} ${className}`}
      role={title ? 'img' : 'presentation'} aria-hidden={title ? undefined : true} aria-label={title}
    >
      <path fill="#F4AAA5" d="M14 2h4v2h2v2h2v2h2v2h2v2h2v2h2v4h-2v2h-2v2h-2v2h-2v2h-2v2h-2v2h-4v-2h-2v-2h-2v-2H8v-2H6v-2H4v-2H2v-4h2v-2h2v-2h2V8h2V6h2V4h2z" />
      <path fill="#F8F3ED" d="M16 7l9 9-9 9-9-9z" />
      <path fill="#D83935" d="M16 10.5l5.5 5.5-5.5 5.5-5.5-5.5z" />
      <path fill="#A82B28" d="M16 13l3 3-3 3-3-3z" />
      <path fill="#F9AF51" d="M16 14.6l1.4 1.4-1.4 1.4-1.4-1.4z" />
    </svg>
  );
}

/** The zigzag along the apron's hem: separates the header and each seller group. */
export function HemBorder({ onLight = false }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`hem ${onLight ? 'on-light' : ''}`} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id={`hem-${id}`} width="22" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 10 L5.5 3 L11 10 L16.5 3 L22 10" fill="none" stroke="currentColor" strokeWidth="1.8" />
          {!onLight && <circle cx="11" cy="12.6" r="0" fill="currentColor" />}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#hem-${id})`} />
    </svg>
  );
}

/** The silver belt: studs on a dark band; the buckle holds the grand total. */
export function SilverBelt({ label, value }) {
  return (
    <div className="belt" role="group" aria-label={`${label}: ${value}`}>
      <div className="studs" aria-hidden="true">
        <span /><span /><span className="hide-sm" /><span style={{ visibility: 'hidden' }} /><span className="hide-sm" /><span /><span />
      </div>
      <div className="buckle">
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="loading" role="status">
      <SteppedDiamond size={44} spin />
      {label && <span className="small">{label}</span>}
    </div>
  );
}
