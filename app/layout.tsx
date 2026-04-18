import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Chatbot } from '@/components/Chatbot';
import { features } from '@/lib/features';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vibe MVP',
  description: 'Starter scaffold for the Vibe Coder\u2019s Guide to MVP.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-base-100 text-base-content">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        {features.chatbot && <Chatbot />}
      </body>
    </html>
  );
}
