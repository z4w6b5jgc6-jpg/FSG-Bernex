import type { Session, SessionItem } from '../types'
import { itemSummary } from '../lib/utils'
import { distanceIn, formatTime, paceSeconds, parseEffortSeconds, parseMeters, vmaPercent } from '../lib/vma'

/** Allure personnalisée quand l'intensité est exprimée en % de VMA */
function personalPace(it: SessionItem, vma: number): string | null {
  const pct = vmaPercent(`${it.intensity} ${it.notes}`)
  if (!pct) return null
  const speed = ((vma * pct) / 100).toLocaleString('fr-CH', { maximumFractionDigits: 1 })
  const meters = parseMeters(it.distance)
  if (meters) return `${speed} km/h · ${meters >= 1000 ? `${meters / 1000} km` : `${meters} m`} en ${formatTime(paceSeconds(vma, pct, meters))}`
  const sec = parseEffortSeconds(it.duration)
  if (sec) return `${speed} km/h · ≈ ${Math.round(distanceIn(vma, pct, sec) / 5) * 5} m en ${formatTime(sec)}`
  return `${speed} km/h`
}

/** Affichage en lecture d'une séance (entraîneur et athlètes) */
export function SessionView({ session, vma }: { session: Omit<Session, 'updated_at'>; vma?: number | null }) {
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
                  {vma && personalPace(it, vma) && <div className="my-pace">🎯 Pour toi : {personalPace(it, vma)}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
