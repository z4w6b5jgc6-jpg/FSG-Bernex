import type { Cell, SheetIn } from './importResults'
import { normText } from './importResults'

/** Une semaine de la macro-planification (feuille « Macro » du coach) */
export interface MacroWeek {
  week: string; monday: string; holiday: string; competition: string
  phase: string; charge: number | null; volume: number | null; intensity: number | null
  mondayNote: string; wednesdayNote: string; note: string
}
export interface MacroPlan { source: string; imported: string; weeks: MacroWeek[]; micro: { phase: string; days: string[] }[] }

const iso = (v: Cell): string => {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return ''
  return m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}
const num = (v: Cell) => { const n = Number(String(v ?? '').replace(',', '.')); return String(v ?? '').trim() !== '' && Number.isFinite(n) ? n : null }
const txt = (v: Cell) => String(v ?? '').trim().replace(/^—$/, '')

/** Lit la feuille de macro (colonnes « Sem. », « Lundi », « Phase proposée »…) et, si présente, celle des microcycles */
export function parseMacro(sheets: SheetIn[], source: string): MacroPlan | null {
  let weeks: MacroWeek[] = []
  for (const sh of sheets) {
    const h = sh.rows.findIndex((r) => r.some((c) => normText(String(c ?? '')) === 'sem') && r.some((c) => /phase/i.test(String(c ?? ''))))
    if (h < 0) continue
    const head = sh.rows[h].map((c) => normText(String(c ?? '')))
    const col = (...keys: string[]) => { for (const k of keys) { const i = head.findIndex((x) => x.includes(k)); if (i >= 0) return i } return -1 }
    const c = {
      week: col('sem'), monday: col('lundi'), holiday: col('vacances', 'feries'), comp: col('competition'),
      phase: col('phaseproposee', 'phase'), charge: col('chargeproposee', 'charge'), volume: col('volume'), intensity: col('intensite'),
      mon: col('lundiajustement'), wed: col('mercrediajustement'), gap: col('ecart'),
    }
    const at = (r: Cell[], i: number) => (i >= 0 ? r[i] : null)
    weeks = sh.rows.slice(h + 1).map((r) => ({
      week: txt(at(r, c.week)), monday: iso(at(r, c.monday)), holiday: txt(at(r, c.holiday)), competition: txt(at(r, c.comp)),
      phase: txt(at(r, c.phase)), charge: num(at(r, c.charge)), volume: num(at(r, c.volume)), intensity: num(at(r, c.intensity)),
      mondayNote: txt(at(r, c.mon)), wednesdayNote: txt(at(r, c.wed)), note: txt(at(r, c.gap)),
    })).filter((w) => w.monday && w.phase)
    if (weeks.length) break
  }
  if (!weeks.length) return null
  const micro: MacroPlan['micro'] = []
  for (const sh of sheets) {
    const h = sh.rows.findIndex((r) => normText(String(r[0] ?? '')) === 'phase' && normText(String(r[1] ?? '')) === 'lundi')
    if (h < 0) continue
    for (const r of sh.rows.slice(h + 1)) if (txt(r[0]) && r.slice(1, 8).some((x) => txt(x))) micro.push({ phase: txt(r[0]), days: r.slice(1, 8).map(txt) })
  }
  return { source, imported: new Date().toISOString().slice(0, 10), weeks: weeks.slice(0, 80), micro: micro.slice(0, 12) }
}

/** Semaine de la macro qui contient cette date (lundi ≤ date < lundi + 7) */
export function weekOf(plan: MacroPlan | undefined, date: string): MacroWeek | undefined {
  return plan?.weeks.filter((w) => w.monday <= date).sort((a, b) => b.monday.localeCompare(a.monday))[0]
}

/** Couleur de phase (style Monday) : bleu général, orange spécifique, rouge compétition, gris allégé, vert reprise */
export function phaseTone(phase: string): 'blue' | 'orange' | 'red' | 'grey' | 'green' {
  const p = normText(phase)
  if (/allege|recup|repos|pause|transition|findesaison/.test(p)) return 'grey'
  if (/competition|affutage|smu1|smen/.test(p)) return 'red'
  if (/specifique|printemps/.test(p)) return 'orange'
  if (/reprise/.test(p)) return 'green'
  return 'blue'
}
