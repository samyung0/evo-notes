import React from 'react';
import { Icon } from './Icon.jsx';

const SIZES = {
  sm: { box: 38, icon: 19, radius: 'var(--ev-r-sm)' },
  md: { box: 46, icon: 22, radius: 'var(--ev-r-md)' },
  lg: { box: 52, icon: 24, radius: 'var(--ev-r-md)' },
};

const VARIANTS = {
  dark: { background: 'var(--ev-primary)', color: 'var(--ev-primary-content)', border: '1px solid var(--ev-primary)' },
  accent: { background: 'var(--ev-purple)', color: 'var(--ev-purple-content)', border: '1px solid var(--ev-purple)' },
  outline: { background: 'var(--ev-white)', color: 'var(--ev-ink-soft)', border: '1px solid var(--ev-border)' },
  ghost: { background: 'transparent', color: 'var(--ev-ink-soft)', border: '1px solid transparent' },
};

/** Square icon-only button. Optional notification dot. */
export function IconButton({
  icon,
  variant = 'outline',
  size = 'md',
  dot = false,
  disabled = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.outline;
  return (
    <button
      disabled={disabled}
      style={{
        position: 'relative',
        width: s.box,
        height: s.box,
        flex: `0 0 ${s.box}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'filter .15s ease',
        ...v,
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={s.icon} />
      {dot && (
        <span style={{
          position: 'absolute', top: s.box * 0.21, right: s.box * 0.23,
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--ev-error)', border: '1.5px solid var(--ev-white)',
        }} />
      )}
    </button>
  );
}
