import type { TestDef, TestResult } from '../types'

export function formatValue(v: number, unit: string): string {
  // Chronos longs (600 m, 1000 m…) : 105.3 s → 1'45"3
  if (unit === 's' && v >= 60) {
    const min = Math.floor(v / 60)
    const sec = v - min * 60
    const [whole, dec] = sec.toFixed(1).split('.')
    return `${min}'${whole.padStart(2, '0')}"${dec}`
  }
  const n = Number(v).toLocaleString('fr-CH', { maximumFractionDigits: 2 })
  return unit ? `${n} ${unit}` : n
}

/** "4,85" ou "4.85" → 4.85 ; "1'45" ou "1:45.3" → 105.3 s ; null si vide ou invalide */
export function parseValue(s: string): number | null {
  const raw = s.trim()
  const chrono = raw.match(/^(\d+)\s*['’:]\s*(\d{1,2}(?:[.,"]\d+)?)/)
  if (chrono) return Number(chrono[1]) * 60 + Number(chrono[2].replace(/[,"]/, '.'))
  const t = raw.replace(',', '.').replace(/[^\d.-]/g, '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function isBetter(test: TestDef, a: number, b: number): boolean {
  return test.higher_is_better ? a > b : a < b
}

export interface TestSummary {
  test: TestDef
  results: TestResult[] // du plus ancien au plus récent
  last: TestResult
  previous?: TestResult
  best: TestResult
  /** progression du dernier résultat par rapport au précédent : +1 mieux, -1 moins bien, 0 égal */
  trend: number
}

export function summarize(test: TestDef, all: TestResult[]): TestSummary | null {
  const results = all.filter((r) => r.test_id === test.id).sort((a, b) => a.date.localeCompare(b.date))
  if (results.length === 0) return null
  const last = results[results.length - 1]
  const previous = results[results.length - 2]
  const best = results.reduce((b, r) => (isBetter(test, r.value, b.value) ? r : b))
  const trend = !previous || previous.value === last.value ? 0 : isBetter(test, last.value, previous.value) ? 1 : -1
  return { test, results, last, previous, best, trend }
}

export function trendLabel(s: TestSummary): string {
  if (!s.previous) return ''
  const diff = Math.abs(s.last.value - s.previous.value)
  const d = diff.toLocaleString('fr-CH', { maximumFractionDigits: 2 })
  return s.trend > 0 ? `▲ ${d} ${s.test.unit}` : s.trend < 0 ? `▼ ${d} ${s.test.unit}` : '='
}
