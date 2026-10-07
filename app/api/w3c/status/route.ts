import { NextRequest, NextResponse } from 'next/server';
import { pollVerification } from '../../_lib/blerify';
import { extractCredential, isValid } from '../../_lib/extract';

export const dynamic = 'force-dynamic';

// Polling de la verificación W3C (flow 'w3c'). Devuelve la MISMA forma que /api/status
// ({status, credential}) para que el frontend reutilice el panel sin cambios. Sin mock ni caché:
// esta ruta prueba la regla W3C real de punta a punta.
export async function GET(req: NextRequest) {
  const tx = new URL(req.url).searchParams.get('transactionId');
  if (!tx) return NextResponse.json({ error: 'transactionId requerido' }, { status: 400 });

  try {
    const poll = await pollVerification(tx, 'w3c');
    if (poll.status === 'PENDING') return NextResponse.json({ status: 'pending' });
    if (poll.status !== 'COMPLETED' || !isValid(poll)) {
      return NextResponse.json({ status: 'failed', error: 'La credencial no es válida.' }, { status: 200 });
    }
    return NextResponse.json({ status: 'verified', credential: extractCredential(poll) });
  } catch (e) {
    return NextResponse.json({ status: 'failed', error: (e as Error).message }, { status: 502 });
  }
}
