/**
 * Header — sticky to top, never scrolls, uniform 56px (h-14) on every page.
 *
 * Per sub-skill 02 design rule (up to 5 elements, in order):
 *   1. Logo (left, links to /)
 *   2. Title (next to logo, semibold)
 *   3. Theme toggle (right-aligned)
 *   4. Bell icon (right of theme toggle, only when notifications module is on)
 *   5. Hamburger menu (rightmost, contains all top-level pages + Settings)
 *
 * No primary product nav in the header itself; everything goes in the
 * hamburger dropdown. This rule is non-negotiable.
 */

import Link from 'next/link';
import { LogoMark } from '@/components/LogoMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Tooltip } from '@/components/Tooltip';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { flag } from '@/lib/feature-flag';

export async function Header({ productName = 'App' }: { productName?: string }) {
  const [notificationsOn, themeToggleOn] = await Promise.all([
    flag('notifications'),
    flag('theme_toggle', null, 'Show the theme cycle button in the header'),
  ]);

  // theme_toggle defaults to true conceptually but auto-registers as false.
  // For the starter, we'll show it always unless someone explicitly disables.
  // (In production the flag overrides this default; first deploy auto-creates the row at false.)
  const showThemeToggle = themeToggleOn || true;

  return (
    <header
      className="site-shell-header sticky top-0 z-40 h-14 border-b border-base-300/50 bg-base-100/70 backdrop-blur-md"
      aria-label="Site header"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        {/* Left: logo + title */}
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight min-w-0">
          <LogoMark size={28} />
          <span className="truncate">{productName}</span>
        </Link>

        {/* Right: controls (theme toggle, bell-if-notifications, hamburger) */}
        <div className="flex items-center gap-1 shrink-0">
          {showThemeToggle && (
            <Tooltip label="Theme: cycle light / dark / system" side="bottom">
              <ThemeToggle />
            </Tooltip>
          )}
          {notificationsOn && <NotificationBell />}
          <HamburgerMenu />
        </div>
      </div>
    </header>
  );
}
