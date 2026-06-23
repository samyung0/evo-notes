export function LogoMark({ size = 36 }: { size?: number }) {
  const u = size / 36;
  return (
    <span
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: 10 * u,
        background: '#222222',
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 36 36" fill="none">
        <rect x="9" y="9" width="14" height="3.6" rx="1.8" fill="var(--action-primary-fg)" />
        <rect x="9" y="16.2" width="10" height="3.6" rx="1.8" fill="#aef07f" />
        <rect x="9" y="23.4" width="14" height="3.6" rx="1.8" fill="var(--action-primary-fg)" />
        <circle cx="25.5" cy="18" r="2.1" fill="#8c7bd9" />
      </svg>
    </span>
  );
}
