/** Exclusão entre abas para o slot automático. Não altera o formato GameState v7. */
import { writeSave } from './persistence.js';
import type { SaveWrite, StoragePort } from './persistence.js';
import { restoreGame } from './simulation.js';
import type { GameState } from './simulation.js';

export const AUTOSAVE_OWNER_KEY = 'project-zero-autosave-owner-v011';
export const AUTOSAVE_LOCK_NAME = 'project-zero-autosave-exclusive-v011';
export const AUTOSAVE_LEASE_MS = 45_000;

export type AutosaveOwner = { owner: string; expiresAt: number };
export type CoordinatedSave = SaveWrite | { status: 'conflict' };

/** IDs de sessão só distinguem abas; não são autenticação nem credenciais. */
export function newAutosaveSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function parseAutosaveOwner(raw: string | null): AutosaveOwner | null {
  if (raw === null || raw.length > 400) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const entry = value as Partial<AutosaveOwner>;
    if (typeof entry.owner !== 'string' || entry.owner.length < 1 || entry.owner.length > 128 ||
        !Number.isSafeInteger(entry.expiresAt) || (entry.expiresAt ?? -1) < 0) return null;
    return {owner: entry.owner, expiresAt: entry.expiresAt!};
  } catch { return null; }
}

/**
 * Executar sob Web Locks quando disponível. Em HTTP sem Web Locks, a lease
 * detecta conflitos, mas a verificação/gravação no localStorage não é atômica.
 */
export function saveAutosaveWithLease(
  storage: StoragePort, game: GameState, sessionId: string,
  takeover = false, now = Date.now(),
): CoordinatedSave {
  if (typeof sessionId !== 'string' || sessionId.length < 1 || sessionId.length > 128 ||
      !Number.isSafeInteger(now) || restoreGame(game) === null) return {status:'invalid'};
  try {
    const raw = storage.getItem(AUTOSAVE_OWNER_KEY);
    if (raw !== null) {
      const current = parseAutosaveOwner(raw);
      // Metadata danificada: não substituir silenciosamente o checkpoint.
      if (!current) return {status:'conflict'};
      if (!takeover && current.owner !== sessionId && current.expiresAt > now) return {status:'conflict'};
    }
    storage.setItem(AUTOSAVE_OWNER_KEY, JSON.stringify({owner:sessionId,expiresAt:now+AUTOSAVE_LEASE_MS}));
    return writeSave(storage,'automatico',game);
  } catch { return {status:'unavailable'}; }
}

/** Web Locks serializa o read-check-write entre abas no contexto seguro. */
export async function coordinatedAutosave(
  storage: StoragePort, game: GameState, sessionId: string, takeover = false,
): Promise<CoordinatedSave> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    try {
      return await navigator.locks.request(AUTOSAVE_LOCK_NAME,
        () => saveAutosaveWithLease(storage,game,sessionId,takeover));
    } catch { return {status:'unavailable'}; }
  }
  return saveAutosaveWithLease(storage,game,sessionId,takeover);
}