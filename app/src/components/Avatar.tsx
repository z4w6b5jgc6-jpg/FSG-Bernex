import type { Athlete } from '../types'

/** Initiales sur un rond de la couleur de l'athlète (remplace les avatars emoji) */
export function Avatar({ a, size = 'md' }: { a: Pick<Athlete, 'first_name' | 'last_name' | 'color'>; size?: 'sm' | 'md' }) {
  const ini = `${a.first_name?.[0] ?? ''}${a.last_name?.[0] ?? ''}`.toUpperCase() || '?'
  return <span className={`avatar avatar-${size}`} style={{ background: a.color || 'var(--primary)' }} aria-hidden="true">{ini}</span>
}
