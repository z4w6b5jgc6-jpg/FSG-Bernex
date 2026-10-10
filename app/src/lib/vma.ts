// Allures d'entraînement calculées à partir de la VMA de l'athlète.
import type { TestDef, TestResult } from '../types'
import { normText } from './importResults'

export function latestVma(tests: TestDef[], results: TestResult[]): TestResult | null {
  const ids = new Set(tests.filter((t) => normText(t.name).includes('vma')).map((t) => t.id))
  return results.filter((r) => ids.has(r.test_id)).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
}

/** Temps (s) pour parcourir `meters` à `pct` % de la VMA */
export function paceSeconds(vmaKmh: number, pct: number, meters: number): number {
  return meters / ((vmaKmh * pct) / 100 / 3.6)
}

/** Distance (m) parcourue en `seconds` à `pct` % de la VMA */
export function distanceIn(vmaKmh: number, pct: number, seconds: number): number {
  return ((vmaKmh * pct) / 100 / 3.6) * seconds
}

/** 45 → 45" ; 100 → 1'40 ; 245.6 → 4'06 */
export function formatTime(sec: number): string {
  const s = Math.round(sec)
  if (s < 60) return `${s}"`
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}`
}

export const ZONES = [
  { pct: 70, label: 'Footing, récupération' },
  { pct: 80, label: 'Endurance active' },
  { pct: 90, label: 'Seuil, tempo' },
  { pct: 100, label: 'VMA' },
  { pct: 105, label: 'VMA courte, allure 800 m' },
]

/** « 90% VMA », « 100 % de la VMA » → 90 / 100 */
export function vmaPercent(text: string): number | null {
  const m = text.match(/(\d{2,3})\s*%\s*(?:de\s+)?(?:la\s+)?vma/i)
  return m ? Number(m[1]) : null
}

/** « 400 m », « 1,5 km » → mètres */
export function parseMeters(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i)
  if (!m) return null
  const v = Number(m[1].replace(',', '.'))
  return m[2].toLowerCase() === 'km' ? v * 1000 : v
}

/** « 30" », « 30"/30" », « 1' », « 3 min » → secondes de l'effort */
export function parseEffortSeconds(text: string): number | null {
  const sec = text.match(/^\s*(\d+)\s*(?:"|”|s\b|sec)/i)
  if (sec) return Number(sec[1])
  const min = text.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:'|’|min)/i)
  return min ? Number(min[1].replace(',', '.')) * 60 : null
}
