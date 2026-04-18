import Link from 'next/link';
import { LogoMark } from '@/components/LogoMark';

/**
 * Footer — the reference surface.
 * Everything informational, legal, or used-once-not-daily lives here:
 * About, Contact, Terms, Privacy, social, docs, copyright.
 */
export function Footer() {
  return (
    <footer className="border-t border-base-300 bg-base-200/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap gap-8 justify-between items-start">
        <div className="flex items-center gap-2 font-medium">
          <LogoMark size={24} />
          <span>App</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2 text-sm">
          <Link href="/about" className="opacity-70 hover:opacity-100">About</Link>
          <Link href="/contact" className="opacity-70 hover:opacity-100">Contact</Link>
          <Link href="/terms" className="opacity-70 hover:opacity-100">Terms</Link>
          <Link href="/privacy" className="opacity-70 hover:opacity-100">Privacy</Link>
          <Link
            href="/privacy#ccpa-rights"
            className="opacity-70 hover:opacity-100"
          >
            Do Not Sell
          </Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 text-xs opacity-50">
        &copy; {new Date().getFullYear()} App. All rights reserved.
      </div>
    </footer>
  );
}
