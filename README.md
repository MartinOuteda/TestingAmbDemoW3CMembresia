# blerify-verification-demo (front + BFF)

Ejemplo mínimo de **integración de verificación de identidad con Blerify** usando **OIDC4VP**
(OpenID for Verifiable Presentations) e **ISO 18013-5 (mDL)**. Es un miniservicio Next.js en modo
server: una página que inicia la verificación, muestra el **código QR** (o un **botón de billetera**
en móvil) y consulta el resultado; y unas rutas `app/api/*` que actúan de **BFF** (Backend For
Frontend) orquestando el flujo contra Blerify. **No hay secretos en el navegador.**

Este servicio **solo verifica identidad**: inicia la verificación, valida la presentación y devuelve
el resultado con los atributos revelados. No registra usuarios ni gestiona sesiones — esa lógica es
responsabilidad de la aplicación que integre este patrón.

## Cómo funciona

```
navegador ──POST /api/start──▶ BFF ──init (v2, cuenta de servicio)──▶ Blerify
   │  muestra QR / botón de wallet     ◀── { transaction_id, qr, link, ... }
   │
wallet ── escanea el QR (o abre el deep link) y presenta la credencial ──▶ Blerify
   │
   └─ sondeo: GET /api/status?transactionId ──▶ BFF ──poll + verify (v2)──▶ Blerify
                                          ◀── { status, credential: { valid, claims, validation,
                                                                       documentImages? } }
```

