import type { Assignment, Session } from '../types'
import { validDate } from './season'

export const TRAINING_TYPES = [
  { name: 'Sprint', focus: 'Vitesse', icon: 'activity', subtitle: 'Accélération et vitesse' },
  { name: 'Haies', focus: 'Haies', icon: 'ruler', subtitle: 'Franchissement et rythme' },
  { name: 'Sauts', focus: 'Sauts', icon: 'arrowUpRight', subtitle: 'Longueur, hauteur et triple saut' },
  { name: 'Demi-fond', focus: 'Endurance', icon: 'timer', subtitle: 'Allures et endurance' },
  { name: 'Lancers', focus: 'Lancers', icon: 'target', subtitle: 'Poids, javelot et autres lancers' },
  { name: 'Musculation', focus: 'Musculation', icon: 'strength', subtitle: 'Force et renforcement' },
  { name: 'Récupération', focus: 'Récupération', icon: 'recovery', subtitle: 'Mobilité et retour au calme' },
  { name: 'Autres séances', focus: '', icon: 'list', subtitle: 'Technique et séances mixtes' },
] as const

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
/** Navigation only: explicit discipline in a title takes precedence over legacy imported theme labels.
 * Ambiguous mixed sessions stay in Autres; nothing is written back to the source. */
export function trainingType(session: Pick<Session, 'title' | 'focus'>): string {
  const text = normalize(session.title)
  const names = [
    ['Sprint', /\bsprint\b|\bvitesse\b/], ['Haies', /\bhaies?\b/],
    ['Sauts', /\bsauts?\b|\blongueur\b|\bhauteur\b|\btriple\b|\bperche\b/],
    ['Demi-fond', /\bdemi[ -]?fond\b|\bendurance\b|\b800\s*m\b|\b1500\s*m\b/],
    ['Lancers', /\blancers?\b|\bpoids\b|\bjavelot\b|\bdisque\b|\bmarteau\b/],
    ['Musculation', /\bmusculation\b|\bmuscu\b|\brenforcement\b|\bppg\b/],
    ['Récupération', /\brecuperation\b|\bmobilite\b/],
  ] as const
  const explicit = names.filter(([, re]) => re.test(text))
  if (explicit.length === 1) return explicit[0][0]
  if (explicit.length > 1) return 'Autres séances'
  if (session.focus === 'Renforcement') return 'Musculation'
  return TRAINING_TYPES.find(t => t.focus && t.focus === session.focus)?.name ?? 'Autres séances'
}

export interface LibraryRow { session: Session; assignment?: Assignment; date: string; source: 'scheduled' | 'imported' | 'undated' }
export function sessionRows(sessions: Session[], assignments: Assignment[]): LibraryRow[] {
  return sessions.flatMap<LibraryRow>(session => {
    const scheduled = assignments.filter(a => a.session_id === session.id)
    if (scheduled.length) return scheduled.map(assignment => ({session, assignment, date: validDate(assignment.date) ? assignment.date : '', source: 'scheduled' as const}))
    const date = session.plan?.date
    return [{session, date: date && validDate(date) ? date : '', source: date && validDate(date) ? 'imported' as const : 'undated' as const}]
  }).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.assignment?.time ?? '').localeCompare(b.assignment?.time ?? '') || a.session.title.localeCompare(b.session.title, 'fr'))
}
