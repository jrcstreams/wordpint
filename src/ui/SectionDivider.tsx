interface SectionDividerProps {
  children: React.ReactNode;
}

/**
 * Centered section label with horizontal rules on each side. Used to
 * separate the bottom-region subsections (Words on Tap, Running Tab)
 * without heavy full-width borders.
 *
 *   ─── WORDS ON TAP ───
 */
export function SectionDivider({ children }: SectionDividerProps) {
  return (
    <div className="shrink-0 px-4 pt-2 pb-1.5 sm:pt-2.5 sm:pb-2 flex items-center justify-center gap-3">
      <span aria-hidden="true" className="h-px flex-1 max-w-[110px] bg-ink/35" />
      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-ink-mute whitespace-nowrap">
        {children}
      </span>
      <span aria-hidden="true" className="h-px flex-1 max-w-[110px] bg-ink/35" />
    </div>
  );
}
