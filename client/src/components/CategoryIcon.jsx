const ICONS = {
  electronics: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 15h2',
  'home-kitchen': 'M4 10h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zm14 1h1a2 2 0 0 1 0 4h-1M8 3v3m4-3v3',
  fashion: 'M9 3l3 2 3-2 5 3-2 4-2-1v11H8V9l-2 1-2-4z',
  beauty: 'M10 3h4v4h-4zM9 7h6v14H9zm0 5h6',
  books: 'M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zm16 0a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z',
  sports: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9c5 2 12 2 17 0M3.5 15c5-2 12-2 17 0',
  toys: 'M4 13h7v7H4zm9 0h7v7h-7zM8.5 4h7v7h-7z',
  food: 'M7 8h10v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zm1-5h8v5H8zm0 9h8',
  handmade: 'M12 2l3 3-3 3-3-3zm0 6l7 7-7 7-7-7zm0 4l3 3-3 3-3-3z',
  auto: 'M3 15l2-6h14l2 6v3H3zm4 3v2m10-2v2M6 12h12M7.5 15.5h.01m9 0h.01',
};

export function CategoryIcon({ slug, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[slug] || ICONS.handmade} />
    </svg>
  );
}
