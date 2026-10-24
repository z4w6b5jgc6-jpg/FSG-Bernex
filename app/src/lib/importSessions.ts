import type { Block, SessionItem, Target } from '../types'
import { normText, type Cell, type SheetIn } from './importResults'
import { emptyItem, uid } from './utils'
import { item } from './sessionText'

/** Séance lue dans un fichier : une ligne par exercice, regroupées par date + nom de séance */
export interface SessionIn {
  key: string
  date: string // AAAA-MM-JJ, '' si absente
  title: string
  objective: string
  blocks: Block[]
  /** Plan par groupes : athlètes prévus (noms tels qu'écrits dans le fichier) et libellé du groupe */
  who?: string[]
  audience?: string
  /** lieu et heure lus dans le fichier (colonnes Lieu / Heure) */
  location?: string
  time?: string
  /** temps cibles (répétitions chronométrées) reconnus dans le plan */
  targets?: Target[]
}

type Field = 'date' | 'title' | 'cycle' | 'phase' | 'block' | 'name' | 'who' | 'location' | 'time' | keyof Omit<SessionItem, 'id' | 'name'>
const COLS: [RegExp, Field][] = [
  [/^date/, 'date'], [/^(seance|titre)/, 'title'], [/^cycle/, 'cycle'], [/^(phase|objectif)/, 'phase'],
  [/^(bloc|partie)/, 'block'], [/^exercice/, 'name'], [/^series?$/, 'sets'], [/^(rep|repetitions?)$/, 'reps'],
  [/^distance/, 'distance'], [/^duree/, 'duration'], [/^recup/, 'recovery'], [/^intensite/, 'intensity'],
  [/^(consignes?|notes?|remarques?)$/, 'notes'], [/^pourqui/, 'who'], [/^lieu/, 'location'], [/^heure/, 'time'],
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
        // « Pour qui » (export de l'app) : planifiée pour ces athlètes ; « Groupe … » = pas de liste
        const who = text(get(r, 'who'))
        if (cols.has('who') && who && !/^groupe\b/i.test(who)) cur.who = who.split(/\s*,\s*/).filter(Boolean)
        if (text(get(r, 'location'))) cur.location = text(get(r, 'location'))
        if (/^\d{1,2}[:h]\d{2}$/.test(text(get(r, 'time')))) cur.time = text(get(r, 'time')).replace('h', ':').padStart(5, '0')
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

/** Lieu habituel du groupe à cette date (réglages de l'espace) */
export { defaultLocation } from './settings'

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const firstOf = (name: string) => normText(name.split(/\s+/)[0])
const NAME = /^[A-ZÀ-Ý][\p{L}'’-]+(\s+[A-ZÀ-Ý]\.?)?$/u

interface RosterEntry { name: string; group: string; off: string[] } // off : jours où l'athlète ne vient pas

/**
 * Composition des groupes trouvée dans le classeur :
 *  1. une feuille avec une ligne par athlète et une colonne « Groupe… » (une colonne « Lundi » à « non » l'exclut ce jour-là)
 *  2. sinon une feuille « Groupe | Athlètes » avec la liste des prénoms dans une cellule
 */
function rosterOf(sheets: SheetIn[]): RosterEntry[] {
  for (const s of sheets) {
    const h = s.rows.slice(0, 10).findIndex((r) => r.some((c) => /^(athlete|nom|prenom)/.test(normText(c))) && r.some((c) => /^groupe/.test(normText(c))))
    if (h < 0) continue
    const hd = s.rows[h].map((c) => normText(c))
    const ni = hd.findIndex((t) => /^(athlete|nom|prenom)/.test(t))
    const gi = hd.findIndex((t) => /^groupe/.test(t))
    if (gi === 0 && ni === 1) continue // c'est le format « Groupe | Athlètes », lu plus bas
    const out: RosterEntry[] = []
    for (const r of s.rows.slice(h + 1)) {
      const name = cellStr(r[ni]), group = normText(r[gi])
      if (!name || !group || !NAME.test(name)) continue
      out.push({ name, group, off: hd.flatMap((t, i) => (WEEKDAYS.includes(t) && normText(r[i]) === 'non' ? [t] : [])) })
    }
    if (out.length) return out
  }
  for (const s of sheets) {
    const h = s.rows.slice(0, 10).findIndex((r) => normText(r[0]) === 'groupe' && /^athlete/.test(normText(r[1])))
    if (h < 0) continue
    return s.rows.slice(h + 1).flatMap((r) => {
      const group = normText(r[0])
      const names = cellStr(r[1]).replace(/\(.*?\)/g, '').split(/,|\+|\bet\b/).map((t) => t.trim()).filter((t) => NAME.test(t))
      return group ? names.map((name) => ({ name, group, off: [] })) : []
    })
  }
  return []
}

/** Lignes d'une cellule de groupe, réparties par sous-groupe (« 800 : … », « 400 : … », « Mathis, Lilou : … ») */
function splitByAudience(cell: string, members: string[], header: string): { label: string; names: string[]; lines: string[] }[] {
  // Sous-groupes annoncés dans l'en-tête : « 400 / Demi-fond (800 : Emile, Mathis) »
  const named = new Map<string, string[]>()
  for (const m of (header.match(/\(([^)]*)\)?/)?.[1] ?? '').matchAll(/([^:;,]+?)\s*:\s*([^:;]+)/g)) {
    named.set(normText(m[1]), m[2].split(/,|\bet\b/).map((t) => t.trim()).filter(Boolean))
  }
  const inGroup = (tokens: string[]) => {
    const found = tokens.map((t) => members.find((m) => firstOf(m) === firstOf(t)))
    return found.every(Boolean) ? (found as string[]) : null
  }
  const reserved = new Set([...named.values()].flat().map(firstOf))
  const lines: { tag: string | null; text: string }[] = []
  const groups = new Map<string, string[]>()
  for (const line of cell.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^([^:]{1,40}?)\s*(?:\(([^)]*)\))?\s*:\s*(.+)$/)
    let tag: string | null = null, names: string[] | null = null
    if (m) {
      const key = normText(m[1])
      const explicit = m[2] ? inGroup(m[2].split(/,|\bet\b/).map((t) => t.trim()).filter(Boolean)) : null
      if (named.has(key)) names = explicit ?? inGroup(named.get(key)!) ?? []
      else if (/^\d{2,4}m?$/.test(key)) names = explicit ?? members.filter((x) => !reserved.has(firstOf(x)))
      else names = inGroup(m[1].split(/,|\bet\b|&/).map((t) => t.trim()).filter(Boolean))
      if (names) tag = m[2] ? `${m[1].trim()} – ${m[2].trim()}` : m[1].trim()
    }
    if (tag && names) {
      if (!groups.has(tag)) groups.set(tag, names)
      lines.push({ tag, text: m![3] })
    } else lines.push({ tag: null, text: line })
  }
  const shared = (tag: string | null) => lines.filter((l) => l.tag === null || l.tag === tag).map((l) => l.text)
  if (!groups.size) return [{ label: '', names: members, lines: shared(null) }]
  const out = [...groups].map(([label, names]) => ({ label, names, lines: shared(label) }))
  const covered = new Set(out.flatMap((o) => o.names))
  const rest = members.filter((x) => !covered.has(x))
  if (rest.length) out.push({ label: rest.join(', '), names: rest, lines: shared(null) })
  return out
}

