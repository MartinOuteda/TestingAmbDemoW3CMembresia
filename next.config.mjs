/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `output: 'standalone'` (imagen Docker que corre con `node server.js`) SOLO cuando se construye
  // para contenedor: el Dockerfile fija BUILD_STANDALONE=true. En Netlify/Vercel se deja sin definir
  // para que cada plataforma use su propio adaptador de Next (que no usa la salida standalone).
  // Las rutas app/api/* actúan de BFF (flujo OIDC4VP + cuenta de servicio); el navegador nunca ve secretos.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  // Las rutas /api/* son un BFF dinámico (polling de estado, callback OIDC4VP). NUNCA deben cachearse:
  // sin esto, el navegador y/o Cloudflare sirven la primera respuesta `pending` para todos los polls
  // del mismo transactionId (misma URL) y el front nunca recibe el COMPLETED.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Cloudflare-CDN-Cache-Control', value: 'no-store' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
};

export default nextConfig;
