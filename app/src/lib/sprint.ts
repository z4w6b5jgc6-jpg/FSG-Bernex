// Équivalences de temps en sprint, d'après le tableau « Sprint 3.0 » de Sylvain Charlet (Féchain AC),
// onglet « Équivalences » : 25 niveaux, temps avec départ de 30 à 300 m.
import type { PersonalRecord, TestDef, TestResult } from '../types'
import { normText } from './importResults'

export const EQ_DISTANCES = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 150, 200, 250, 300]
// Une ligne par niveau (1 = le plus rapide), temps en secondes dans l'ordre de EQ_DISTANCES
const ROWS: number[][] = `
3.4 4.4 5.3 6.2 7.1 8.0 8.9 9.8 10.8 11.8 14.9 20.1 25.6 31.3
3.5 4.5 5.4 6.3 7.2 8.1 9.0 10.0 11.0 12.1 15.2 20.6 26.3 32.4
3.5 4.5 5.5 6.4 7.3 8.3 9.2 10.2 11.2 12.3 15.5 21.1 27.0 33.3
3.6 4.6 5.6 6.5 7.5 8.5 9.4 10.4 11.5 12.6 15.8 21.5 27.7 34.2
3.7 4.7 5.7 6.7 7.7 8.6 9.5 10.6 11.7 12.8 16.1 22.0 28.4 35.1
3.7 4.7 5.7 6.8 7.8 8.7 9.7 10.8 11.9 13.0 16.4 22.5 29.1 36.0
3.8 4.8 5.8 6.9 7.9 8.8 9.8 11.0 12.1 13.2 16.7 23.0 29.8 36.9
3.8 4.8 5.9 7.0 8.0 9.0 10.0 11.2 12.3 13.5 17.1 23.5 30.5 37.9
3.9 4.9 6.0 7.1 8.1 9.1 10.2 11.4 12.6 13.8 17.5 24.0 31.2 38.8
3.9 5.0 6.1 7.2 8.2 9.3 10.4 11.6 12.8 14.0 17.9 24.5 31.9 39.7
4.0 5.1 6.2 7.3 8.4 9.5 10.6 11.8 13.0 14.2 18.3 25.0 32.6 40.6
4.0 5.1 6.2 7.4 8.5 9.7 10.8 12.0 13.2 14.4 18.6 25.5 33.3 41.6
4.1 5.2 6.3 7.5 8.6 9.8 11.0 12.2 13.5 14.7 19.0 26.0 34.0 42.5
4.1 5.3 6.4 7.6 8.7 9.9 11.1 12.4 13.7 15.0 19.4 26.5 34.7 43.5
4.2 5.3 6.5 7.7 8.9 10.1 11.3 12.6 13.9 15.2 19.8 27.1 35.4 44.4
4.2 5.4 6.6 7.8 9.0 10.2 11.5 12.8 14.1 15.4 20.1 27.6 36.1 45.4
4.2 5.4 6.6 7.9 9.1 10.4 11.7 13.0 14.3 15.6 20.5 28.1 36.8 46.4
4.3 5.5 6.7 8.0 9.3 10.6 11.9 13.2 14.6 15.9 20.8 28.6 37.5 47.3
4.3 5.5 6.8 8.1 9.4 10.7 12.0 13.4 14.8 16.2 21.1 29.1 38.2 48.3
4.3 5.6 6.9 8.2 9.6 10.9 12.2 13.6 15.0 16.4 21.4 29.6 39.0 49.2
4.4 5.6 6.9 8.3 9.7 11.1 12.4 13.8 15.3 16.7 21.7 30.0 39.7 50.1
4.4 5.7 7.0 8.4 9.8 11.2 12.6 14.0 15.5 17.0 22.0 30.5 40.4 50.9
4.4 5.8 7.1 8.5 9.9 11.4 12.8 14.2 15.7 17.2 22.3 31.0 41.1 51.8
4.5 5.8 7.2 8.6 10.0 11.5 13.0 14.4 15.9 17.4 22.6 31.6 41.8 52.7
4.5 5.9 7.3 8.7 10.1 11.6 13.1 14.6 16.1 17.7 23.0 32.1 42.6 53.6`
  .trim().split('\n').map((l) => l.trim().split(/\s+/).map(Number))
const MAX_LEVEL = ROWS.length

/** Temps d'un niveau (fractionnaire) sur une colonne du tableau ; au-delà du tableau, prolongement linéaire */
function rowTime(level: number, col: number): number {
  const l = Math.min(Math.max(level, 1), MAX_LEVEL)
  const i = Math.min(Math.floor(l), MAX_LEVEL - 1)
  const base = ROWS[i - 1][col] + (ROWS[i][col] - ROWS[i - 1][col]) * (l - i)
  if (level > MAX_LEVEL) return base + ((ROWS[MAX_LEVEL - 1][col] - ROWS[MAX_LEVEL - 6][col]) / 5) * (level - MAX_LEVEL)
  if (level < 1) return base - ((ROWS[5][col] - ROWS[0][col]) / 5) * (1 - level)
  return base
}

