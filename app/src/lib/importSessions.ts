import type { Block, SessionItem } from '../types'
import { normText, type Cell, type SheetIn } from './importResults'
import { emptyItem, uid } from './utils'
import { VENUES } from '../data/defaults'
import { item } from './sessionText'

/** Séance lue dans un fichier : une ligne par exercice, regroupées par date + nom de séance */
export interface SessionIn {
  key: string
  date: string // AAAA-MM-JJ, '' si absente
  title: string
  objective: string
  blocks: Block[]
}

type Field = 'date' | 'title' | 'cycle' | 'phase' | 'block' | 'name' | keyof Omit<SessionItem, 'id' | 'name'>
const COLS: [RegExp, Field][] = [
  [/^date/, 'date'], [/^(seance|titre)/, 'title'], [/^cycle/, 'cycle'], [/^(phase|objectif)/, 'phase'],
  [/^(bloc|partie)/, 'block'], [/^exercice/, 'name'], [/^series?$/, 'sets'], [/^(rep|repetitions?)$/, 'reps'],
  [/^distance/, 'distance'], [/^duree/, 'duration'], [/^recup/, 'recovery'], [/^intensite/, 'intensity'],
  [/^(consignes?|notes?|remarques?)$/, 'notes'],
]

const cellStr = (c: Cell | undefined) => (c instanceof Date ? '' : String(c ?? '').trim())
const text = (c: Cell) => (c instanceof Date ? '' : String(c ?? '').trim())

function toISODate(c: Cell): string {
  if (c instanceof Date) return c.toISOString().slice(0, 10)
  const t = text(c)
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return ''
}

/** Lit la première feuille qui a une colonne « Exercice ». Les cellules vides de Date / Séance / Bloc reprennent la valeur du dessus. */
export function parseSessions(sheets: SheetIn[]): SessionIn[] | null {
  for (const s of sheets) {
    const h = s.rows.slice(0, 10).findIndex((r) => r.some((c) => normText(c).startsWith('exercice')))
    if (h < 0) continue
    const cols = new Map<Field, number>()
    s.rows[h].forEach((c, i) => {
      const f = COLS.find(([re]) => re.test(normText(c)))?.[1]
      if (f && !cols.has(f)) cols.set(f, i)
    })
    const get = (r: Cell[], f: Field) => (cols.has(f) ? r[cols.get(f)!] : null)
    const out: SessionIn[] = []
    let date = '', title = '', block = ''
    for (const r of s.rows.slice(h + 1)) {
      const name = text(get(r, 'name'))
      if (!name) continue
      date = toISODate(get(r, 'date')) || date
      title = text(get(r, 'title')) || title || 'Séance importée'
      const key = `${date}|${title}`
      let cur = out.find((x) => x.key === key)
      if (!cur) {
        const objective = [text(get(r, 'cycle')), text(get(r, 'phase'))].filter(Boolean).join(' – ')
        cur = { key, date, title, objective, blocks: [] }
        out.push(cur)
        block = ''
      }
      block = text(get(r, 'block')) || block || 'Corps de séance'
      let b = cur.blocks[cur.blocks.length - 1]
      if (!b || b.title !== block) cur.blocks.push((b = { id: uid(), title: block, items: [] }))
      const it = emptyItem(name)
      for (const f of ['sets', 'reps', 'distance', 'duration', 'recovery', 'intensity', 'notes'] as const) it[f] = text(get(r, f))
      b.items.push(it)
    }
    return out
  }
  return null
}

/** Lieu habituel du groupe : Evaux d'avril à octobre, Pavillon des sports au Bout-du-Monde de novembre à mars */
export function defaultLocation(date: string): string {
  const m = Number(date.slice(5, 7))
  if (!m) return ''
  return m >= 4 && m <= 10 ? VENUES[0] : VENUES[1]
}

/**
 * Plan en grille : une ligne par séance (colonne Date) et une colonne par partie de séance
 * (Échauffement, Bloc vitesse, colonnes par groupe, Retour au calme…). Chaque cellule devient un bloc,
 * découpé en exercices (retours à la ligne, phrases). Sem. / Cycle / Objectif / Remarques sont reconnus.
 */
export function parsePlanGrid(sheets: SheetIn[], baseTitle = 'Séance'): SessionIn[] | null {
  for (const s of sheets) {
    const h = s.rows.slice(0, 12).findIndex((r) => r.some((c) => normText(c) === 'date') && r.filter((c) => cellStr(c)).length >= 4)
    if (h < 0) continue
    const headers = s.rows[h].map((c) => cellStr(c))
    const role = (t: string) => {
      const n = normText(t)
      if (n === 'date') return 'date'
      if (/^(sem|semaine|n|no|numero)$/.test(n)) return 'skip'
      if (/^cycle/.test(n)) return 'cycle'
      if (/^(objectif|theme|intention)/.test(n)) return 'objective'
      if (/^(remarque|note|commentaire)/.test(n)) return 'remarks'
      return n ? 'block' : 'skip'
    }
    const roles = headers.map(role)
    if (roles.filter((r) => r === 'block').length < 2) continue
    const di = roles.indexOf('date')
    const out: SessionIn[] = []
    const themes = new Map<string, string>() // objectif de chaque séance, pour son titre
    for (const r of s.rows.slice(h + 1)) {
      const date = toISODate(r[di] ?? null)
      if (!date) continue
      const get = (k: string) => roles.map((ro, i) => (ro === k ? cellStr(r[i]) : '')).filter(Boolean).join(' – ')
      const objectiveTxt = get('objective')
      const blocks: Block[] = []
      roles.forEach((ro, i) => {
        if (ro !== 'block' && ro !== 'remarks') return
        const v = cellStr(r[i])
        if (!v) return
        // Titre du bloc : première ligne de l'en-tête, sans la liste de noms entre parenthèses
        const title = ro === 'remarks' ? 'Remarques' : headers[i].split('\n')[0].replace(/\s*\(.*$/, '').trim() || 'Bloc'
        const parts = v.split(/\n+/).flatMap((l) => l.split(/(?<=\.)\s+(?=[A-ZÀ-Ý0-9«])/)).map((p) => p.trim().replace(/\.$/, '')).filter(Boolean)
        blocks.push({ id: uid(), title, items: parts.map((p) => (ro === 'remarks' ? emptyItem(p) : item(p))) })
      })
      if (!blocks.length) continue
      const key = uid()
      themes.set(key, objectiveTxt)
      out.push({ key, date, title: '', objective: [get('cycle'), objectiveTxt].filter(Boolean).join(' – '), blocks })
    }
    if (!out.length) continue
    out.sort((a, b) => a.date.localeCompare(b.date)).forEach((x, i) => {
      const o = themes.get(x.key)
      x.title = `${baseTitle.trim() || 'Séance'} S${String(i + 1).padStart(2, '0')}${o ? ` – ${o}` : ''}`
    })
    return out
  }
  return null
}
