import type { Assignment, Athlete, Block, SessionItem } from '../types'

export const uid = () => crypto.randomUUID()

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function startOfWeek(iso: string): string {
  const d = parseISODate(iso)
  const day = (d.getDay() + 6) % 7 // lundi = 0
  return addDays(iso, -day)
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  return parseISODate(iso).toLocaleDateString('fr-CH', opts)
}

export function formatShort(iso: string): string {
  return formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function fullName(a: Pick<Athlete, 'first_name' | 'last_name'>): string {
  return `${a.first_name} ${a.last_name}`.trim()
}

export function athletesFor(assignment: Assignment, athletes: Athlete[]): Athlete[] {
  return athletes.filter(
    (a) => a.active && ((assignment.group_id && a.group_id === assignment.group_id) || assignment.athlete_ids.includes(a.id)),
  )
}

export function emptyItem(name = ''): SessionItem {
  return { id: uid(), name, sets: '', reps: '', distance: '', duration: '', recovery: '', intensity: '', notes: '' }
}

export function defaultBlocks(): Block[] {
  return [
    { id: uid(), title: 'Échauffement', items: [] },
    { id: uid(), title: 'Corps de séance', items: [] },
    { id: uid(), title: 'Retour au calme', items: [] },
  ]
}

/** Résumé lisible d'un exercice : "3 × 4 × 60 m · récup 2' · 90%" */
export function itemSummary(it: SessionItem): string {
  const volume = [it.sets, it.reps, it.distance].filter(Boolean).join(' × ')
  return [volume, it.duration, it.recovery && `récup ${it.recovery}`, it.intensity].filter(Boolean).join(' · ')
}

/** Lien d'inscription à partager aux athlètes (optionnellement pour un groupe précis) */
export function inviteLink(code: string, groupId?: string | null): string {
  const base = window.location.href.split('#')[0]
  return `${base}#/rejoindre/${code}${groupId ? `/${groupId}` : ''}`
}

/** Numéro au format international sans "+" (079 123 45 67 → 41791234567) */
export function normalizePhone(phone: string): string {
  let d = phone.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = '41' + d.slice(1)
  return d.replace(/\D/g, '')
}

/** Lien WhatsApp : vers un contact précis si un numéro est donné, sinon choix du contact */
export function whatsappUrl(text: string, phone = ''): string {
  const n = normalizePhone(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

/** Feuille de partage native du téléphone (WhatsApp, SMS, email…) si disponible */
export async function nativeShare(text: string, url?: string): Promise<boolean> {
  if (!navigator.share) return false
  try {
    await navigator.share({ text, url })
  } catch {
    /* partage annulé */
  }
  return true
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
