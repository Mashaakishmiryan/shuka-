/*
 * The two characters from the mood board, drawn as head-and-shoulder portraits.
 * Anahit (buyer): wine-red cap with a dotted band, lavender veil, closed-lip smile, silver earrings.
 * Aram (seller): lavender headband with a loose tail, short beard, periwinkle shirt with embroidered collar.
 */
const SKIN = '#EE9F86';
const SKIN_SHADE = '#E08A74';
const PLUM = '#3A1F2E';
const BLUSH = '#F2867E';
const LAV = '#C9C8E6';
const LAV_DARK = '#B4B2DA';
const WINE = '#8E1D3E';
const PERI = '#7C7DB8';

function Eyes({ y = 58, gap = 13 }) {
  return (
    <g>
      {[-gap, gap].map((dx) => (
        <g key={dx}>
          <ellipse cx={60 + dx} cy={y} rx="5.2" ry="4.6" fill="#fff" />
          <circle cx={60 + dx} cy={y + 0.6} r="3" fill={PLUM} />
          <circle cx={61.2 + dx} cy={y - 0.6} r="1" fill="#fff" />
          <path d={`M${53.5 + dx} ${y - 3.5} q6.5 -4.5 13 0`} stroke={PLUM} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

export function Anahit({ size = 96, ring = 'lavender', framed = true, className = '' }) {
  return (
    <svg
      viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Anahit"
      className={framed ? `avatar ${ring === 'rose' ? 'ring-rose' : ''} ${className}` : className}
    >
      {framed && <rect width="120" height="120" fill="#F8F6FB" />}
      {/* veil over head and shoulders */}
      <path d="M60 8c-26 0-38 22-38 48v52c0 8 76 8 76 0V56C98 30 86 8 60 8z" fill={LAV} />
      <path d="M24 102c12-8 60-8 72 0v18H24z" fill={LAV_DARK} opacity=".55" />
      <path d="M32 110c16-5 40-5 56 0" stroke="#A6A3CF" strokeWidth="1.6" fill="none" />
      {/* hair framing the face */}
      <path d="M36 48c0-18 10-28 24-28s24 10 24 28v40H74l-2-30H48l-2 30H36z" fill={PLUM} />
      {/* neck and face */}
      <path d="M52 78h16v18H52z" fill={SKIN_SHADE} />
      <ellipse cx="60" cy="60" rx="19" ry="23" fill={SKIN} />
      <path d="M41 46c4-10 12-14 19-14s15 4 19 14c-8-5-30-5-38 0z" fill={PLUM} />
      {/* wine-red cap with a dotted band */}
      <path d="M38 36c0-16 10-26 22-26s22 10 22 26c-14-4-30-4-44 0z" fill={WINE} />
      <path d="M44 22c4 2 8 2 12 0s8-2 12 0" stroke="#C04A6A" strokeWidth="1.5" fill="none" />
      <path d="M44 29c4 2 8 2 12 0s8-2 12 0" stroke="#C04A6A" strokeWidth="1.5" fill="none" />
      {[42, 48, 54, 60, 66, 72, 78].map((x) => <circle key={x} cx={x} cy="35.5" r="1.4" fill="#F4EEEA" />)}
      <Eyes y={58} gap={8.5} />
      <circle cx="47" cy="68" r="4.5" fill={BLUSH} opacity=".75" />
      <circle cx="73" cy="68" r="4.5" fill={BLUSH} opacity=".75" />
      <path d="M60 60v8c0 1.5 -1.5 2 -3 1.6" stroke={SKIN_SHADE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M53 74c4 3.5 10 3.5 14 0" stroke="#9C3A4A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* small silver earrings */}
      <circle cx="41.5" cy="68" r="1.6" fill="#C9C6C3" />
      <circle cx="78.5" cy="68" r="1.6" fill="#C9C6C3" />
    </svg>
  );
}

export function Aram({ size = 96, ring = 'lavender', framed = true, className = '' }) {
  return (
    <svg
      viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Aram"
      className={framed ? `avatar ${ring === 'rose' ? 'ring-rose' : ''} ${className}` : className}
    >
      {framed && <rect width="120" height="120" fill="#F8F6FB" />}
      {/* periwinkle shirt with embroidered collar */}
      <path d="M22 120c0-20 16-30 38-30s38 10 38 30z" fill={PERI} />
      <path d="M60 92l-4 4 4 14 4-14z" fill="#5E5FA0" />
      {[[42, 98], [49, 95], [71, 95], [78, 98]].map(([x, y]) => (
        <path key={x} d={`M${x - 3} ${y}l3 -2.5 3 2.5 -3 2.5z`} fill="none" stroke="#5E5FA0" strokeWidth="1.3" />
      ))}
      <path d="M53 80h14v14c-4 3-10 3-14 0z" fill={SKIN_SHADE} />
      {/* ears + face */}
      <ellipse cx="39" cy="60" rx="4.5" ry="6.5" fill={SKIN_SHADE} />
      <ellipse cx="81" cy="60" rx="4.5" ry="6.5" fill={SKIN_SHADE} />
      <ellipse cx="60" cy="58" rx="21" ry="25" fill={SKIN} />
      {/* short beard */}
      <path d="M39 60c0 18 9 28 21 28s21-10 21-28c-3 8-6 12-9 14-6-3-18-3-24 0-3-2-6-6-9-14z" fill={PLUM} />
      <path d="M52 73c5 2 11 2 16 0" stroke={PLUM} strokeWidth="3.2" strokeLinecap="round" />
      {/* hair */}
      <path d="M38 50c-2-22 10-34 24-34 14 0 24 10 21 34-4-8-10-12-22-12s-18 4-23 12z" fill={PLUM} />
      {/* lavender headband with a loose tail */}
      <path d="M38 42c14-6 30-6 44 0l-1 6c-14-5-28-5-42 0z" fill={LAV} />
      <path d="M41 44c-6 2-10 10-12 22l5-1c2-9 5-15 9-17z" fill={LAV_DARK} />
      <path d="M41 45c-3 4-4 12-3 20l4-1c-1-7 0-13 2-17z" fill={LAV} />
      <circle cx="41" cy="45" r="3.2" fill={LAV_DARK} />
      <Eyes y={56} gap={9} />
      <circle cx="46" cy="66" r="4.2" fill={BLUSH} opacity=".7" />
      <circle cx="74" cy="66" r="4.2" fill={BLUSH} opacity=".7" />
      <path d="M60 58v7c0 1.5 -1.5 2 -3 1.6" stroke={SKIN_SHADE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* big smile */}
      <path d="M51.5 72c3 4.5 14 4.5 17 0z" fill="#fff" stroke="#7A2A3A" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** Default profile picture: sellers get Aram, buyers get Anahit (as in the mood board). */
export function UserAvatar({ user, size = 32, ring }) {
  const Comp = user?.isSeller ? Aram : Anahit;
  return <Comp size={size} ring={ring} />;
}