/** Temps probable (s) au niveau donné sur une distance de 30 à 300 m (interpolée entre les colonnes) */
export function timeAt(level: number, meters: number): number | null {
  if (meters < 30 || meters > 300) return null
  const j = EQ_DISTANCES.findIndex((d) => d >= meters)
  if (EQ_DISTANCES[j] === meters) return rowTime(level, j)
  const d0 = EQ_DISTANCES[j - 1], d1 = EQ_DISTANCES[j]
  return rowTime(level, j - 1) + ((rowTime(level, j) - rowTime(level, j - 1)) * (meters - d0)) / (d1 - d0)
}

/** Niveau (fractionnaire, 1 = le plus rapide) correspondant à un temps sur une distance */
export function levelFor(meters: number, seconds: number): number | null {
  if (timeAt(1, meters) == null || !(seconds > 0)) return null
  let lo = -10, hi = 60 // recherche par dichotomie : le temps augmente avec le niveau
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2
    if (timeAt(mid, meters)! < seconds) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** « 8"10 », « 8.10 », « 8,1 », « 1'05"3 » → secondes */
export function parseMark(s: string): number | null {
  const t = s.trim().replace(/\s/g, '')
  let m = t.match(/^(\d+)['’:](\d{1,2})(?:["”.,](\d+))?$/)
  if (m) return Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(`0.${m[3]}`) : 0)
  m = t.match(/^(\d+)(?:["”.,](\d+))?$/)
  return m ? Number(m[1]) + (m[2] ? Number(`0.${m[2]}`) : 0) : null
}

/** 13.62 → 13"62 (estimations : 1 décimale, comme le tableau) */
export function formatSprint(sec: number, digits = 2): string {
  if (sec >= 60) return `${Math.floor(sec / 60)}'${(sec % 60).toFixed(1).padStart(4, '0').replace('.', '"')}`
  return sec.toFixed(digits).replace('.', '"')
}

export interface SprintRef {
  level: number
  meters: number
  seconds: number
  date: string
  source: string
}

/**
 * Niveau de référence de l'athlète : son meilleur résultat avec départ (tests « départ arrêté »,
 * records de compétition 30–300 m). Les temps lancés ne sont pas comparables au tableau.
 */
export function sprintReference(tests: TestDef[], results: TestResult[], records: PersonalRecord[]): SprintRef | null {
  const cands: SprintRef[] = []
  for (const t of tests) {
    const n = normText(t.name)
    const m = t.name.match(/(\d+)\s*m\b/i)
    if (!m || t.higher_is_better || /lance|haie|relais/.test(n) || !/(arret|depart|start)/.test(n)) continue
    for (const r of results.filter((x) => x.test_id === t.id)) {
      const level = levelFor(Number(m[1]), r.value)
      if (level != null) cands.push({ level, meters: Number(m[1]), seconds: r.value, date: r.date, source: t.name })
    }
  }
  for (const r of records) {
    const n = normText(r.event)
    const m = r.event.match(/^\s*(\d+)\s*m\b/i)
    if (!m || /haie|relais|lance|marche|steeple/.test(n)) continue
    const sec = parseMark(r.mark)
    const level = sec ? levelFor(Number(m[1]), sec) : null
    if (level != null && sec) cands.push({ level, meters: Number(m[1]), seconds: sec, date: r.date, source: `${r.event}${r.competition ? ` (${r.competition})` : ''}` })
  }
  return cands.sort((a, b) => a.level - b.level)[0] ?? null
}

/** Temps cible sur `meters` à `pct` % de la vitesse (le temps s'allonge quand l'intensité baisse) */
export function targetTime(level: number, meters: number, pct = 100): number | null {
  const t = timeAt(level, meters)
  return t == null ? null : t / (pct / 100)
}

/** Meilleur 40 m départ arrêté de l'athlète (référence du tableau des allures) */
export function best40(tests: TestDef[], results: TestResult[]): SprintRef | null {
  const ids = new Set(tests.filter((t) => /\b40\s*m\b/i.test(t.name) && /arret|depart/.test(normText(t.name)) && !/lance/.test(normText(t.name))).map((t) => t.id))
  const best = results.filter((r) => ids.has(r.test_id) && r.value > 0).sort((a, b) => a.value - b.value)[0]
  if (!best) return null
  const level = levelFor(40, best.value)
  return level == null ? null : { level, meters: 40, seconds: best.value, date: best.date, source: '40 m départ arrêté' }
}
