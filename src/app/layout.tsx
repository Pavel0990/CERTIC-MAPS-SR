import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { ServiceWorker } from '@/components/shared/service-worker';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'SR Conecta', template: '%s · SR Conecta' },
  description: 'Santiago Rodríguez en un solo mapa: turismo, negocios, rutas, tránsito en vivo y reportes al municipio.',
  applicationName: 'SR Conecta',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'SR Conecta', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#111418',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Leer las cabeceras hace el render dinámico, requisito para que Next aplique el nonce de la CSP (src/proxy.ts).
  await headers();
  return (
    <html lang="es-DO" className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Saltar al contenido
        </a>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
