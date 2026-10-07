import { NextRequest, NextResponse } from 'next/server';
import { pollVerification, PollResult } from '../_lib/blerify';
import { getCreatedAt, getResult, setResult, setStatus } from '../_lib/store';
import { MOCK_ENABLED, mockReady, mockResult } from '../_lib/mock';
import { extractCredential, isValid, VerifiedCredential } from '../_lib/extract';

export const dynamic = 'force-dynamic';

export type { VerifiedCredential };

// Polling del frontend: pending hasta que la wallet presenta; al completarse, devuelve el
// resultado de la verificación y los atributos presentados. El flujo v2 hace poll + verify
// en una sola llamada (pollVerification). NO hay registro de usuario ni sesión: este servicio
// solo verifica identidad y devuelve el resultado.
export async function GET(req: NextRequest) {
  const tx = new URL(req.url).searchParams.get('transactionId');
  if (!tx) return NextResponse.json({ error: 'transactionId requerido' }, { status: 400 });

  const cached = getResult(tx) as VerifiedCredential | undefined;
  if (cached !== undefined) {
    return NextResponse.json({ status: 'verified', credential: cached });
  }

  if (MOCK_ENABLED) {
    if (mockReady(getCreatedAt(tx))) {
      const credential = extractCredential(mockResult() as PollResult);
      setResult(tx, credential);
      return NextResponse.json({ status: 'verified', credential });
    }
    return NextResponse.json({ status: 'pending' });
  }

  try {
    const poll = await pollVerification(tx);
    if (poll.status === 'PENDING') return NextResponse.json({ status: 'pending' });
    if (poll.status !== 'COMPLETED' || !isValid(poll)) {
      setStatus(tx, 'failed');
      return NextResponse.json({ status: 'failed', error: 'La credencial no es válida.' }, { status: 200 });
    }
    const credential = extractCredential(poll);
    setResult(tx, credential);
    return NextResponse.json({ status: 'verified', credential });
  } catch (e) {
    setStatus(tx, 'failed');
    return NextResponse.json({ status: 'failed', error: (e as Error).message }, { status: 502 });
  }
}
