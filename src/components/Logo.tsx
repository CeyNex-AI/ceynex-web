export default function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ceynex-mark" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="var(--color-teal-800)" />
          <stop offset="100%" stopColor="var(--color-teal-500)" />
        </linearGradient>
      </defs>
      {/* Asymmetric corner (sharp on the bottom-left) rather than a uniform
       * rounded square -- the one shape flourish the mark itself carries,
       * echoed by the cut-corner panels elsewhere in the app. */}
      <path d="M8 0H32V32H0V8C0 3.58 3.58 0 8 0Z" fill="url(#ceynex-mark)" />
      <path
        d="M8 20L14 14L18 18L24 10"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 10H24V15" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
