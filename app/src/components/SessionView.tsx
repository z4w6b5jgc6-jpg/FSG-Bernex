import type { Session, SessionItem } from '../types'
import { itemSummary } from '../lib/utils'
import { distanceIn, formatTime, paceSeconds, parseEffortSeconds, parseMeters, vmaPercent } from '../lib/vma'
import { formatSprint, targetTime } from '../lib/sprint'

const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** % de VMA écrit, ou déduit du type de séance (tableau « Sprint » : seuil 85 %, capacité aérobie ≈ 77 %, régénération 70 %) */
function vmaPct(it: SessionItem): number | null {
  const explicit = vmaPercent(`${it.intensity} ${it.notes}`)
  if (explicit) return explicit
  const t = plain(`${it.name} ${it.intensity} ${it.notes}`)
  if (/seuil/.test(t)) return 85
  if (/capacite aerobie|endurance active/.test(t)) return 77
  if (/regeneration|footing de recup|recuperation active/.test(t)) return 70
  return null
}

/** Temps à viser en sprint (30–300 m) d'après le niveau de l'athlète et l'intensité demandée */
function sprintTarget(it: SessionItem, level: number): string | null {
  if (vmaPercent(`${it.intensity} ${it.notes}`)) return null
  const meters = parseMeters(it.distance) ?? parseMeters(it.name)
  if (!meters || meters < 30 || meters > 300) return null
  const t = plain(`${it.name} ${it.intensity}`)
  if (/haie|bond|saut|cloche|multi|lattes|educatif|skipping|talon/.test(t)) return null
  const m = t.match(/(\d{2,3})(?:\s*[-–à]\s*(\d{2,3}))?\s*%/)
  const pct = /\bmax|a fond|100\s*%/.test(t) ? 100 : m ? Number(m[2] ?? m[1]) : null
  if (!pct || pct < 70 || pct > 100) return null
  const target = targetTime(level, meters, pct)
  if (!target) return null
  const flying = /lance/.test(t) ? ' (temps avec départ : un départ lancé sera plus rapide)' : ''
  return `vise ${formatSprint(target, 1)} sur ${meters} m à ${pct} %${flying}`
}

/** Allure personnalisée quand l'intensité est exprimée en % de VMA */
function personalPace(it: SessionItem, vma: number): string | null {
  const pct = vmaPct(it)
  if (!pct) return null
  const speed = ((vma * pct) / 100).toLocaleString('fr-CH', { maximumFractionDigits: 1 })
  const meters = parseMeters(it.distance)
  if (meters) return `${speed} km/h · ${meters >= 1000 ? `${meters / 1000} km` : `${meters} m`} en ${formatTime(paceSeconds(vma, pct, meters))}`
  const sec = parseEffortSeconds(it.duration)
  if (sec) return `${speed} km/h · ≈ ${Math.round(distanceIn(vma, pct, sec) / 5) * 5} m en ${formatTime(sec)}`
  return `${speed} km/h`
}

/** Affichage en lecture d'une séance (entraîneur et athlètes) */
export function SessionView({ session, vma, sprintLevel }: { session: Omit<Session, 'updated_at'>; vma?: number | null; sprintLevel?: number | null }) {
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
                  {vma && personalPace(it, vma) && <div className="my-pace">Pour toi : {personalPace(it, vma)}</div>}
                  {sprintLevel && sprintTarget(it, sprintLevel) && <div className="my-pace">Pour toi : {sprintTarget(it, sprintLevel)}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
