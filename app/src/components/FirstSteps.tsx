import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'

const KEY = 'athle-first-steps-hidden'

/** Nouvel espace : les étapes pour personnaliser l'app (cochées automatiquement), jusqu'à ce que tout soit fait */
export function FirstSteps() {
  const { me, groups, athletes, tests, sessions, assignments } = useData()
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const steps = [
    { done: !!(me?.settings?.venues?.length || me?.settings?.group), to: '/reglages', label: 'Régler ton espace : lieux, saison, description du groupe' },
    { done: !!me?.training_info, to: '/reglages', label: 'Écrire l’organisation des entraînements (horaires, à prendre, absences)' },
    { done: groups.length > 0, to: '/athletes', label: 'Créer tes groupes' },
    { done: athletes.length > 0, to: '/athletes', label: 'Ajouter tes athlètes (liste à importer) et partager le lien d’inscription' },
    { done: tests.length > 0, to: '/tests', label: 'Choisir ta batterie de tests' },
    { done: sessions.length > 0, to: '/seances', label: 'Créer ou importer tes séances (Excel, Word, texte)' },
    { done: assignments.length > 0, to: '/planning', label: 'Planifier une première séance' },
  ]
  const left = steps.filter((s) => !s.done).length
  if (hidden || left === 0) return null
  return (
    <section className="card form first-steps">
      <div className="row between">
        <b>Premiers pas · {steps.length - left}/{steps.length}</b>
        <button className="btn ghost small" onClick={() => { setHidden(true); try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } }}>Masquer</button>
      </div>
      <ul className="plain">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? 'muted' : ''}>
            <span className={`step-dot ${s.done ? 'done' : ''}`} aria-hidden>{s.done ? '✓' : ''}</span> {s.done ? s.label : <Link to={s.to}>{s.label}</Link>}
          </li>
        ))}
      </ul>
    </section>
  )
}
