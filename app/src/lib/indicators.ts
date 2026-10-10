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
