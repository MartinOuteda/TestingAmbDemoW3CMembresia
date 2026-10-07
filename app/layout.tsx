import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Verificación de identidad — Blerify (demo)',
  description:
    'Ejemplo de integración de verificación de identidad con Blerify (OIDC4VP / ISO 18013-5 mDL): frontend + BFF que inicia la verificación, muestra el QR o el botón de wallet y consulta el resultado.',
};

// Aplica el tema guardado (o el del sistema) antes de pintar para evitar parpadeo.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
