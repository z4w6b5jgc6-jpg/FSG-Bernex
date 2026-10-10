// Indicateurs de lecture des tests, repris de la méthode du classeur « Suivi tests » :
// moyenne par contact, rapports de transition entre séquences de bonds, vitesse sur 20 m
// lancé et contrôle de l'écart entre essais. Repères de lecture, pas des normes.
import type { TestDef, TestResult } from '../types'
import { normText } from './importResults'

export const METHOD = {
  /** au-delà : troisième essai et contrôle des conditions */
  maxTrialGap: 0.03,
  /** (triple/3) ÷ mono */
  monoToTriple: 0.92,
  /** (penta/5) ÷ (triple/3) */
  tripleToPenta: 0.95,
  /** (déca/10) ÷ (penta/5) */
  pentaToDeca: 0.95,
}

type Key = 'sprint20' | 'mono' | 'triple' | 'penta' | 'deca'

/** Retrouve les tests de la batterie par leur nom (« 20 m lancé », « Monobond »…) */
function findTest(tests: TestDef[], key: Key): TestDef | undefined {
  const match: Record<Key, (n: string) => boolean> = {
    sprint20: (n) => n.startsWith('20mlance'),
    mono: (n) => n.startsWith('mono'),
    triple: (n) => n.startsWith('triple'),
    penta: (n) => n.startsWith('penta'),
    deca: (n) => n.startsWith('deca'),
  }
  return tests.find((t) => match[key](normText(t.name)))
}

function latest(results: TestResult[], test?: TestDef): TestResult | undefined {
  if (!test) return undefined
  return results.filter((r) => r.test_id === test.id).sort((a, b) => b.date.localeCompare(a.date))[0]
}

export interface Indicators {
  date: string | null
  sprint?: { best: number; kmh: number; trials: number[]; gap: number | null; alert: string }
  ratios: { monoTriple: number | null; triplePenta: number | null; pentaDeca: number | null }
  bondsReading: string
  focus: string
}

export function computeIndicators(tests: TestDef[], results: TestResult[]): Indicators | null {
  const r20 = latest(results, findTest(tests, 'sprint20'))
  const mono = latest(results, findTest(tests, 'mono'))?.value
  const triple = latest(results, findTest(tests, 'triple'))?.value
  const penta = latest(results, findTest(tests, 'penta'))?.value
  const deca = latest(results, findTest(tests, 'deca'))?.value
  if (!r20 && mono == null && triple == null) return null

  let sprint: Indicators['sprint']
  let alert = 'Vitesse à mesurer'
  if (r20) {
    const trials = r20.trials.length ? r20.trials : [r20.value]
    const best = Math.min(...trials)
    const gap = trials.length >= 2 ? (Math.max(...trials) - best) / best : null
    alert = trials.length < 2 ? 'Essai 2 requis' : gap! > METHOD.maxTrialGap ? 'Écart > 3 % : 3e essai' : 'Essais cohérents'
    sprint = { best, kmh: 72 / best, trials, gap, alert }
  }

  const monoTriple = mono && triple ? triple / 3 / mono : null
  const triplePenta = triple && penta ? penta / 5 / (triple / 3) : null
  const pentaDeca = penta && deca ? deca / 10 / (penta / 5) : null

  const bondsReading =
    mono == null || triple == null || penta == null || deca == null ? 'Bonds incomplets'
    : monoTriple! < METHOD.monoToTriple ? 'Transition mono → triple à travailler'
    : triplePenta! < METHOD.tripleToPenta ? 'Maintien triple → penta à travailler'
    : pentaDeca! < METHOD.pentaToDeca ? 'Maintien penta → déca à travailler'
    : 'Chaîne de bonds homogène'

  const focus =
    alert === 'Vitesse à mesurer' ? 'Mesurer le 20 m lancé'
    : alert !== 'Essais cohérents' ? 'Confirmer le sprint'
    : monoTriple != null && monoTriple < METHOD.monoToTriple ? 'Réactivité courte et technique d’appui'
    : triplePenta != null && triplePenta < METHOD.tripleToPenta ? 'Maintien des impulsions courtes'
    : pentaDeca != null && pentaDeca < METHOD.pentaToDeca ? 'Maintien postural sur bonds longs'
    : 'Développement équilibré force-vitesse'

  return { date: r20?.date ?? null, sprint, ratios: { monoTriple, triplePenta, pentaDeca }, bondsReading, focus }
}

export const fmt = (v: number, digits = 2) => v.toLocaleString('fr-CH', { minimumFractionDigits: digits, maximumFractionDigits: digits })

// ---------------------------------------------------------------------
// 2e méthode (classeur « Tests d'aptitudes U18 — sprint & sauts ») :
// écarts aux projections entre bonds et profil sprint (40 m départ arrêté
// comparé au sprint lancé). Repères internes, pas des normes.
// ---------------------------------------------------------------------

