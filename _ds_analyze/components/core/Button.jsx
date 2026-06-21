import React from 'react';
import { Icon } from './Icon.jsx';

const SIZES = {
  sm: { padding: '9px 16px', fontSize: '0.8125rem', radius: 'var(--ev-r-md)', gap: 7, icon: 15 },
  md: { padding: '12px 20px', fontSize: '0.875rem', radius: 'var(--ev-r-md)', gap: 8, icon: 16 },
  lg: { padding: '15px 26px', fontSize: '0.9375rem', radius: 'var(--ev-r-lg)', gap: 9, icon: 18 },
};

const VARIANTS = {
  primary: { background: 'var(--ev-primary)', color: 'var(--ev-primary-content)', border: '1px solid var(--ev-primary)' },
  accent: { background: 'var(--ev-purple)', color: 'var(--ev-purple-content)', border: '1px solid var(--ev-purple)' },
  outline: { background: 'var(--ev-white)', color: 'var(--ev-ink)', border: '1px solid var(--ev-border)' },
  ghost: { background: 'transparent', color: 'var(--ev-ink-soft)', border: '1px solid transparent' },
};

/** Primary text button with optional leading/trailing icons. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: s.padding,
        fontFamily: 'var(--ev-font-sans)',
        fontSize: s.fontSize,
        fontWeight: 600,
        lineHeight: 1,
        borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        transition: 'filter .15s ease, transform .05s ease',
        ...v,
        ...style,
      }}
      {...rest}
    >
      {iconLeft && <Icon name={iconLeft} size={s.icon} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}
