# Miniservicio Node (Next.js modo server, output standalone) para correr en cualquier host con Docker.
#
# IMPORTANTE — imagen genérica y reconfigurable:
#   Ninguna regla / organización / proyecto / clave se hornea en la imagen. TODA la configuración
#   (ORG_ID, PROJECT_ID, RULE_ID, BLERIFY_API_URL, cuenta de servicio, etc.) se inyecta en TIEMPO DE
#   EJECUCIÓN como variables de entorno. Por eso la MISMA imagen sirve para N despliegues distintos:
#     docker run --env-file mi.env  ...
#   Ver `.env.example`.

FROM node:20.9.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20.9.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Construye la salida standalone (server.js) para la imagen. En Netlify/Vercel esta variable
# no se define y cada plataforma usa su propio adaptador. Ver next.config.mjs.
ENV NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=true
RUN npm run build

FROM node:20.9.0-alpine AS runner
WORKDIR /app

# Único parámetro admitido en build-time: el puerto. La config de negocio NO se acepta como
# build-arg a propósito, para no atarla a la imagen.
ARG PORT=8080

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=${PORT} \
    # El server.js standalone de Next hace bind a $HOSTNAME; Docker lo fija al id del contenedor,
    # dejándolo inaccesible por -p y por el healthcheck. Forzar 0.0.0.0 = escuchar en todas las interfaces.
    HOSTNAME=0.0.0.0

LABEL org.opencontainers.image.title="blerify-verification-demo" \
      org.opencontainers.image.description="Ejemplo de integración de verificación OIDC4VP (front + BFF). Configurable 100% por env en runtime."

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Salida standalone de Next: server.js + deps mínimas.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE ${PORT}

# Chequeo de salud: la home responde 200 cuando el server está listo (busybox wget viene en alpine).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8080}/" || exit 1

CMD ["node", "server.js"]
