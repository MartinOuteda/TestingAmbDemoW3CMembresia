'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import DocumentFlipCard from './DocumentFlipCard';

interface VerifiedCredential {
  issuer: string;
  format: string;
  docType: string;
  valid: boolean;
  validation: Record<string, unknown>;
  claims: Record<string, unknown>;
  // Documento renderizado por la wallet (nivel STANDARD): anverso/reverso como data: URIs.
  documentImages?: Array<{ side: string; src: string }>;
  documentRedaction?: string;
}

interface StartResponse {
  transactionId: string;
  qr: string;
  link: string;
  mock?: boolean;
}

type Phase = 'idle' | 'qr' | 'result';

// En móvil la wallet vive en el MISMO dispositivo: no puedes escanear tu propia pantalla,
// así que en vez del QR se ofrece un botón que abre el deep link (enlace universal de la
// wallet) directamente. iPadOS 13+ se anuncia como "MacIntel" pero con pantalla táctil.
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || iPadOS;
}

// --- Formato de presentación de los claims -----------------------------------

const LABELS: Record<string, string> = {
  given_name: 'Nombre', family_name: 'Apellido', name: 'Nombre completo',
  document_number: 'Número de documento', birth_date: 'Fecha de nacimiento',
  issuing_country: 'País emisor', issuing_authority: 'Autoridad emisora',
  expiry_date: 'Fecha de expiración', issue_date: 'Fecha de emisión',
  nationality: 'Nacionalidad', portrait: 'Fotografía', age_over_18: 'Mayor de edad',
};

