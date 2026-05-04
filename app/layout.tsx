/**
 * Root layout — sticky header, scrolling footer, sticky-footer flex pattern.
 *
 * Per sub-skill 02 design rule:
 * - Header: sticky top, h-14, never scrolls.
 * - Footer: scrolls with content (NOT sticky), at bottom on short pages
 *   via min-h-dvh + flex-1 main.
 * - Theme: data-theme set synchronously from localStorage to prevent
 *   flash-of-wrong-theme on first paint.
 */

import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Chatbot } from '@/components/Chatbot';
import { Toaster } from 'sonner';
import { flag } from '@/lib/feature-flag';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vibe MVP',
  description: 'Starter scaffold for the Vibe Coder\u2019s Guide to MVP.',
  icons: { icon: '/icon.svg' },
};

// Inline script to apply theme synchronously, avoiding flash-of-wrong-theme.
// Runs before React hydrates; reads localStorage; sets data-theme on <html>.
const themeBootstrap = `
(function(){
  try {
    var t = localStorage.getItem('theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'vibedark' : 'vibelight';
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const chatbotOn = await flag('chatbot');
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-dvh flex flex-col bg-base-100 text-base-content">
        <Header productName="Vibe MVP" />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster position="bottom-right" richColors closeButton />
        {chatbotOn && <Chatbot />}
      </body>
    </html>
  );
}