export const PROJECTION = {
  /** triple projeté = a × mono + b, etc. */
  monoTriple: [1.386, 3.204],
  triplePenta: [1.433, 1.693],
  pentaDeca: [1.776, 2.69],
  /** écart « à surveiller » / « très contrasté » */
  marked: 0.05,
  strong: 0.1,
  /** balance accélération – vitesse lancée (écarts-types) */
  sprintBalance: 0.5,
}

export interface BondsProjection {
  gaps: { label: string; observed: number; projected: number; gap: number }[]
  meanGap: number | null
  profile: 'Profil homogène' | 'À surveiller' | 'Très contrasté' | null
}

export function bondsProjection(tests: TestDef[], results: TestResult[]): BondsProjection | null {
  const v = (k: Key) => latest(results, findTest(tests, k))?.value
  const mono = v('mono'), triple = v('triple'), penta = v('penta'), deca = v('deca')
  const gaps: BondsProjection['gaps'] = []
  const add = (label: string, from: number | undefined, to: number | undefined, [a, b]: number[]) => {
    if (from == null || to == null) return
    const projected = from * a + b
    gaps.push({ label, observed: to, projected, gap: to / projected - 1 })
  }
  add('Mono → triple', mono, triple, PROJECTION.monoTriple)
  add('Triple → penta', triple, penta, PROJECTION.triplePenta)
  add('Penta → déca', penta, deca, PROJECTION.pentaDeca)
  if (gaps.length === 0) return null
  const maxAbs = Math.max(...gaps.map((g) => Math.abs(g.gap)))
  return {
    gaps,
    meanGap: gaps.reduce((s, g) => s + g.gap, 0) / gaps.length,
    profile: maxAbs >= PROJECTION.strong ? 'Très contrasté' : maxAbs >= PROJECTION.marked ? 'À surveiller' : 'Profil homogène',
  }
}

export interface SprintProfile {
  t20?: number; t30?: number; t40?: number
  v20?: number; v30?: number; v40?: number
  rep20?: number; rep30?: number
  /** v30 / v20 */
  maintain?: number
  /** t40 − 4/3 × t30 lancé */
  startCost?: number
  z40?: number; zFlying?: number; balance?: number
  profile: 'Accélération relativement forte' | 'Vitesse lancée dominante' | 'Profil sprint équilibré' | 'Données incomplètes'
}

/** Score standardisé (z) d'un temps parmi les athlètes testés le même jour : positif = plus rapide que la moyenne */
function zScore(all: TestResult[], r: TestResult | undefined): number | undefined {
  if (!r) return undefined
  const cohort = all.filter((x) => x.test_id === r.test_id && x.date === r.date && x.value > 0).map((x) => x.value)
  if (cohort.length < 2) return undefined
  const mean = cohort.reduce((s, x) => s + x, 0) / cohort.length
  const sd = Math.sqrt(cohort.reduce((s, x) => s + (x - mean) ** 2, 0) / (cohort.length - 1))
  return sd > 0 ? (mean - r.value) / sd : undefined
}

export function sprintProfile(tests: TestDef[], mine: TestResult[], all: TestResult[]): SprintProfile | null {
  const find30 = tests.find((t) => normText(t.name).startsWith('30mlance'))
  const find40 = tests.find((t) => normText(t.name).startsWith('40m'))
  const r20 = latest(mine, findTest(tests, 'sprint20')), r30 = latest(mine, find30), r40 = latest(mine, find40)
  if (!r30 && !r40) return null
  const rep = (r?: TestResult) => (r && r.trials.length >= 2 ? Math.abs(r.trials[0] - r.trials[1]) : undefined)
  const p: SprintProfile = { profile: 'Données incomplètes' }
  p.t20 = r20?.value; p.t30 = r30?.value; p.t40 = r40?.value
  if (p.t20) p.v20 = 72 / p.t20
  if (p.t30) p.v30 = 108 / p.t30
  if (p.t40) p.v40 = 144 / p.t40
  p.rep20 = rep(r20); p.rep30 = rep(r30)
  if (p.v20 && p.v30) p.maintain = p.v30 / p.v20
  if (p.t40 && p.t30) p.startCost = p.t40 - (4 / 3) * p.t30
  p.z40 = zScore(all, r40)
  const zs = [zScore(all, r20), zScore(all, r30)].filter((z): z is number => z != null)
  p.zFlying = zs.length ? zs.reduce((s, z) => s + z, 0) / zs.length : undefined
  if (p.z40 != null && p.zFlying != null) p.balance = p.z40 - p.zFlying
  if (p.t20 && p.t30 && p.t40 && p.balance != null) {
    p.profile = p.balance >= PROJECTION.sprintBalance ? 'Accélération relativement forte'
      : p.balance <= -PROJECTION.sprintBalance ? 'Vitesse lancée dominante' : 'Profil sprint équilibré'
  }
  return p
}
