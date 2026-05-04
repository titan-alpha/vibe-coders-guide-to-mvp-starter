/**
 * Theme toggle — cycles light → dark → system, persisted to localStorage.
 *
 * Per sub-skill 02: light + dark are non-negotiable; the toggle lives in the
 * header (5-element rule, position #3). To prevent flash-of-wrong-theme,
 * pair this component with an inline <script> in app/layout.tsx's <head>
 * that reads localStorage synchronously.
 */

'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Mode = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('system');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Mode | null) ?? 'system';
    apply(saved);
    setMode(saved);
  }, []);

  function apply(m: Mode) {
    const dark =
      m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'vibedark' : 'vibelight';
    localStorage.setItem('theme', m);
  }

  function next() {
    const order: Mode[] = ['system', 'light', 'dark'];
    const m = order[(order.indexOf(mode) + 1) % order.length];
    setMode(m);
    apply(m);
  }

  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;

  return (
    <button
      onClick={next}
      className="btn btn-ghost btn-sm btn-square"
      aria-label={`Theme: ${mode}`}
      title={`Theme: ${mode} — click to cycle`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
