/**
 * Hamburger menu — every top-level page lives here.
 *
 * Per sub-skill 02 design rule: header element #5. Contains all top-level
 * navigation, a Settings link (when auth is on), and a Feedback item (when
 * the feedback module is on). The Feedback item opens a modal; everything
 * else is a real page.
 */

'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, X, Settings as SettingsIcon, MessageCircle } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

interface MenuFlags {
  auth?: boolean;
  feedback?: boolean;
  press?: boolean;
  publicChangelog?: boolean;
}

export function HamburgerMenu({ flags = {} }: { flags?: MenuFlags }) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost btn-sm btn-square"
        aria-label="Open menu"
        aria-expanded={open}
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-base-300/60 bg-base-100 shadow-2xl p-1 z-50"
        >
          <Link href="/" role="menuitem" className="block px-3 py-2 rounded-lg hover:bg-base-200 text-sm">
            Home
          </Link>
          <Link href="/about" role="menuitem" className="block px-3 py-2 rounded-lg hover:bg-base-200 text-sm">
            About
          </Link>
          <Link href="/faq" role="menuitem" className="block px-3 py-2 rounded-lg hover:bg-base-200 text-sm">
            FAQ
          </Link>
          {flags.publicChangelog && (
            <Link href="/changelog" role="menuitem" className="block px-3 py-2 rounded-lg hover:bg-base-200 text-sm">
              What&apos;s new
            </Link>
          )}
          {flags.press && (
            <Link href="/press" role="menuitem" className="block px-3 py-2 rounded-lg hover:bg-base-200 text-sm">
              Press
            </Link>
          )}

          {flags.feedback && (
            <>
              <hr className="my-1 border-base-300/40" />
              <button
                role="menuitem"
                onClick={() => { setOpen(false); setFeedbackOpen(true); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-sm"
              >
                <MessageCircle className="w-4 h-4 opacity-70" />
                Feedback
              </button>
            </>
          )}

          {flags.auth && (
            <>
              <hr className="my-1 border-base-300/40" />
              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-sm"
              >
                <SettingsIcon className="w-4 h-4 opacity-70" />
                Settings
              </Link>
            </>
          )}
        </div>
      )}

      {feedbackOpen && <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}
