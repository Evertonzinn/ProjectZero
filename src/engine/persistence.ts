/** Persistência local sem dependências, sem envio de dados e sem exclusão de saves. */
import { restoreGame } from './simulation.js';
import type { GameState } from './simulation.js';

export const SAVE_KEYS = {
  manual: 'project-zero-save-v1', // Chave histórica, não modificar.
  backup: 'project-zero-manual-backup-v010',
  automatico: 'project-zero-autosave-v010',
} as const;
export type SaveSlot = keyof typeof SAVE_KEYS;
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type SaveRead =
  | { status: 'ok'; game: GameState; migrated: boolean }
  | { status: 'missing' | 'invalid' | 'unavailable' };
export type SaveWrite = { status:'ok'|'invalid'|'unavailable'|'backup-failed' };

export const MAX_IMPORT_BYTES = 2_500_000;

/** Save externo pode conter versões antigas; valida/migra sem mutar o objeto original. */
export function parseGameJson(raw: string): SaveRead {
  if (typeof raw !== 'string' || raw.length > MAX_IMPORT_BYTES) return { status:'invalid' };
  try {
    const parsed: unknown = JSON.parse(raw);
    const game = restoreGame(parsed);
    if (!game) return {status:'invalid'};
    return {status:'ok',game,migrated:(parsed as {version?:number}).version!==7};
  } catch { return {status:'invalid'}; }
}

export function readSave(storage: StoragePort, slot: SaveSlot): SaveRead {
  try {
    const raw = storage.getItem(SAVE_KEYS[slot]);
    return raw===null ? {status:'missing'} : parseGameJson(raw);
  } catch { return {status:'unavailable'}; }
}

/** Preserva a cópia anterior válida ANTES de sobrescrever o slot manual. */
export function writeSave(storage: StoragePort, slot:'manual'|'automatico', game: GameState): SaveWrite {
  if (restoreGame(game) === null) return { status:'invalid' };
  try {
    const next = JSON.stringify(game);
    if (next.length > MAX_IMPORT_BYTES) return {status:'invalid'};
    if (slot==='manual') {
      const former = storage.getItem(SAVE_KEYS.manual);
      if (former!==null && parseGameJson(former).status==='ok' && former!==next) {
        try { storage.setItem(SAVE_KEYS.backup,former); }
        catch { return {status:'backup-failed'}; }
      }
    }
    storage.setItem(SAVE_KEYS[slot],next);
    return { status:'ok' };
  } catch { return { status:'unavailable' }; }
}
