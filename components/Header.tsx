import Link from 'next/link';
import { LogoMark } from '@/components/LogoMark';
import { features } from '@/lib/features';

/**
 * Header — the working surface.
 * Contains: brand + primary product nav + account action. Nothing else.
 * About, Contact, and legal links live in the Footer (sub-skill 02-design).
 */
export function Header() {
  return (
    <header className="border-b border-base-300 bg-base-100/70 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark size={28} />
          <span>App</span>
        </Link>

        {/* Primary product nav — keep to 2–5 items.
            Replace with your product's surfaces in sub-skill 02-design. */}
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link href="/" className="opacity-80 hover:opacity-100">Home</Link>
        </nav>

        <div className="flex items-center gap-2">
          {features.auth ? (
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
