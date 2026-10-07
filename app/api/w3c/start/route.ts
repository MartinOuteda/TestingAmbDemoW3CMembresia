import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createSession, buildWalletLink } from '../../_lib/blerify';

export const dynamic = 'force-dynamic';

// Inicia la verificación de la regla W3C (flow 'w3c') y devuelve el QR + transaction_id.
// Ruta independiente del flujo por defecto: usa W3C_RULE_ID (misma org/proyecto salvo overrides).
// No hay modo mock en esta ruta: es para probar la regla W3C real de punta a punta.
export async function POST() {
  try {
    const session = await createSession('w3c');
    // Managed signing: el backend firma el authorization request en el init; no hace falta PUT.
    const link = buildWalletLink(session, 'w3c');
    const qr = session.images?.qrImage ?? (await QRCode.toDataURL(link, { width: 280, margin: 1 }));
    return NextResponse.json({ transactionId: session.transaction_id, qr, link });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
