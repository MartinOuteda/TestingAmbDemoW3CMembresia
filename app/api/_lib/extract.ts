// Extracción de la credencial verificada desde el envelope v2 (poll+verify) hacia la forma
// genérica que consume el frontend. Compartida por /api/status (regla por defecto) y
// /api/w3c/status (regla W3C): el envelope tiene la misma forma en ambos flujos.
import { PollResult } from './blerify';

// Forma de la credencial verificada que se devuelve al frontend. Es genérica: no asume ningún
// conjunto de atributos concreto — expone los claims tal cual los reveló la wallet.
export interface VerifiedCredential {
  issuer: string;
  format: string;
  docType: string;
  valid: boolean;
  validation: Record<string, unknown>;
  claims: Record<string, unknown>;
  // Documento renderizado por la wallet (evidence.document_render, nivel STANDARD): anverso y
  // reverso ya normalizados como data: URI listos para <img>. Ausente en verificaciones BASIC.
  documentImages?: Array<{ side: string; src: string }>;
  documentRedaction?: string;
}

// ISO mDL: los claims vienen por namespace (p.ej. {"org.iso.18013.5.1": {given_name, ...}}).
// Los aplanamos para poder leerlos directo. W3C ya viene plano (== credentialSubject).
//
// No se descarta nada aquí: esta respuesta es el contrato que un integrador lee para saber qué
// entrega la wallet, así que expone los claims tal cual llegaron. Qué se le enseña a una persona lo
// decide la vista.
function flattenClaims(claims: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(claims)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

// Normaliza una imagen del document_render a data: URI. El contrato entrega base64 crudo con el
// MIME en document_render.format; se aceptan además data: URIs ya formados y hex (magic bytes)
// por si alguna wallet serializa como los claims de imagen ISO.
function toDataUri(data: string | undefined, mime: string): string | null {
  const v = (data ?? '').trim();
  if (!v) return null;
  if (v.startsWith('data:')) return v;
  if (/^(ffd8ff|89504e47)/i.test(v) && v.length % 2 === 0 && /^[0-9a-f]+$/i.test(v)) {
    const m = v.toLowerCase().startsWith('ffd8ff') ? 'image/jpeg' : 'image/png';
    return `data:${m};base64,${Buffer.from(v, 'hex').toString('base64')}`;
  }
  return `data:${mime};base64,${v}`;
}

// Documento renderizado por la wallet: evidence.document_render del envelope v2 → imágenes
// (anverso primero) como data: URIs. Solo está presente en verificaciones de nivel STANDARD.
function extractDocumentImages(result: PollResult): Array<{ side: string; src: string }> {
  const render = result.evidence?.document_render;
  if (!render?.images?.length) return [];
  const mime = render.format?.includes('/') ? render.format : 'image/jpeg';
  const order: Record<string, number> = { front: 0, back: 1 };
  return render.images
    .map((img) => ({ side: img.side ?? '', src: toDataUri(img.data, mime) }))
    .filter((img): img is { side: string; src: string } => Boolean(img.src))
    .sort((a, b) => (order[a.side] ?? 9) - (order[b.side] ?? 9));
}

// Extrae la primera credencial verificada del envelope v2 (poll+verify), en forma genérica.
export function extractCredential(result: PollResult): VerifiedCredential | null {
  const first = (result.credentials ?? [])[0];
  if (!first) return null;
  const data = first.data ?? {};
  const validation = (first.result ?? {}) as Record<string, unknown>;
  const documentImages = extractDocumentImages(result);
  return {
    issuer: String(first.issuer ?? ''),
    format: String(data.format ?? ''),
    docType: String(data.doctype ?? first.type ?? ''),
    valid: Boolean(first.present) && Boolean(validation.credential_valid),
    validation,
    claims: flattenClaims((data.namespaces ?? data.claims ?? {}) as Record<string, unknown>),
    ...(documentImages.length > 0 && {
      documentImages,
      documentRedaction: result.evidence?.document_render?.redaction,
    }),
  };
}

// COMPLETED + la primera credencial presente y válida (firma + binding, no revocada/expirada).
export function isValid(result: PollResult): boolean {
  const first = (result.credentials ?? [])[0];
  const r = (first?.result ?? {}) as Record<string, unknown>;
  return Boolean(first?.present) && Boolean(r.credential_valid);
}