- **El BFF usa el flujo v2 autenticado** con una **cuenta de servicio** (OAuth2 `private_key_jwt`,
  RFC 7523; aserción firmada **RS256**, clave RSA-2048 en PKCS#8 PEM) para iniciar y consultar la
  verificación. La wallet, que escanea el QR y no tiene el token, baja el authorization request
  firmado por los endpoints públicos y presenta ahí.
- **No hay webhook**: el resultado se obtiene por **sondeo** (poll + verify en una sola llamada),
  correlacionado por `transaction_id`.
- **Documento renderizado (nivel STANDARD)**: si la wallet entregó el render del documento por el
  sideband de extensiones, el envelope v2 lo trae en `evidence.document_render` (`format`,
  `redaction`, `images[{side: front|back, data: base64}]`). El BFF lo normaliza a
  `credential.documentImages` (data: URIs) y el frontend pinta anverso y reverso. En verificaciones
  BASIC el campo no viene y la sección no se muestra.
- **Móvil (mismo dispositivo)**: si la página se abre desde un teléfono o tableta (user agent
  iOS/Android), en vez del QR se muestra el botón **«Abrir mi billetera»** con el mismo deep link
  que codifica el QR (enlace universal que abre la app de la wallet); un conmutador permite ver el
  QR si la billetera está en otro dispositivo.

## Estructura

| Ruta | Rol |
|------|-----|
| `app/api/start/route.ts` | Inicia la verificación; devuelve `transaction_id`, QR y deep link. |
| `app/api/status/route.ts` | Sondeo: poll + verify; devuelve el resultado y los atributos. |
| `app/api/w3c/{start,status}/route.ts` | Igual que los anteriores pero sobre la regla W3C (`W3C_RULE_ID`); sin mock. |
| `app/api/_lib/blerify.ts` | Cliente OIDC4VP v2 + token de la cuenta de servicio (flows `default` y `w3c`). |
| `app/api/_lib/extract.ts` | Envelope v2 → credencial genérica (claims + validación + `documentImages`). |
| `app/api/_lib/store.ts` | Estado por `transaction_id` (en memoria; una réplica). |
| `app/api/_lib/mock.ts` | Modo demostración sin backend (`DEMO_MOCK=true`). |
| `app/components/VerificationPanel.tsx` | Interfaz del flujo (QR / botón / resultado), reutilizable vía `apiBase`. |
| `app/w3c/page.tsx` | Página de prueba de la regla W3C con DCQL (usa el mismo panel sobre `/api/w3c`). |

## Prerrequisitos en el portal de Blerify

Antes de configurar el servicio necesitas dos cosas creadas en el portal de Blerify: una **regla de
verificación publicada** (de donde sale `RULE_ID`) y una **cuenta de servicio** (de donde salen las
variables `SA_*`). La cuenta de servicio conviene crearla primero, porque el último paso del
asistente de la regla te pedirá seleccionarla.

### 1. Crear la cuenta de servicio

La cuenta de servicio autentica al BFF máquina a máquina (OAuth2 `private_key_jwt`, RS256). Se
gestiona a nivel de organización y requiere el rol de propietario o administrador de la organización.

1. En el portal, ve a **Organización → Cuentas de servicio** y pulsa **«Crear cuenta de servicio»**.
2. Completa el formulario:
   - **Nombre** y **Descripción**.
   - **Algoritmo de firma**: `RS256` (RSA con SHA-256), la única opción.
   - **Roles**: selecciona **«Verificaciones»** (este rol habilita iniciar y consultar
     verificaciones a través de los endpoints v2 autenticados).
   - **Proyecto**: como el rol de verificaciones está acotado a un proyecto, elige el **proyecto de
     verificación** donde vive (o vivirá) tu regla.
3. Pulsa **Crear**. El portal genera el par de claves y te ofrece **descargar un archivo JSON**
   (`service-account-<client_id>.json`).
4. **Descarga y guarda ese archivo en un lugar seguro: la clave privada se muestra una sola vez y no
   se puede volver a descargar.** (El botón de cerrar permanece deshabilitado hasta que descargas.)

Del JSON descargado salen, tal cual, las variables del servicio:

| Campo del JSON | Variable de entorno |
|----------------|---------------------|
| `client_id` | `SA_CLIENT_ID` |
| `private_key` | `SA_PRIVATE_KEY` (PEM PKCS#8, RSA-2048) |
| `iam_audience` | `SA_IAM_AUDIENCE` |
| `token_uri` | `SA_TOKEN_URI` (opcional; por defecto `${BLERIFY_API_URL}/auth/v2/protocol/openid-connect/token`) |
| `organization_id` | `SA_ORGANIZATION_ID` (opcional; por defecto = `ORG_ID`) |

### 2. Crear y publicar la regla de verificación

La regla («PresentationVerification») define qué credenciales y atributos se solicitan y cómo se
validan. Vive dentro de un **proyecto de categoría «verificación»**.

1. Entra al proyecto de verificación y abre **«Reglas de Verificación»** en el menú del proyecto;
   pulsa **«Nueva regla»**.
2. Elige el **nivel de verificación** y luego las **credenciales** que aceptarás. Se abre el
   asistente de cinco pasos:
   1. **Información** — nombre de la regla, código interno, descripción y tipo.
   2. **Atributos y pruebas** — qué atributos de cada credencial se solicitan.
   3. **Verificaciones** — validaciones a aplicar y el transporte (**OpenID4VP**).
   4. **Listas de sanciones** — listas de control (opcional).
   5. **Integración técnica** — seleccionas la **cuenta de servicio** (la del paso anterior), el modo
      (API/SDK) y el flujo; aquí se generan el identificador y los fragmentos de código.
3. En el paso **«Integración técnica»** pulsa **«Generar ID»** (la regla se guarda como borrador) y
   luego **«Publicar regla»** para pasarla a estado **ACTIVE**. Solo una regla publicada es utilizable.

**De dónde sale `RULE_ID`:** es el **UUID de la regla**, que aparece en ese paso 5 bajo la etiqueta
**«ID de la regla»**, con botón de copiar. Cópialo ahí mismo.

> ⚠️ No lo confundas con el **«ID de verificación»** que se muestra en la pantalla de *detalle* de la
> regla (un código con formato `ver_…`): ese **no** es el valor que espera este servicio. `RULE_ID`
> es el UUID de «ID de la regla» del paso de integración.

**`ORG_ID` y `PROJECT_ID`:** son los identificadores de tu organización y del proyecto de
verificación. La forma más simple de obtener los tres a la vez es mirar los fragmentos de código del
mismo paso «Integración técnica», donde la URL incrusta
`…/organizations/{ORG_ID}/projects/{PROJECT_ID}/verifications/{RULE_ID}`.

## Configuración (variables de entorno — lado servidor)

Toda la configuración es de ejecución; ver `.env.example`. Lo esencial:

- `BLERIFY_API_URL`, `ORG_ID`, `PROJECT_ID`, `RULE_ID`, `WALLET_BASE_URL` (ver «Prerrequisitos» arriba).
  - En **staging** los hosts siguen el patrón `<servicio>.staging.blerify.com`: usa `BLERIFY_API_URL=https://api.staging.blerify.com` (subdominios en ese orden — **no** `staging.api.blerify.com`, ese error hace que las llamadas fallen) y `SA_IAM_AUDIENCE=https://iam.staging.blerify.com/realms/{orgId}`.
- Cuenta de servicio (flujo real): `SA_CLIENT_ID`, `SA_PRIVATE_KEY` (RS256 / PKCS#8), `SA_IAM_AUDIENCE`
  y, opcionalmente, `SA_TOKEN_URI`, `SA_ORGANIZATION_ID`.

## Ejecutar en local

```bash
cp .env.example .env      # completa los valores (o usa DEMO_MOCK=true)
npm install
npm run dev               # http://localhost:3000
```

Sin backend ni cuenta de servicio, prueba solo la interfaz con el modo simulado:

```bash
DEMO_MOCK=true npm run dev
```

## Despliegue

La misma base de código se despliega en tres destinos. En todos, la configuración (incluida la clave
de la cuenta de servicio) se define en el entorno de la plataforma, nunca en el repositorio.

### Netlify

Conecta el repositorio en Netlify; `netlify.toml` ya declara el build y el adaptador de Next
(`@netlify/plugin-nextjs`), que sirve las rutas `app/api/*` como funciones. Define las variables de
entorno en *Site settings → Environment variables* (ver `.env.example`).

### Vercel

Importa el repositorio en Vercel; se detecta como Next.js (`vercel.json`). Define las variables de
entorno del proyecto en el panel. No requiere configuración adicional.

### Docker (cualquier host / Kubernetes)

```bash
docker build -t blerify-verification-demo .
docker run --env-file .env -p 8080:8080 blerify-verification-demo
```

La imagen es genérica: ninguna regla, organización ni clave se hornea en ella; todo se inyecta por
entorno en tiempo de ejecución. El `Dockerfile` construye con `output: 'standalone'`
(`BUILD_STANDALONE=true`); Netlify y Vercel dejan esa variable sin definir y usan su propio adaptador.

## Integración continua

`.github/workflows/ci.yml` valida en cada push y pull request que el proyecto compila
(`typecheck` + `build`) y que la imagen Docker se construye. No despliega ni requiere secretos.
