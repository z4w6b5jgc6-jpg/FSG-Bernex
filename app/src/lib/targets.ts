// Temps cibles du plan du lundi : calculs repris du classeur « Course lundi 2026-2027 » (fiche de séance)
import type { PersonalRecord, Session, SessionPlan, Target, TestDef, TestResult } from '../types'
import { normText } from './importResults'
import { parseMark } from './sprint'

export const SUBGROUPS: Record<string, string> = { sprint: 'Sprint / Sauts / Haies', '400-800': '400 m - 800 m' }
export const RECORD_DISTANCES = [60, 80, 100, 400, 600, 800, 2000]

/** Allures de référence d'un athlète (m/s) et ses records (s) par distance */
export interface Paces {
  vmaKmh: number | null
  vma: number | null
  vms: number | null
  rva: number | null
  /** d'où vient la VMS */
  vmsFrom: string
  records: Record<number, number>
  /** référence sprint : record 80 m, sinon 100 m, sinon 60 m */
  ref: { d: number; t: number } | null
}

// Tests reconnus par leur nom (« Test VMA », « 30 m lancé », « 20 m lancé »)
export const isVmaTest = (t: TestDef) => /\bvma\b/i.test(t.name) && !/vms/i.test(t.name)
export const isFlyTest = (m: number) => (t: TestDef) => new RegExp(`\\b${m}\\s*m\\b`, 'i').test(t.name) && /lance/.test(normText(t.name))

/** Dernière valeur de l'athlète pour un test (la plus récente) */
function latest(athleteId: string, tests: TestDef[], results: TestResult[], pick: (t: TestDef) => boolean): number | null {
  const ids = new Set(tests.filter(pick).map((t) => t.id))
  const r = results.filter((x) => x.athlete_id === athleteId && ids.has(x.test_id) && x.value > 0).sort((a, b) => a.date.localeCompare(b.date)).pop()
  return r ? r.value : null
}

/** Meilleur record (s) par distance plate : « 80 m », « 600 m »… (haies, relais, marche exclus) */
export function recordsByDistance(athleteId: string, records: PersonalRecord[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const r of records) {
    if (r.athlete_id !== athleteId) continue
    const m = r.event.match(/^\s*(\d+)\s*m\b/i)
    if (!m || /haie|relais|marche|steeple|lance/.test(normText(r.event))) continue
    const sec = parseMark(r.mark)
    const d = Number(m[1])
    if (sec && (!out[d] || sec < out[d])) out[d] = sec
  }
  return out
}

export function pacesOf(athleteId: string, tests: TestDef[], results: TestResult[], records: PersonalRecord[]): Paces {
  const vmaKmh = latest(athleteId, tests, results, isVmaTest)
  const vma = vmaKmh ? vmaKmh / 3.6 : null
  const t30 = latest(athleteId, tests, results, isFlyTest(30))
  const t20 = latest(athleteId, tests, results, isFlyTest(20))
  const vms = t30 ? 30 / t30 : t20 ? 20 / t20 : null
  const recs = recordsByDistance(athleteId, records)
  const d = [80, 100, 60].find((x) => recs[x])
  return {
    vmaKmh, vma, vms, rva: vma && vms ? vms - vma : null,
    vmsFrom: t30 ? '30 m lancé' : t20 ? '20 m lancé' : '',
    records: recs, ref: d ? { d, t: recs[d] } : null,
  }
}

/** 87.9 → « 1:27.9 », 26.72 → « 0:26.7 » (format m:ss.0 du classeur) */
export function fmtTime(sec: number): string {
  const t = Math.round(sec * 10) / 10
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

const pctText = (p: number) => `${Math.round(p * 1000) / 10} %`

/** « 100 m à 100 % VMA », « 15"/15" à 105 % VMA », « 80 m à 88 % du record » */
export function targetLabel(t: Target): string {
  if (t.base === 'INT') return `${t.d}"/${t.d}" à ${pctText(t.pct)} VMA`
  if (t.base === 'REC') return `${t.d} m à ${pctText(t.pct)} du record`
  return `${t.d} m à ${pctText(t.pct)} ${t.base}`
}

export interface TargetResult {
  /** secondes (ou mètres pour INT), null = à l'effort */
  value: number | null
  text: string
}

/** Temps à réaliser (ou distance pour l'intermittent) ; « à l'effort » s'il manque une donnée */
export function computeTarget(t: Target, p: Paces): TargetResult {
  const effort = { value: null, text: 'à l’effort' }
  const { d, pct } = t
  if (!(d > 0) || !(pct > 0)) return effort
  let sec: number | null = null
  switch (t.base) {
    case 'INT': {
      if (!p.vma) return effort
      const m = Math.round(p.vma * pct * d)
      return { value: m, text: `${m} m` }
    }
    case 'VMA':
      if (p.vma) sec = d / (p.vma * pct)
      break
    case 'RVA':
      // + 0,5 s jusqu'à 150 m : départ arrêté
      if (p.vma && p.rva != null) sec = d / (p.vma + pct * p.rva) + (d <= 150 ? 0.5 : 0)
      break
    case 'REC': {
      let base: number | null = p.records[d] ?? null
      if (!base && p.ref) {
        const { d: dr, t: tr } = p.ref
        base = !p.vms ? (tr * d) / dr : d < dr ? tr - (dr - d) / p.vms : d > dr ? tr + (d - dr) / (0.95 * p.vms) : tr
      }
      if (base) sec = base / pct
      break
    }
  }
  return sec && sec > 0 && Number.isFinite(sec) ? { value: sec, text: fmtTime(sec) } : effort
}

/** Plan de la séance (null si séance ordinaire) */
export const planOf = (s: Session): SessionPlan | null => (s.plan && 'date' in s.plan && s.plan.date ? (s.plan as SessionPlan) : null)

/** Séances d'un plan triées par date puis sous-groupe (sprint d'abord) */
const order = (sg: string) => { const i = Object.keys(SUBGROUPS).indexOf(sg); return i < 0 ? 99 : i }
export const planSessions = (sessions: Session[]) =>
  sessions.filter((s) => planOf(s)).sort((a, b) => planOf(a)!.date.localeCompare(planOf(b)!.date) || order(planOf(a)!.subgroup) - order(planOf(b)!.subgroup))
