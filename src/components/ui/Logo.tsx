export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: 10,
        background: '#222222',
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 36 36" fill="none">
        <rect x="7" y="7" width="17" height="4.6" rx="1.8" fill="#ffffff" />
        <rect x="7" y="15.7" width="12.5" height="4.6" rx="1.8" fill="#aef07f" />
        <rect x="7" y="24.4" width="17" height="4.6" rx="1.8" fill="#ffffff" />
        <circle cx="26" cy="18" r="2.8" fill="#8c7bd9" />
      </svg>
    </span>
  );
}
