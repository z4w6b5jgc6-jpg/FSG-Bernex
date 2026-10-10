// Lecture d'un classeur de résultats de tests (Excel / CSV) : détection des feuilles,
// des colonnes et des athlètes. Logique pure, sans interface.
import type { Athlete, TestDef } from '../types'
import type { TestTemplate } from '../data/defaults'

export type Cell = string | number | boolean | Date | null
export interface SheetIn { name: string; rows: Cell[][] }

export const normText = (t: unknown) =>
  String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '')

// ----- Colonnes -----

export type ColRole =
  | { kind: 'ignore' }
  | { kind: 'name' } | { kind: 'first' } | { kind: 'last' }
  | { kind: 'age' } | { kind: 'year' } | { kind: 'events' } | { kind: 'sex' }
  | { kind: 'test'; test: string } // nom du test (existant ou à créer)
  | { kind: 'report'; field: 'strengths' | 'priority' | 'training' | 'message' | 'private' }

const COMPUTED = /^(meilleur|ecart|vitesse|alerte|lecture|profil|axesugg|rapport|ratio|moyenne|total|rang|resultatsbonds)/

/** Rapproche un en-tête de colonne d'un test (« Mono (m) » → Monobond, « 20 m essai 1 » → 20 m lancé) */
export function guessTest(header: string, tests: { name: string }[]): string | null {
  const h = normText(header)
  const exact = tests.find((t) => normText(t.name) === h)
  if (exact) return exact.name
  const rules: [RegExp, RegExp][] = [
    [/^mono/, /^mono/], [/^triple/, /^triple/], [/^penta/, /^penta/], [/^deca/, /^deca/],
    [/^20m/, /^20mlance/], [/^30m/, /^30mlance/], [/^40m/, /^40m/], [/vma|vameval|leger/, /vma/],
    [/^600m/, /^600m/], [/^1000m/, /^1000m/], [/medecine.*arriere|mbarriere/, /medecineballarriere/],
    [/medecine.*avant|mbavant/, /medecineballavant/], [/gainage/, /gainage/],
  ]
  for (const [hr, tr] of rules) {
    if (hr.test(h)) {
      const t = tests.find((x) => tr.test(normText(x.name)))
      if (t) return t.name
    }
  }
  const contains = tests.find((t) => normText(t.name).length > 3 && h.startsWith(normText(t.name)))
  return contains?.name ?? null
}

export function guessRole(header: string, tests: { name: string }[]): ColRole {
  const h = normText(header)
  if (!h) return { kind: 'ignore' }
  if (/^(athlete|nomcomplet|nometprenom|prenomnom|nomprenom)/.test(h)) return { kind: 'name' }
  if (/^prenom/.test(h)) return { kind: 'first' }
  if (/^nom(defamille)?$/.test(h)) return { kind: 'last' }
  if (/^age/.test(h) && !h.includes('specialite')) return { kind: 'age' }
  if (/annee|naissance/.test(h)) return { kind: 'year' }
  if (/^(specialite|discipline|epreuve)/.test(h)) return { kind: 'events' }
  if (/^(sexe|genre)$/.test(h)) return { kind: 'sex' }
  if (/^pointsforts/.test(h)) return { kind: 'report', field: 'strengths' }
  if (/^axeprioritaire/.test(h)) return { kind: 'report', field: 'priority' }
  if (/^typedentrainement|^entrainement/.test(h)) return { kind: 'report', field: 'training' }
  if (/feedback|message|commentaireathlete/.test(h)) return { kind: 'report', field: 'message' }
  if (/^(positionnement|vigilance|remarquecoach|notecoach)/.test(h)) return { kind: 'report', field: 'private' }
  // Colonnes calculées par le classeur (rapports « Triple/mono », « Meilleur 20 m », « Vitesse »…)
  if (header.includes('/') || COMPUTED.test(h)) return { kind: 'ignore' }
  const t = guessTest(header, tests)
  return t ? { kind: 'test', test: t } : { kind: 'ignore' }
}

// ----- Feuilles -----

export interface ParsedSheet {
  name: string
  headerRow: number
  headers: string[]
  roles: ColRole[]
  rows: Cell[][]
  /** nombre de colonnes de résultats / de bilan reconnues */
  testCols: number
  reportCols: number
}

/** Feuille la plus probable pour les résultats et pour les bilans */
export function pickSheets(sheets: ParsedSheet[]): { results: number; reports: number } {
  const best = (score: (s: ParsedSheet) => number) => {
    let i = -1, top = 0
    sheets.forEach((s, k) => { if (s.rows.length && score(s) > top) { top = score(s); i = k } })
    return i
  }
  return {
    results: best((s) => (s.reportCols ? s.testCols / 10 : s.testCols)),
    reports: best((s) => s.reportCols),
  }
}

