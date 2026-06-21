import React from 'react';

/**
 * Evo Notes line-icon set. Lucide-style geometry: 24x24 grid,
 * 1.8 stroke, round caps & joins, currentColor stroke.
 * Keeps the bundle self-contained (no CDN dependency).
 */
const PATHS = {
  dashboard: ['M3 3h7.5v7.5H3z', 'M13.5 3H21v7.5h-7.5z', 'M13.5 13.5H21V21h-7.5z', 'M3 13.5h7.5V21H3z'],
  workspaces: ['M12 3l9 4.5-9 4.5-9-4.5z', 'M3 12l9 4.5 9-4.5', 'M3 16.5l9 4.5 9-4.5'],
  practice: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 8a4 4 0 100 8 4 4 0 000-8z', 'M12 11.4a.6.6 0 100 1.2.6.6 0 000-1.2z'],
  schedule: ['M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z', 'M3 10h18', 'M8 3v4', 'M16 3v4'],
  files: ['M13.5 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8.5z', 'M13.5 3v5.5H19'],
  tasks: ['M4 4h16v16H4z', 'M8.5 12.3l2.4 2.4 4.6-5'],
  notes: ['M12 20h9', 'M16.5 3.5a2.05 2.05 0 113 3L7 19l-4 1 1-4z'],
  profile: ['M12 4.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6z', 'M5.5 20.5a6.5 6.5 0 0113 0'],
  settings: ['M4 7.5h8', 'M16 7.5h4', 'M14 5.5a2 2 0 100 4 2 2 0 000-4z', 'M4 16.5h4', 'M12 16.5h8', 'M10 14.5a2 2 0 100 4 2 2 0 000-4z'],
  logout: ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  search: ['M11 4a7 7 0 100 14 7 7 0 000-14z', 'M21 21l-4-4'],
  bell: ['M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z', 'M10 20a2 2 0 004 0'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M5 20h14'],
  send: ['M5 12h14', 'M13 6l6 6-6 6'],
  sparkles: ['M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z', 'M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z'],
  check: ['M5 12.5l4.5 4.5L19 6.5'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  moreVertical: ['M12 5h.01', 'M12 12h.01', 'M12 19h.01'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13', 'M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3'],
  message: ['M21 12a8 8 0 01-11.3 7.3L4 21l1.7-5.7A8 8 0 1121 12z'],
  book: ['M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5z', 'M4 20.5A2.5 2.5 0 016.5 18H19v3'],
  flashcards: ['M5 7h11a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z', 'M8 4h11a2 2 0 012 2v8'],
  quiz: ['M9.2 9a2.8 2.8 0 115.2 1.4c-.6 1-1.9 1.3-2.4 2.4', 'M12 17h.01', 'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  filter: ['M3 5h18', 'M6 12h12', 'M10 19h4'],
  clock: ['M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z', 'M12 7.5V12l3 2'],
  location: ['M12 21.5s7-5.7 7-11.2a7 7 0 10-14 0c0 5.5 7 11.2 7 11.2z', 'M12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z'],
};

export function Icon({ name, size = 18, strokeWidth = 1.8, color = 'currentColor', style, ...rest }) {
  const ds = PATHS[name] || PATHS.dashboard;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: '0 0 auto', ...style }}
      {...rest}
    >
      {ds.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
