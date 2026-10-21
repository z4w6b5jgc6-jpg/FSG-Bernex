import type { Athlete, Session } from '../types'

const ACCENTS: Record<string, string> = { a: 'aàâäáã', e: 'eéèêë', i: 'iîïíì', o: 'oôöóò', u: 'uùûüú', c: 'cç', n: 'nñ', y: 'yÿ' }
const pattern = (word: string) =>
  word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split('')
    .map((ch) => (ACCENTS[ch] ? `[${ACCENTS[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('')

/** Remplace les prénoms et noms des athlètes du club par « [athlète] » avant tout envoi à l'IA */
export function redactNames(text: string, athletes: Pick<Athlete, 'first_name' | 'last_name'>[]): { text: string; count: number } {
  const words = new Set<string>()
  for (const a of athletes) {
    for (const w of [a.first_name, a.last_name, `${a.first_name} ${a.last_name}`]) {
      const t = w.trim()
      if (t.length >= 3) words.add(t)
    }
  }
  // Les noms complets d'abord, puis les mots seuls
  const list = [...words].sort((a, b) => b.length - a.length)
  if (!list.length) return { text, count: 0 }
  const re = new RegExp(`(?<![\\p{L}])(${list.map(pattern).join('|')})(?![\\p{L}])`, 'giu')
  let count = 0
  const out = text.replace(re, () => { count++; return '[athlète]' })
  return { text: out, count }
}

/** Même masquage sur tout le texte d'une séance (titres, exercices, consignes) avant l'envoi à l'IA */
export function redactSession<T extends Pick<Session, 'title' | 'objective' | 'focus' | 'duration_min' | 'blocks'>>(s: T, athletes: Pick<Athlete, 'first_name' | 'last_name'>[]): T {
  const r = (t: string) => redactNames(t, athletes).text
  return {
    ...s,
    title: r(s.title), objective: r(s.objective),
    blocks: s.blocks.map((b) => ({ ...b, title: r(b.title), items: b.items.map((it) => ({ ...it, name: r(it.name), notes: r(it.notes), intensity: r(it.intensity) })) })),
  }
}
