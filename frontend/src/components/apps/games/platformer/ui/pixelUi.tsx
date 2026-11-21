'use client';

/**
 * DOM controls styled to sit with the pixel art: square edges, a thin neon
 * border, monospace capitals, a glow on focus and press. Real buttons, so
 * keyboard and screen readers work.
 */
export function PixelButton({ children, onClick, primary = false, disabled = false, className = '', label }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; className?: string; label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 border-2 px-5 py-2 font-mono text-[13px] uppercase tracking-[0.18em] transition-[transform,box-shadow,background-color] duration-100 ease-out
        active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_#06040f,0_0_0_4px_#3df2ff]
        disabled:cursor-not-allowed disabled:opacity-40 ${
          primary
            ? 'border-[#ff3d9a] bg-[#2a0f24]/90 text-[#ffe0ef] shadow-[0_0_18px_rgba(255,61,154,0.35)] hover:bg-[#3a1430]'
            : 'border-[#3df2ff]/70 bg-[#06040f]/80 text-[#d8f8ff] hover:bg-[#0e1a26]'
        } ${className}`}
    >
      {children}
    </button>
  );
}

export function PixelPanel({ children, className = '', ...rest }: { children: React.ReactNode; className?: string; 'data-testid'?: string }) {
  return (
    <div {...rest} className={`border-2 border-[#3df2ff]/60 bg-[#06040f]/90 shadow-[0_0_24px_rgba(61,242,255,0.15)] ${className}`}>
      {children}
    </div>
  );
}
