import type { Metadata, Viewport } from 'next';
import { Lexend, Nunito } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { InstallPrompt } from '@/components/shared/install-prompt';
import { ServiceWorker } from '@/components/shared/service-worker';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

// Texto: Lexend, diseñada para leer con más fluidez (letras abiertas y bien espaciadas) y con un 0 sin barra,
// que no confunde en teléfonos, fechas ni precios: lectura fácil (§6.2).
// Títulos: Nunito, de trazos redondeados, para un tono cercano y amable.
// Solo `latin`: cubre tildes, ñ, ¿ y ¡; latin-ext duplicaba la descarga. Nunito (títulos) no se precarga: así el texto
// sale antes en 4G lento y el título aparece con la fuente del sistema un instante (display: swap)
const body = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' });
const display = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: { default: 'SR Conecta', template: '%s · SR Conecta' },
  description: 'Santiago Rodríguez en un solo mapa: turismo, negocios, rutas, tránsito en vivo y reportes al municipio.',
  applicationName: 'SR Conecta',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'SR Conecta', statusBarStyle: 'default' },
  icons: { icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }, { url: '/icons/favicon-32.png', sizes: '32x32' }], apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f4f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1114' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Leer las cabeceras hace el render dinámico, requisito para que Next aplique el nonce de la CSP (src/proxy.ts).
  await headers();
  // Apariencia elegida en Perfil (cookie "tema"). Sin cookie: la del teléfono (prefers-color-scheme).
  const tema = (await cookies()).get('tema')?.value;
  const theme = tema === 'dark' || tema === 'light' ? tema : undefined;
  // data-scroll-behavior="smooth": al cambiar de pantalla, Next sube al inicio de golpe en vez de deslizar la página
  // (el desplazamiento suave de globals.css queda para los enlaces "#" dentro de una misma pantalla). Sin esto, en el
  // teléfono la pantalla nueva seguía moviéndose casi un segundo después de tocar y los botones "huían" del dedo.
  return (
    <html lang="es-DO" data-theme={theme} data-scroll-behavior="smooth" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-on-ink">
          Saltar al contenido
        </a>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  );
}
