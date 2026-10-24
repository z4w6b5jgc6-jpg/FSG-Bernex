// Lecture intelligente d'un plan : texte du fichier (onglets choisis), noms masqués, lu par morceaux par l'IA,
// puis remis en séances de l'app (aperçu à vérifier avant import).
import type { Athlete, Block, Target, TargetBase } from '../types'
import { normText, type Cell, type SheetIn } from './importResults'
import { redactNames } from './redact'
import { emptyItem, uid } from './utils'
import type { SessionIn } from './importSessions'

/** Séance telle que l'IA la rend */
export interface RawSeance {
  date?: string; titre?: string; objectif?: string; pour?: string; remarques?: string
  blocs?: { titre?: string; exercices?: { nom?: string; series?: string; reps?: string; distance?: string; duree?: string; recup?: string; intensite?: string; consignes?: string }[] }[]
  cibles?: { distance?: number; base?: string; pct?: number }[]
}

const cellText = (c: Cell | undefined) => (c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? '').replace(/\s+/g, ' ').trim())

/** Onglet probablement un plan (dates, séances) plutôt qu'une liste d'athlètes ou un suivi chiffré */
export function looksLikePlan(s: SheetIn): boolean {
  if (/mode d.emploi|lisez|readme|instruction|calculateur|suivi|charge/i.test(s.name)) return false
  const head = s.rows.slice(0, 12).flat().map((c) => normText(c))
  if (head.some((t) => /^(athletes?|nom|prenom|ne|nele|naissance|email|telephone)/.test(t))) return false
  const text = s.rows.slice(0, 80).flat().map(cellText).join(' ').toLowerCase()
  const dates = s.rows.flat().filter((c) => c instanceof Date || /^\d{1,2}[./]\d{1,2}([./]\d{2,4})?$/.test(cellText(c))).length
  return dates >= 2 || /(échauffement|echauffement|séance|seance|éducatif|exercice|récup|recup)/.test(text)
}

/** Texte d'un onglet : une ligne par rangée, cellules séparées par « | » */
export const sheetText = (s: SheetIn) =>
  `## Onglet « ${s.name} »\n` + s.rows.map((r) => r.map(cellText)).filter((r) => r.some(Boolean)).map((r) => r.join(' | ').replace(/( \| )+$/, '')).join('\n')

/** Morceaux d'environ `max` caractères, coupés entre deux lignes ; la ligne d'en-tête du tableau est répétée */
export function chunks(text: string, max = 3500): string[] {
  const out: string[] = []
  let head = '', cur = ''
  for (const line of text.split('\n')) {
    if (line.startsWith('## Onglet')) { if (cur.trim()) out.push(cur); cur = line + '\n'; head = ''; continue }
    if (!head && line.includes(' | ')) head = line
    if (cur.length + line.length > max && cur.trim()) { out.push(cur); cur = head && line !== head ? head + '\n' : '' }
    cur += line + '\n'
  }
  if (cur.trim()) out.push(cur)
  return out
}

/** Noms des athlètes masqués avant l'envoi (confidentialité) */
export const redact = (text: string, athletes: Athlete[]) => redactNames(text, athletes).text

const BASES: TargetBase[] = ['VMA', 'RVA', 'REC', 'INT']
const clean = (v: unknown) => String(v ?? '').trim()

export function toSessionIn(r: RawSeance): SessionIn {
  const blocks: Block[] = (r.blocs ?? []).filter((b) => b.exercices?.length).map((b) => ({
    id: uid(), title: clean(b.titre) || 'Bloc',
    items: (b.exercices ?? []).filter((e) => clean(e.nom)).map((e) => ({
      ...emptyItem(clean(e.nom)), sets: clean(e.series), reps: clean(e.reps), distance: clean(e.distance), duration: clean(e.duree),
      recovery: clean(e.recup), intensity: clean(e.intensite), notes: clean(e.consignes),
    })),
  }))
  if (clean(r.remarques)) blocks.push({ id: uid(), title: 'Remarques', items: [emptyItem(clean(r.remarques))] })
  const targets: Target[] = (r.cibles ?? []).map((c, i) => ({ ordre: i + 1, d: Number(c.distance), base: clean(c.base).toUpperCase() as TargetBase, pct: Number(c.pct) > 3 ? Number(c.pct) / 100 : Number(c.pct) }))
    .filter((t) => t.d > 0 && t.pct > 0 && BASES.includes(t.base)).slice(0, 3)
  const pour = clean(r.pour)
  const title = clean(r.titre) || 'Séance'
  return {
    key: uid(), date: /^\d{4}-\d{2}-\d{2}$/.test(clean(r.date)) ? clean(r.date) : '',
    title: pour && !title.includes(pour) ? `${title} · ${pour}` : title, objective: clean(r.objectif), blocks,
    ...(targets.length ? { targets } : {}),
  }
}

/**
 * Temps cibles écrits dans le texte d'une séance (« 200 m à 95 % VMA », « 15"/15" à 105 % VMA », « 80 m à 88 % du record »),
 * pour tous les imports : au plus 3, sans doublon.
 */
export function extractTargets(blocks: Block[]): Target[] {
  const text = blocks.flatMap((b) => b.items.map((i) => [i.name, i.distance, i.intensity, i.notes].join(' '))).join('\n')
  const out: Target[] = []
  const add = (d: number, base: TargetBase, pct: number) => {
    if (!(d > 0) || !(pct > 0) || out.some((t) => t.d === d && t.base === base && t.pct === pct)) return
    if (out.length < 3) out.push({ ordre: out.length + 1, d, base, pct })
  }
  const num = (s: string) => Number(s.replace(',', '.'))
  for (const m of text.matchAll(/(\d+)\s*"\s*\/\s*\d+\s*"[^%\n]{0,25}?(\d+(?:[.,]\d+)?)\s*%\s*(?:de la\s*)?VMA/gi)) add(num(m[1]), 'INT', num(m[2]) / 100)
  for (const m of text.matchAll(/(\d{2,4})\s*m\b[^%\n]{0,25}?(\d+(?:[.,]\d+)?)\s*%\s*(?:de la\s*|du\s*|de\s*)?(VMA|RVA|record)/gi)) {
    add(num(m[1]), m[3].toLowerCase() === 'record' ? 'REC' : (m[3].toUpperCase() as TargetBase), num(m[2]) / 100)
  }
  return out
}
