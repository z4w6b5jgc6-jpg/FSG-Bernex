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

/** Convertit l'heure civile de Genève, même si l'appareil est dans un autre fuseau. */
export function genevaTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const civil = Date.UTC(y, m - 1, d, h, min)
  let instant = civil
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]))
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute)
    instant += civil - shown
  }
  return new Date(instant)
}

/** Moment où le contenu devient visible (null = tout de suite) */
export function releaseAt(a: Pick<Assignment, 'date' | 'time'> & { visible_from?: string | null }, rule = releaseRule()): Date | null {
  if (rule === 'plan') return null
  const hhmm = /^\d{1,2}:\d{2}$/.test(a.time ?? '') ? a.time.padStart(5, '0') : null
  const at = genevaTime(a.date, rule === 'day' || !hhmm ? '00:00' : hhmm)
  if (rule === 'hour' && hhmm) at.setTime(at.getTime() - 3600000)
  const early = a.visible_from ? new Date(a.visible_from) : null
  return early && early < at ? early : at
}

export const isReleased = (a: Parameters<typeof releaseAt>[0], rule?: ReleaseRule, now = Date.now()) => {
  const at = releaseAt(a, rule)
  return !at || at.getTime() <= now
}

/** « lundi 26 oct. à 17:00 » */
export const releaseText = (at: Date) =>
  `${at.toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'short' })} à ${at.toLocaleTimeString('fr-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' })}`
