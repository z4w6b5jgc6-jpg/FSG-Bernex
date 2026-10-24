import type { Assignment, Athlete, Group, Session, SessionItem, SessionNote } from '../types'
import { athletesFor, fullName } from './utils'
import type { XCell, XSheet } from './xlsx'

/** Une ligne d'exercice, lisible et relisible par l'import (« Talons-fesses 4 x 30 m ») */
export function itemLine(it: SessionItem): string {
  const vol = it.sets && it.distance ? ` ${it.sets} x ${it.distance}` : it.reps ? ` x ${it.reps}` : [it.sets, it.distance].filter(Boolean).map((v) => ` ${v}`).join('')
  const extra = [it.duration, it.recovery && `récup ${it.recovery}`, it.intensity].filter(Boolean).join(', ')
  return `${it.name}${vol}${extra ? ` (${extra})` : ''}${it.notes ? ` – ${it.notes}` : ''}`
}

// Semaine ISO (lundi = début de semaine)
function isoWeek(iso: string): number {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7)
}

/** Libellé court d'une séance dans sa journée : fin du titre après « · » (groupe), sinon le titre */
const labelOf = (s: Session) => (s.title.includes(' · ') ? s.title.split(' · ').slice(1).join(' · ') : s.title)

interface Ctx { sessions: Session[]; athletes: Athlete[]; groups: Group[]; notes?: SessionNote[] }

/**
 * Deux feuilles :
 *  - « Plan » : une ligne par jour, une colonne par partie de séance (comme le plan importé).
 *    Une partie identique pour tous les groupes du jour s'écrit une fois ; sinon chaque groupe a sa ligne « groupe : … ».
 *  - « Détail » : une ligne par exercice (Date, Séance, Bloc, Exercice…), que l'import relit tel quel.
 */
export function exportSheets(list: Assignment[], { sessions, athletes, groups, notes = [] }: Ctx, title: string): XSheet[] {
  const planned = list
    .map((a) => ({ a, s: sessions.find((x) => x.id === a.session_id) }))
    .filter((x): x is { a: Assignment; s: Session } => !!x.s)
    .sort((x, y) => x.a.date.localeCompare(y.a.date) || (x.a.time || '').localeCompare(y.a.time || '') || x.s.title.localeCompare(y.s.title))
  const who = (a: Assignment, short = false) => {
    const g = groups.find((x) => x.id === a.group_id)
    return g ? `Groupe ${g.name}` : athletesFor(a, athletes).map((x) => (short ? x.first_name : fullName(x))).join(', ')
  }

  // Colonnes « parties de séance », dans l'ordre où elles apparaissent
  // (une partie nouvelle se place avant la partie suivante déjà connue : les colonnes de groupe restent entre
  // le bloc commun du début et le retour au calme ; les plus grands groupes d'abord)
  const parts: string[] = []
  const bySize = [...planned].sort((x, y) => athletesFor(y.a, athletes).length - athletesFor(x.a, athletes).length)
  for (const { s } of bySize) {
    const titles = s.blocks.filter((b) => b.items.length).map((b) => b.title)
    titles.forEach((t, k) => {
      if (parts.includes(t)) return
      const next = titles.slice(k + 1).find((x) => parts.includes(x))
      parts.splice(next ? parts.indexOf(next) : parts.length, 0, t)
    })
  }
  const remarks = parts.filter((t) => /^remarque/i.test(t))
  const cols = [...parts.filter((t) => !remarks.includes(t)), ...remarks]

  const days = [...new Set(planned.map((x) => x.a.date))]
  const noteOf = (s: Session) => notes.find((n) => n.session_id === s.id)?.text ?? ''
  const withNotes = planned.some(({ s }) => noteOf(s))
  const plan: XCell[][] = [['Sem.', 'Date', 'Séances du jour', 'Objectif', 'Lieu / heure', ...cols, ...(withNotes ? ['Remarques'] : [])]]
  for (const day of days) {
    const today = planned.filter((x) => x.a.date === day)
    const uniq = (v: string[]) => [...new Set(v.filter(Boolean))]
    const cells = cols.map((t) => {
      const per = today.flatMap(({ s }) => {
        const b = s.blocks.find((x) => x.title === t && x.items.length)
        return b ? [{ label: labelOf(s), text: b.items.map(itemLine).join('\n') }] : []
      })
      const texts = uniq(per.map((p) => p.text))
      if (texts.length <= 1 && (per.length === today.length || per.length === 1)) return texts[0] ?? ''
      // Sous-groupe : « 400 / Demi-fond (800) » dans la colonne « 400 / Demi-fond » → « 800 : … »
      return per.map((p) => {
        const sub = p.label.startsWith(t) ? p.label.slice(t.length).trim().replace(/^\((.*)\)$/, '$1') : p.label
        return sub ? `${sub} : ${p.text.replace(/\n/g, '\n   ')}` : p.text
      }).join('\n')
    })
    plan.push([
      isoWeek(day), { date: day },
      today.map(({ a, s }) => `${labelOf(s)} → ${who(a, true) || '—'}`).join('\n'),
      uniq(today.map((x) => x.s.objective)).join('\n'),
      uniq(today.map(({ a }) => [a.location, a.time].filter(Boolean).join(', '))).join('\n'),
      ...cells,
      ...(withNotes ? [uniq(today.map(({ s }) => noteOf(s))).join('\n')] : []),
    ])
  }

  const detail: XCell[][] = [['Date', 'Séance', 'Pour qui', 'Lieu', 'Heure', 'Objectif', 'Bloc', 'Exercice', 'Séries', 'Rép.', 'Distance', 'Durée', 'Récup', 'Intensité', 'Consignes']]
  for (const { a, s } of planned) {
    for (const b of s.blocks) for (const it of b.items) {
      detail.push([{ date: a.date }, s.title, who(a), a.location, a.time, s.objective, b.title, it.name, it.sets, it.reps, it.distance, it.duration, it.recovery, it.intensity, it.notes])
    }
  }

  return [
    { name: 'Plan', title, rows: plan, widths: [6, 11, 28, 30, 20, ...cols.map(() => 42)] },
    { name: 'Détail', rows: detail, widths: [11, 34, 30, 22, 7, 30, 24, 50, 7, 7, 10, 10, 10, 10, 30] },
  ]
}