function label(key: string): string {
  if (LABELS[key]) return LABELS[key];
  return key.replace(/[_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Claims que la regla pide para poder verificar, no datos que la persona comparta. El DUI lleva
// `verificationProof` ({did, domain}) en el namespace del emisor y la regla lo incluye siempre,
// porque sin él no se puede consultar el registro de revocación. Llega en la respuesta —que es el
// contrato y lo expone entero— pero esta pantalla enseña lo que se compartió, así que no se pinta.
const CLAIMS_NO_MOSTRADOS = new Set(['verificationProof']);

function esClaimDelTitular(key: string): boolean {
  return !CLAIMS_NO_MOSTRADOS.has(key);
}

const SIDE_LABELS: Record<string, string> = { front: 'Anverso', back: 'Reverso' };

function sideLabel(side: string): string {
  return SIDE_LABELS[side] ?? label(side || 'documento');
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return `${Number(m[3])}/${m[2]}/${m[1]}`;
    if (value.length > 64) return `${value.slice(0, 61)}…`;
    return value;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Some claims (e.g. `portrait`, `signature_usual_mark`) arrive as a hex-encoded image — an ISO mDL
// byte string serialized to hex. Detect the image by its magic bytes and turn it into a data: URI so
// it renders as a picture instead of a wall of hex. Returns null for anything that isn't such an image.
function imageDataUri(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const hex = value.trim().toLowerCase();
  if (hex.length < 8 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) return null;
  let mime: string | null = null;
  if (hex.startsWith('ffd8ff')) mime = 'image/jpeg';
  else if (hex.startsWith('89504e47')) mime = 'image/png';
  else if (hex.startsWith('0000000c6a502020')) mime = 'image/jp2';
  if (!mime) return null;
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    let bin = '';
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return `data:${mime};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

// --- Iconos ------------------------------------------------------------------

function SvgCheck() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}
function SvgCross() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function SvgShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function SvgWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M16 12h3" />
      <path d="M3 9h13a2 2 0 0 1 2 2" />
    </svg>
  );
}
function SvgDot() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l4.5 4.5L19 6" />
    </svg>
  );
}

// --- Componente principal ----------------------------------------------------

// `apiBase` permite montar el MISMO panel sobre otro par de rutas del BFF (p.ej. /api/w3c para la
// regla W3C); los textos de cabecera se ajustan por props con los valores por defecto del flujo
// principal.
export default function VerificationPanel({
  apiBase = '/api',
  title = 'Verifica tu identidad',
  subtitle = 'Presenta una credencial digital desde tu billetera',
  credentialHint = 'Necesitas una credencial de identidad en tu billetera digital.',
}: {
  apiBase?: string;
  title?: string;
  subtitle?: string;
  credentialHint?: string;
} = {}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [credential, setCredential] = useState<VerifiedCredential | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  // Tras montar (nunca en SSR, para no romper la hidratación): ¿es un dispositivo móvil?
  useEffect(() => {
    setIsMobile(isMobileDevice());
    return () => clearPoll();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setLoading(true);
    setQr(null);
    setLink(null);
    setShowQr(false);
    try {
      const res = await fetch(`${apiBase}/start`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as StartResponse;
      setQr(data.qr);
      setLink(data.link ?? null);
      setPhase('qr');
      setWaiting(true);

      pollRef.current = setInterval(async () => {
        // Cache-buster (`_`): cada poll es una URL única → evita que cualquier capa (Next server
        // cache, navegador o CDN) sirva una respuesta `pending` cacheada sin llegar al backend.
        const s = await fetch(`${apiBase}/status?transactionId=${encodeURIComponent(data.transactionId)}&_=${Date.now()}`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => null);
        if (s?.status === 'verified') {
          clearPoll();
          setCredential(s.credential ?? null);
          setQr(null);
          setWaiting(false);
          setPhase('result');
        } else if (s?.status === 'failed') {
          clearPoll();
          setError(s.error || 'La verificación falló. Inténtalo de nuevo.');
          setWaiting(false);
        }
      }, 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const reset = () => {
    clearPoll();
    setQr(null);
    setLink(null);
    setShowQr(false);
    setWaiting(false);
    setError(null);
    setCredential(null);
    setPhase('idle');
  };

  const head = (
    <div className="signup-head">
      <span className="si"><SvgShield /></span>
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );

  // ----- result: credencial verificada (o inválida) -----
  if (phase === 'result' && credential) {
    const c = credential;
    const v = c.validation ?? {};
    const claimKeys = Object.keys(c.claims ?? {}).filter(esClaimDelTitular);
    return (
      <div className="signup-card">
        <div className="welcome">
          <div className={`welcome-check${c.valid ? '' : ' bad'}`}>{c.valid ? <SvgCheck /> : <SvgCross />}</div>
          <h3>{c.valid ? 'Identidad verificada' : 'Credencial no válida'}</h3>
          <p className="sub">
            {c.valid
              ? 'La credencial fue presentada y validada correctamente. Estos son los atributos revelados:'
              : 'La credencial se presentó pero no superó la validación.'}
          </p>

          {claimKeys.length > 0 && (
            <div className="profile-grid">
              {claimKeys.map((k) => {
                const img = imageDataUri(c.claims[k]);
                return (
                  <div className="pf" key={k}>
                    <div className="k">{label(k)}</div>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="claim-img" src={img} alt={label(k)} />
                    ) : (
                      <div className="v">{formatValue(c.claims[k])}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(c.documentImages?.length ?? 0) > 0 && (
            <div className="doc-render">
              <div className="doc-render-title">Documento presentado</div>
              {c.documentImages!.length > 1 ? (
                // Anverso y reverso: una tarjeta que se voltea al tocarla.
                <DocumentFlipCard
                  frontSrc={c.documentImages![0].src}
                  frontLabel={sideLabel(c.documentImages![0].side)}
                  backSrc={c.documentImages![1].src}
                  backLabel={sideLabel(c.documentImages![1].side)}
                />
              ) : (
                <div className="doc-sides single">
                  <figure className="doc-side">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.documentImages![0].src}
                      alt={`${sideLabel(c.documentImages![0].side)} del documento presentado`}
                    />
                    <figcaption>{sideLabel(c.documentImages![0].side)}</figcaption>
                  </figure>
                </div>
              )}
              {c.documentRedaction === 'blur' && (
                <p className="doc-note">
                  La billetera entregó estas imágenes con los datos sensibles difuminados.
                </p>
              )}
            </div>
          )}

          <div className="checks">
            {[
              ['Firma criptográfica', v.signature_valid],
              ['Emisor confiable', v.issuer_trusted],
              ['Vínculo con el titular', v.holder_binding === 'VERIFIED' || v.holder_binding === true],
              ['No revocada', v.revoked === false],
              ['Vigente', v.expired === false],
            ].map(([lbl, ok]) => (
              <span className={`check ${ok ? 'y' : 'n'}`} key={String(lbl)}>
                <SvgDot /> {lbl as string}
              </span>
            ))}
          </div>

          {(c.issuer || c.format || c.docType) && (
            <div className="meta-line">
              {c.docType && <span>{c.docType}</span>}
              {c.format && <span>{c.format}</span>}
              {c.issuer && <span className="issuer">{c.issuer}</span>}
            </div>
          )}

          <div className="welcome-actions">
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={reset}>
              Verificar otra credencial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- qr: esperando presentación -----
  if (phase === 'qr' && qr) {
    // Flujo "mismo dispositivo": en móvil la wallet está en este teléfono y no puedes escanear
    // tu propia pantalla, así que el deep link se abre con un botón. El QR queda disponible
    // detrás de un conmutador por si la billetera está en otro dispositivo.
    const sameDevice = isMobile && Boolean(link) && !showQr;
    return (
      <div className="signup-card">
        {head}
        <div className="qr-stage">
          {sameDevice && link ? (
            <>
              <a className="btn btn-primary btn-block btn-lg" href={link}>
                <SvgWallet /> Abrir mi billetera
              </a>
              <p className="scan-hint">
                Toca el botón para abrir tu billetera digital y presenta tu credencial. Al
                terminar, vuelve a esta pantalla.
              </p>
            </>
          ) : (
            <>
              <div className="qr-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Código QR de verificación" width={240} height={240} />
              </div>
              <p className="scan-hint">
                Escanea el código con tu billetera digital y presenta tu credencial para continuar.
              </p>
            </>
          )}
          {waiting && (
            <span className="qr-wait">
              <span className="spinner" /> Esperando tu presentación…
            </span>
          )}
          {isMobile && link && (
            <button type="button" className="qr-alt" onClick={() => setShowQr((s) => !s)}>
              {showQr
                ? 'Abrir la billetera en este dispositivo'
                : '¿Tu billetera está en otro dispositivo? Mostrar código QR'}
            </button>
          )}
          {error && <div className="alert-err">{error}</div>}
          <button type="button" className="btn btn-ghost on-light" onClick={reset}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ----- idle: inicio -----
  return (
    <div className="signup-card">
      {head}
      <ul className="intro-list">
        <li><SvgDot /> Sin formularios ni fotos de tu documento</li>
        <li><SvgDot /> Tú eliges qué datos compartir desde tu wallet</li>
        <li><SvgDot /> La credencial se valida firmada criptográficamente</li>
      </ul>
      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={start} disabled={loading}>
        {loading ? <><span className="spinner light" /> Generando…</> : 'Iniciar verificación'}
      </button>
      {error && <div className="alert-err">{error}</div>}
      <p className="scan-hint center">{credentialHint}</p>
    </div>
  );
}
