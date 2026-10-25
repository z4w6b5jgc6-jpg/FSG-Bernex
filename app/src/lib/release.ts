import type { Assignment } from '../types'
import { settings } from './settings'

/** Quand les athlètes voient le contenu d'une séance (règle du groupe, Réglages) — la base applique la même règle */
export type ReleaseRule = 'plan' | 'day' | 'hour' | 'start'
export const RELEASE_LABELS: Record<ReleaseRule, string> = {
  hour: '1 h avant le début de la séance',
  start: 'à l’heure du début de la séance',
  day: 'le jour de la séance (dès minuit)',
  plan: 'dès la planification',
}
export const releaseRule = (rule?: string): ReleaseRule => (rule ?? settings().release ?? 'hour') as ReleaseRule

/** Moment où le contenu devient visible (null = tout de suite) */
export function releaseAt(a: Pick<Assignment, 'date' | 'time'> & { visible_from?: string | null }, rule = releaseRule()): Date | null {
  if (rule === 'plan') return null
  const hhmm = /^\d{1,2}:\d{2}$/.test(a.time ?? '') ? a.time.padStart(5, '0') : null
  const at = rule === 'day' || !hhmm ? new Date(`${a.date}T00:00:00`) : new Date(`${a.date}T${hhmm}:00`)
  if (rule === 'hour' && hhmm) at.setHours(at.getHours() - 1)
  const early = a.visible_from ? new Date(a.visible_from) : null
  return early && early < at ? early : at
}

export const isReleased = (a: Parameters<typeof releaseAt>[0], rule?: ReleaseRule, now = Date.now()) => {
  const at = releaseAt(a, rule)
  return !at || at.getTime() <= now
}

/** « lundi 26 oct. à 17:00 » */
export const releaseText = (at: Date) =>
  `${at.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'short' })} à ${at.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`
