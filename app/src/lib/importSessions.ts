import type { Block, SessionItem } from '../types'
import { normText, type Cell, type SheetIn } from './importResults'
import { emptyItem, uid } from './utils'
import { VENUES } from '../data/defaults'

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
