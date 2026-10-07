// Estado y resultado de cada verificación, en memoria (demo, un solo pod), keyed por transaction_id.
// Guarda createdAt para el modo mock (simular el delay de presentación).
export type VerificationStatus = 'pending' | 'verified' | 'failed';

interface Entry {
  status: VerificationStatus;
  result?: unknown;
  createdAt: number;
}

const entries = new Map<string, Entry>();

export function setStatus(tx: string, status: VerificationStatus): void {
  if (!tx) return;
  const prev = entries.get(tx);
  entries.set(tx, { status, result: prev?.result, createdAt: prev?.createdAt ?? Date.now() });
}

export function getStatus(tx: string): VerificationStatus {
  return entries.get(tx)?.status ?? 'pending';
}

export function setResult(tx: string, result: unknown): void {
  if (!tx) return;
  const prev = entries.get(tx);
  entries.set(tx, { status: 'verified', result, createdAt: prev?.createdAt ?? Date.now() });
}

export function getResult(tx: string): unknown | undefined {
  return entries.get(tx)?.result;
}

export function getCreatedAt(tx: string): number {
  return entries.get(tx)?.createdAt ?? Date.now();
}
