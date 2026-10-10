import type { Session } from '../types'
import { itemSummary } from '../lib/utils'

/** Affichage en lecture d'une séance (entraîneur et athlètes) */
export function SessionView({ session }: { session: Omit<Session, 'updated_at'> }) {
  return (
    <div className="session-view">
      {(session.objective || session.focus || session.duration_min) && (
        <p className="muted">
          {[session.focus, session.duration_min && `${session.duration_min} min`].filter(Boolean).join(' · ')}
          {session.objective && <><br /><strong>Objectif :</strong> {session.objective}</>}
        </p>
      )}
      {session.blocks.map((b) => (
        <section key={b.id} className="block-view">
          <h3>{b.title}</h3>
          {b.items.length === 0 ? (
            <p className="muted small">—</p>
          ) : (
            <ul>
              {b.items.map((it) => (
                <li key={it.id}>
                  <strong>{it.name || 'Exercice'}</strong>
                  {itemSummary(it) && <span className="item-summary"> {itemSummary(it)}</span>}
                  {it.notes && <div className="muted small">{it.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