export const toItems = (lines: string[], plain = false) =>
  lines.flatMap((l) => l.split(/(?<=\.)\s+(?=[A-ZÀ-Ý0-9«])/)).map((p) => p.trim().replace(/\.$/, '')).filter(Boolean).map((p) => (plain ? emptyItem(p) : item(p)))

/**
 * Plan en grille : une ligne par séance (colonne Date) et une colonne par partie de séance
 * (Échauffement, Bloc vitesse, Retour au calme…). Chaque cellule devient un bloc,
 * découpé en exercices (retours à la ligne, phrases). Sem. / Cycle / Objectif / Remarques sont reconnus.
 * Colonnes par groupe (« Sprint / Sauts / Haies (Chiara, Sofia…) », ou nom d'un groupe de l'onglet des athlètes) :
 * une séance par groupe et par sous-groupe, avec les parties communes, pour les athlètes de ce groupe.
 */
export function parsePlanGrid(sheets: SheetIn[], baseTitle = 'Séance'): SessionIn[] | null {
  const roster = rosterOf(sheets)
  for (const s of sheets) {
    const h = s.rows.slice(0, 12).findIndex((r) => r.some((c) => normText(c) === 'date') && r.filter((c) => cellStr(c)).length >= 4)
    if (h < 0) continue
    const headers = s.rows[h].map((c) => cellStr(c))
    const firstLine = (i: number) => headers[i].split('\n')[0].replace(/\s*\(.*$/, '').trim()
    const role = (t: string, i: number) => {
      const n = normText(t)
      if (n === 'date') return 'date'
      if (/^(sem|semaine|n|no|numero)$/.test(n)) return 'skip'
      if (/^cycle/.test(n)) return 'cycle'
      if (/^(objectif|theme|intention)/.test(n)) return 'objective'
      if (/^(remarque|note|commentaire)/.test(n)) return 'remarks'
      if (!n) return 'skip'
      const g = normText(firstLine(i))
      return !/commun/i.test(t) && (/\(/.test(t) || roster.some((x) => x.group === g)) ? 'group' : 'block'
    }
    const roles = headers.map(role)
    if (roles.filter((r) => r === 'block' || r === 'group').length < 2) continue
    const di = roles.indexOf('date')
    // Athlètes de chaque colonne de groupe : onglet des athlètes, sinon noms entre parenthèses dans l'en-tête
    const membersOf = (i: number, date: string) => {
      const g = normText(firstLine(i))
      const day = WEEKDAYS[new Date(date + 'T12:00:00').getDay()]
      const fromRoster = roster.filter((x) => x.group === g && !x.off.includes(day)).map((x) => x.name)
      if (fromRoster.length || roster.some((x) => x.group === g)) return fromRoster
      const inHeader = headers[i].match(/\(([^)]*)\)?/)?.[1] ?? ''
      return /:/.test(inHeader) ? [] : inHeader.split(/,|\bet\b/).map((t) => t.trim()).filter((t) => NAME.test(t))
    }
    const hasGroups = roles.includes('group')
    const out: SessionIn[] = []
    const themes = new Map<string, string>() // objectif de chaque séance, pour son titre
    const order: string[] = [] // dates dans l'ordre, pour la numérotation S01, S02…
    for (const r of s.rows.slice(h + 1)) {
      const date = toISODate(r[di] ?? null)
      if (!date) continue
      const get = (k: string) => roles.map((ro, i) => (ro === k ? cellStr(r[i]) : '')).filter(Boolean).join(' – ')
      const objectiveTxt = get('objective')
      const objective = [get('cycle'), objectiveTxt].filter(Boolean).join(' – ')
      const blockAt = (i: number, items: SessionItem[]): Block => ({ id: uid(), title: roles[i] === 'remarks' ? 'Remarques' : firstLine(i) || 'Bloc', items })
      const common = (i: number) => {
        const v = cellStr(r[i])
        return v ? blockAt(i, toItems(v.split(/\n+/), roles[i] === 'remarks')) : null
      }
      // Variantes : une seule (tout le monde), ou une par groupe / sous-groupe
      const variants: { gi: number; label: string; names?: string[]; lines: string[] }[] = []
      if (!hasGroups) variants.push({ gi: -1, label: '', lines: [] })
      roles.forEach((ro, i) => {
        const v = cellStr(r[i])
        if (ro !== 'group' || !v) return
        for (const x of splitByAudience(v, membersOf(i, date), headers[i])) variants.push({ gi: i, ...x })
      })
      for (const v of variants) {
        const blocks = roles.flatMap((ro, i) => {
          if (ro === 'block' || ro === 'remarks') return common(i) ?? []
          if (ro === 'group' && i === v.gi) return v.lines.length ? [blockAt(i, toItems(v.lines))] : []
          return []
        })
        if (!blocks.length) continue
        const key = uid()
        themes.set(key, objectiveTxt)
        const audience = v.gi < 0 ? undefined : firstLine(v.gi) + (v.label ? ` (${v.label})` : '')
        out.push({ key, date, title: audience ?? '', objective, blocks, ...(v.names ? { who: v.names, audience } : {}) })
      }
      if (!order.includes(date)) order.push(date)
    }
    if (!out.length) continue
    order.sort()
    out.sort((a, b) => a.date.localeCompare(b.date))
    for (const x of out) {
      const n = `${baseTitle.trim() || 'Séance'} S${String(order.indexOf(x.date) + 1).padStart(2, '0')}`
      const o = themes.get(x.key)
      x.title = x.audience ? `${n} · ${x.audience}` : `${n}${o ? ` – ${o}` : ''}`
    }
    return out
  }
  return null
}
