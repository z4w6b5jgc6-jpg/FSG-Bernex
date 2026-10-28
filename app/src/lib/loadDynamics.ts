import type { ProjectionWeek } from './cycleProjection'
import type { Phase } from './season'

/** Egger 1997, figure 1 p.188 and text p.189. Historical relative indices,
 * explicitly not %1RM, weekly minutes, athlete targets or measured internal load. */
export const EGGER_REFERENCE = {
 extensive: { indices: [60, 80, 100, 30], label: 'Progressif · 3 + 1', purpose: 'Dominante volume, puis récupération' },
 intensive: { indices: [100, 80, 30], label: 'Dégressif · 2 + 1', purpose: 'Travail qualitatif, puis récupération' },
 explosive: { indices: [100, 80, 30], label: 'Dégressif · 2 + 1', purpose: 'Expression explosive, puis récupération' },
} as const
export function eggerStep(phase: Phase, index: number) {
 const model = EGGER_REFERENCE[phase as keyof typeof EGGER_REFERENCE]
 if (!model) return null
 const step = index % model.indices.length
 return { value: model.indices[step], step: step + 1, length: model.indices.length, recovery: step === model.indices.length - 1 }
}
export function referenceWeeks(weeks: ProjectionWeek[]) {
 const counts = new Map<string, number>()
 return weeks.map(week => {
  const index = counts.get(week.blockId) ?? 0
  counts.set(week.blockId, index + 1)
  return { week, reference: eggerStep(week.phase, index) }
 })
}
export type LoadMetric = 'reference' | 'minutes' | 'rpe' | 'load'
export function weekValue(week: ProjectionWeek, metric: Exclude<LoadMetric, 'reference'>): number | null {
 if (metric === 'minutes') return week.minutes
 if (metric === 'rpe') return week.rpe
 return week.minutes == null || week.rpe == null ? null : week.minutes * week.rpe
}
export interface LoadShape { direction: 'progressive' | 'degressive' | 'stable'; start: number; end: number; recovery: number | null; rpeStart: number | null; rpeEnd: number | null; recoveryRpe: number | null }
/** All numerical doses come from coach input, never the historical Egger indices. */
export function previewLoadShape(weeks: ProjectionWeek[], shape: LoadShape): ProjectionWeek[] {
 if (!weeks.length) throw new Error('Choisis un mésocycle.')
 const minute = (v: number) => Number.isInteger(v) && v >= 0 && v <= 3000
 const effort = (v: number | null) => v == null || Number.isFinite(v) && v >= 1 && v <= 10
 if (!minute(shape.start) || !minute(shape.end) || shape.recovery != null && !minute(shape.recovery)) throw new Error('Durées : nombres entiers de 0 à 3000 minutes.')
 if (shape.direction === 'progressive' && shape.start > shape.end || shape.direction === 'degressive' && shape.start < shape.end || shape.direction === 'stable' && shape.start !== shape.end) throw new Error('Les durées de début et de fin doivent correspondre à la direction choisie.')
 if (![shape.rpeStart, shape.rpeEnd, shape.recoveryRpe].every(effort) || (shape.rpeStart == null) !== (shape.rpeEnd == null)) throw new Error('Renseigne les deux efforts de développement entre 1 et 10, ou laisse les deux vides.')
 const isRecovery = (w: ProjectionWeek) => ['consolidation', 'recovery'].includes(w.role)
 if (weeks.some(isRecovery) && shape.recovery == null) throw new Error('Renseigne la durée des semaines d’allègement, y compris zéro si tu prévois du repos.')
 const development = weeks.filter(w => !isRecovery(w))
 if (development.length === 1 && (shape.start !== shape.end || shape.rpeStart !== shape.rpeEnd)) throw new Error('Une seule semaine de développement : les valeurs de début et de fin doivent être identiques.')
 let index = 0
 return weeks.map(w => {
  if (isRecovery(w)) return { ...w, minutes: shape.recovery!, rpe: shape.recoveryRpe ?? w.rpe }
  const ratio = development.length > 1 ? index++ / (development.length - 1) : 0
  return { ...w, minutes: Math.round(shape.start + (shape.end - shape.start) * ratio), rpe: shape.rpeStart == null ? w.rpe : Math.round((shape.rpeStart + (shape.rpeEnd! - shape.rpeStart) * ratio) * 10) / 10 }
 })
}