/** Trouve la ligne d'en-tête : la première ligne qui contient une colonne « athlète » / « prénom » / « nom » */
export function parseSheet(sheet: SheetIn, tests: { name: string }[]): ParsedSheet {
  let headerRow = sheet.rows.findIndex((r) => r.some((c) => /^(athlete|prenom|nom|nomcomplet)/.test(normText(c))) && r.filter((c) => c != null && c !== '').length >= 2)
  if (headerRow < 0) headerRow = 0
  const headers = (sheet.rows[headerRow] ?? []).map((c) => String(c ?? '').trim())
  const roles = headers.map((h) => guessRole(h, tests))
  // Lignes du tableau : jusqu'à la première ligne sans nom (les notes sous le tableau sont ignorées)
  const nameCol = roles.findIndex((x) => x.kind === 'name' || x.kind === 'first')
  const rows: Cell[][] = []
  for (const r of sheet.rows.slice(headerRow + 1)) {
    const name = nameCol >= 0 ? cellText(r[nameCol]) : ''
    if (!name) { if (rows.length) break; continue }
    if (name.length > 40) break
    rows.push(r)
  }
  const hasName = roles.some((r) => r.kind === 'name' || r.kind === 'first')
  const testCols = roles.filter((r) => r.kind === 'test').length
  const reportCols = roles.filter((r) => r.kind === 'report').length
  return { name: sheet.name, headerRow, headers, roles, rows, testCols: hasName ? testCols : 0, reportCols: hasName ? reportCols : 0 }
}

// ----- Date -----

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']

/** Cherche une date dans les cellules (« tests du 23 septembre 2026 », « 23.09.2026 ») */
export function findDate(sheets: SheetIn[]): string | null {
  for (const s of sheets) {
    for (const row of s.rows.slice(0, 10)) {
      for (const c of row) {
        if (c instanceof Date) return c.toISOString().slice(0, 10)
        const t = String(c ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        const m1 = t.match(/(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/)
        if (m1) return `${m1[3]}-${String(MONTHS.indexOf(m1[2]) + 1).padStart(2, '0')}-${m1[1].padStart(2, '0')}`
        const m2 = t.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/)
        if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
      }
    }
  }
  return null
}

// ----- Valeurs -----

export function toNumber(c: Cell): number | null {
  if (c == null || c === '' || typeof c === 'boolean' || c instanceof Date) return null
  if (typeof c === 'number') return Number.isFinite(c) ? c : null
  const t = c.trim().replace(',', '.')
  const chrono = t.match(/^(\d+)\s*['’:]\s*(\d{1,2}(?:[."]\d+)?)/)
  if (chrono) return Number(chrono[1]) * 60 + Number(chrono[2].replace('"', '.'))
  const m = t.match(/^-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

export const cellText = (c: Cell) => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c).trim())

// ----- Athlètes -----

export interface RowPerson { key: string; first: string; last: string; age: number | null; year: number | null; events: string }

export function personOf(row: Cell[], roles: ColRole[]): RowPerson {
  let first = '', last = '', age: number | null = null, year: number | null = null, events = ''
  roles.forEach((r, i) => {
    const v = cellText(row[i])
    if (r.kind === 'name') {
      const parts = v.split(/\s+/)
      first = parts[0] ?? ''
      last = parts.slice(1).join(' ')
    } else if (r.kind === 'first') first = v
    else if (r.kind === 'last') last = v
    else if (r.kind === 'age') age = toNumber(row[i])
    else if (r.kind === 'year') year = toNumber(row[i])
    else if (r.kind === 'events') events = /non renseign/i.test(v) ? '' : v
  })
  return { key: normText(first) + '|' + normText(last), first, last, age, year, events }
}

/** Fiche existante correspondante : prénom + nom, sinon prénom seul s'il est unique dans le club */
export function matchAthlete(p: RowPerson, athletes: Athlete[]): Athlete | null {
  const f = normText(p.first), l = normText(p.last)
  // Même prénom et même nom (y compris « sans nom », ex. une fiche créée par un import précédent)
  const full = athletes.filter((a) => normText(a.first_name) === f && normText(a.last_name) === l)
  if (full.length === 1) return full[0]
  const byFirst = athletes.filter((a) => normText(a.first_name) === f && (!l || !a.last_name || normText(a.last_name).startsWith(l[0] ?? '')))
  return byFirst.length === 1 ? byFirst[0] : null
}

/** Tous les tests disponibles pour le rapprochement : ceux du club + ceux de la batterie à créer */
export function availableTests(tests: TestDef[], templates: TestTemplate[]): { name: string; exists: boolean }[] {
  const out = tests.map((t) => ({ name: t.name, exists: true }))
  for (const t of templates) if (!tests.some((x) => normText(x.name) === normText(t.name))) out.push({ name: t.name, exists: false })
  return out
}
