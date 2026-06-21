import React from 'react';

const SIZES = { xs: 24, sm: 30, md: 38, lg: 48 };

/** Round user avatar — image or monogram initials. */
export function Avatar({ src, name = '', size = 'md', style, ...rest }) {
  const px = SIZES[size] || (typeof size === 'number' ? size : 38);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      style={{
        width: px,
        height: px,
        flex: `0 0 ${px}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ev-purple-soft)',
        color: 'var(--ev-purple-ink)',
        fontFamily: 'var(--ev-font-sans)',
        fontWeight: 700,
        fontSize: px * 0.36,
        ...style,
      }}
      {...rest}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials || '·'
      )}
    </span>
  );
}
