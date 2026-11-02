import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { GlobalSearchModal } from '@/components/GlobalSearchModal';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { getSettings } from '@/queries/settings';
import { LanguageProvider } from '@/context/LanguageContext';
import { headers } from 'next/headers';
import Script from 'next/script';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Gastronomy POS',
  description: 'Premium Restaurant POS & Management System',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentUser();
  const settings = await getSettings();

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-50 dark:selection:text-zinc-950 transition-colors duration-150">
        <Script
          id="theme-toggle"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try {
              if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (_) {}`,
          }}
        />
        <LanguageProvider>
          <ToastProvider>
            {admin ? (
              <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
                 <Navbar adminEmail={admin.email} logoUrl={settings.logo_url} />
                 <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col">
                   {children}
                 </main>
                 <GlobalSearchModal />
              </div>
            ) : (
              <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                {children}
              </div>
            )}
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
