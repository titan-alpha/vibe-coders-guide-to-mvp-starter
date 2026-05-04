/**
 * Self-documenting hover tooltip.
 *
 * Per the SKILL.md self-documenting rule + sub-skill 02 design system:
 * every non-obvious interactive element wraps in <Tooltip>. Falls back to
 * the native `title` attribute when localStorage tooltips=off (set in
 * /settings).
 *
 *   <Tooltip label="Cycle theme: light / dark / system">
 *     <ThemeToggle />
 *   </Tooltip>
 */

'use client';
import { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  label: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, label, side = 'bottom' }: Props) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(localStorage.getItem('tooltips') !== 'off');
  }, []);

  if (!enabled) {
    return <span title={label}>{children}</span>;
  }

  const sideClass =
    side === 'top'
      ? 'bottom-full mb-1 left-1/2 -translate-x-1/2'
      : side === 'left'
        ? 'right-full mr-1 top-1/2 -translate-y-1/2'
        : side === 'right'
          ? 'left-full ml-1 top-1/2 -translate-y-1/2'
          : 'top-full mt-1 left-1/2 -translate-x-1/2';

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span title={label}>{children}</span>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 px-2 py-1 rounded-md bg-base-200 border border-base-300/60 text-xs shadow-lg whitespace-nowrap pointer-events-none ${sideClass}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
