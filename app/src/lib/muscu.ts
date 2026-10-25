import type { PersonalRecord } from '../types'

export const EXERCISES = ['Squat', 'Demi-squat', 'Développé couché', 'Soulevé de terre', 'Épaulé', 'Arraché', 'Hip thrust', 'Fentes', 'Tirage']

export const isMuscu = (r: PersonalRecord) => r.kind === 'muscu'

/** « 80 kg × 3 » → { kg: 80, reps: 3 } */
export function parseLift(mark: string): { kg: number; reps: number | null } | null {
  const m = mark.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*kg(?:\s*[×x]\s*(\d+))?/i)
  return m ? { kg: Number(m[1]), reps: m[2] ? Number(m[2]) : null } : null
}

export const liftMark = (kg: number, reps: number | null) => `${String(kg).replace('.', ',')} kg${reps && reps > 1 ? ` × ${reps}` : ''}`

/** Charge maximale par exercice (la plus lourde, puis la plus récente) */
export function maxLifts(records: PersonalRecord[]): { event: string; best: PersonalRecord; all: PersonalRecord[] }[] {
  const kg = (r: PersonalRecord) => parseLift(r.mark)?.kg ?? 0
  const events = [...new Set(records.filter(isMuscu).map((r) => r.event))]
  return events.map((event) => {
    const all = records.filter((r) => isMuscu(r) && r.event === event).sort((a, b) => b.date.localeCompare(a.date))
    const best = all.reduce((b, r) => (kg(r) > kg(b) ? r : b))
    return { event, best, all }
  }).sort((a, b) => a.event.localeCompare(b.event))
}
