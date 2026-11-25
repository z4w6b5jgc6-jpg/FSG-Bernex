import type { Athlete, Session } from '../types'

const ACCENTS: Record<string, string> = { a: 'aàâäáã', e: 'eéèêë', i: 'iîïíì', o: 'oôöóò', u: 'uùûüú', c: 'cç', n: 'nñ', y: 'yÿ' }
const pattern = (word: string) =>
  word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split('')
    .map((ch) => (ACCENTS[ch] ? `[${ACCENTS[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('')

// Mots courants de deux lettres : jamais pris pour un nom (« De », « Le »… comme nom de famille)
const COMMON = new Set(['de', 'du', 'la', 'le', 'un', 'en', 'et', 'ou', 'au', 'il', 'je', 'tu', 'on', 'ne', 'se', 'ce', 'sa', 'ma', 'ta', 'me', 'te', 'ni', 'si', 'va', 'vu', 'an', 'as', 'os', 'us', 'vs', 'km', 'kg', 'ok', 'to', 'of', 'in', 'is', 'it', 'at', 'by', 'no', 'or', 'so', 'up'])
const strip = (w: string) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Remplace les prénoms et noms des athlètes du club par « [athlète] » avant tout envoi à l'IA */
export function redactNames(text: string, athletes: Pick<Athlete, 'first_name' | 'last_name'>[]): { text: string; count: number } {
  const words = new Set<string>(), short = new Set<string>()
  for (const a of athletes) {
    for (const w of [a.first_name ?? '', a.last_name ?? '', `${a.first_name ?? ''} ${a.last_name ?? ''}`]) {
      const t = w.trim()
      if (t.length >= 3) words.add(t)
      // Noms de deux lettres (Li, Bo…) : seulement écrits avec la majuscule, pour ne pas masquer les mots courants
      else if (t.length === 2 && !COMMON.has(strip(t))) short.add(t[0].toUpperCase() + t.slice(1).toLowerCase())
    }
  }
  let count = 0
  const swap = () => { count++; return '[athlète]' }
  // Les noms complets d'abord, puis les mots seuls
  const list = [...words].sort((a, b) => b.length - a.length)
  let out = list.length ? text.replace(new RegExp(`(?<![\\p{L}])(${list.map(pattern).join('|')})(?![\\p{L}])`, 'giu'), swap) : text
  if (short.size) out = out.replace(new RegExp(`(?<![\\p{L}])(${[...short].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'gu'), swap)
  return { text: out, count }
}

/** Même masquage sur tout le texte d'une séance (titres, exercices, consignes) avant l'envoi à l'IA */
export function redactSession<T extends Pick<Session, 'title' | 'objective' | 'focus' | 'duration_min' | 'blocks'>>(s: T, athletes: Pick<Athlete, 'first_name' | 'last_name'>[]): T {
  const r = (t: string) => redactNames(t, athletes).text
  return {
    ...s,
    title: r(s.title), objective: r(s.objective), focus:r(s.focus),
    blocks: s.blocks.map((b) => ({ ...b, title: r(b.title), items: b.items.map((it) => Object.fromEntries(Object.entries(it).map(([key,value])=>[key,key==='id'||typeof value!=='string'?value:r(value)])) as typeof it) })),
  }
}
