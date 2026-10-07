import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createSession, buildWalletLink } from '../_lib/blerify';
import { setStatus } from '../_lib/store';
import { MOCK_ENABLED, mockStart } from '../_lib/mock';

export const dynamic = 'force-dynamic';

// Inicia la verificación y devuelve el QR + transaction_id. Con DEMO_MOCK=true no toca Blerify.
export async function POST() {
  try {
    if (MOCK_ENABLED) {
      const m = await mockStart();
      setStatus(m.transactionId, 'pending');
      return NextResponse.json({ transactionId: m.transactionId, qr: m.qr, link: m.link, mock: true });
    }
    const session = await createSession();
    setStatus(session.transaction_id, 'pending');
    // Managed ISO signing: el backend firma el authorization request en el init; no hace falta PUT.
    const link = buildWalletLink(session);
    const qr = session.images?.qrImage ?? (await QRCode.toDataURL(link, { width: 280, margin: 1 }));
    return NextResponse.json({ transactionId: session.transaction_id, qr, link });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
