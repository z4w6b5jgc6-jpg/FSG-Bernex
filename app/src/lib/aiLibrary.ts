import type { EvidenceRecord } from '../types'

/** Publication retenue par le coach, telle qu'envoyée à l'IA comme référence (texte public, aucune donnée d'athlète) */
export interface LibraryRef { id: string; title: string; year: number; journal: string; note: string; summary: string }

export const MAX_LIBRARY = 10

export function libraryForAI(records: EvidenceRecord[]): LibraryRef[] {
  return records.filter((r) => r.reviewed && r.paper?.id).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, MAX_LIBRARY)
    .map((r) => ({
      id: `pub-${String(r.paper.id).slice(0, 30)}`, title: String(r.paper.title ?? '').slice(0, 400), year: Number(r.paper.year) || 0,
      journal: String(r.paper.journal ?? '').slice(0, 200), note: (r.review_note ?? '').slice(0, 800), summary: String(r.paper.abstract ?? '').slice(0, 1500),
    }))
}

/** Contrôle côté serveur : forme et tailles bornées, sinon la liste est ignorée */
export function parseLibrary(value: unknown): LibraryRef[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_LIBRARY).filter((l): l is LibraryRef => !!l && typeof l === 'object'
    && typeof l.id === 'string' && /^pub-[\w.-]{1,30}$/.test(l.id) && typeof l.title === 'string' && typeof l.journal === 'string'
    && typeof l.note === 'string' && typeof l.summary === 'string' && typeof l.year === 'number')
    .map((l) => ({ id: l.id, title: l.title.slice(0, 400), year: l.year, journal: l.journal.slice(0, 200), note: l.note.slice(0, 800), summary: l.summary.slice(0, 1500) }))
}
