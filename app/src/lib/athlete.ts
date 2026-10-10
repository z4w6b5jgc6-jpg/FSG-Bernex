import type { Assignment, Athlete, Feedback, PersonalRecord, Tip, Wellness } from '../types'
import { BUILTIN_TIPS } from '../data/tips'
import { addDays, athletesFor, todayISO } from './utils'

export const AVATARS = ['🏃', '🏃‍♀️', '⚡', '🔥', '🚀', '🦊', '🐆', '🦅', '🐺', '🦋', '🐬', '💪', '🌟', '🎯', '🏹', '🥇', '👟', '🌈', '🍀', '😎']
/** Couleur du club (par défaut) puis couleurs au choix de l'athlète */
export const CLUB_COLOR = '#1a8526'
/** Ancienne couleur par défaut (orange) : affichée comme la couleur du club */
const LEGACY_DEFAULT = '#e85d04'
export const ACCENTS = [CLUB_COLOR, '#ea580c', '#dc2626', '#db2777', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#16a34a', '#ca8a04', '#475569']

/** Applique la couleur choisie par l'athlète à toute l'app */
export function applyAccent(color: string | null) {
  const root = document.documentElement
  const custom = color && color !== LEGACY_DEFAULT && color !== CLUB_COLOR ? color : null
  if (custom) root.style.setProperty('--primary', custom)
  else root.style.removeProperty('--primary')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', custom ?? '#22a02f')
}

/** Couleur affichée comme sélectionnée dans le profil */
export function shownColor(color: string | null | undefined): string {
  return !color || color === LEGACY_DEFAULT ? CLUB_COLOR : color
}

export function myAssignments(assignments: Assignment[], me: Athlete): Assignment[] {
  return assignments.filter((a) => athletesFor(a, [me]).length > 0)
}

/** Nombre de séances passées consécutives (les plus récentes) avec un retour « faite » */
export function feedbackStreak(mine: Assignment[], feedback: Feedback[]): number {
  const today = todayISO()
  const past = mine.filter((a) => a.date <= today).sort((a, b) => b.date.localeCompare(a.date))
  let n = 0
  for (const a of past) {
    const f = feedback.find((x) => x.assignment_id === a.id)
    if (f?.completed) n++
    else if (a.date === today && !f) continue // la séance du jour n'est pas encore faite : elle ne casse pas la série
    else break
  }
  return n
}

/** Nombre de jours consécutifs (jusqu'à aujourd'hui ou hier) avec un check-in */
export function checkinStreak(wellness: Wellness[]): number {
  const dates = new Set(wellness.map((w) => w.date))
  let d = dates.has(todayISO()) ? todayISO() : addDays(todayISO(), -1)
  let n = 0
  while (dates.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export interface Badge { id: string; emoji: string; title: string; desc: string; earned: boolean }

export function computeBadges(p: {
  athlete: Athlete
  done: number
  feedbackCount: number
  streak: number
  records: PersonalRecord[]
  wellness: Wellness[]
}): Badge[] {
  const profileComplete = !!(p.athlete.goals && p.athlete.events && p.athlete.avatar !== '🏃')
  const b = (id: string, emoji: string, title: string, desc: string, earned: boolean) => ({ id, emoji, title, desc, earned })
  return [
    b('first', '🎉', 'Premier retour', 'Donner ton ressenti après une séance', p.feedbackCount >= 1),
    b('s5', '🥉', '5 séances', '5 séances réalisées', p.done >= 5),
    b('s15', '🥈', '15 séances', '15 séances réalisées', p.done >= 15),
    b('s30', '🥇', '30 séances', '30 séances réalisées', p.done >= 30),
    b('streak3', '🔥', 'En feu', '3 séances de suite avec retour', p.streak >= 3),
    b('streak10', '☄️', 'Inarrêtable', '10 séances de suite avec retour', p.streak >= 10),
    b('record', '🏅', 'Recordman', 'Ajouter un premier record perso', p.records.length >= 1),
    b('records5', '📈', 'Collectionneur', '5 records enregistrés', p.records.length >= 5),
    b('checkin', '🌙', 'À l’écoute', 'Faire 7 check-ins bien-être', p.wellness.length >= 7),
    b('sleep', '😴', 'Gros dormeur', '5 nuits de 8 h ou plus', p.wellness.filter((w) => (w.sleep_hours ?? 0) >= 8).length >= 5),
    b('profile', '✨', 'Mon style', 'Compléter ton profil (avatar, disciplines, objectif)', profileComplete),
    b('fav', '📚', 'Curieux', 'Mettre 3 conseils en favoris', p.athlete.favorite_tips.length >= 3),
  ]
}

export function allTips(custom: Tip[]): Tip[] {
  return [...custom, ...BUILTIN_TIPS]
}

/** Un conseil différent chaque jour */
export function tipOfTheDay(tips: Tip[]): Tip | null {
  if (tips.length === 0) return null
  const day = Math.floor(Date.now() / 86_400_000)
  return tips[day % tips.length]
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Salut'
  return 'Bonsoir'
}
