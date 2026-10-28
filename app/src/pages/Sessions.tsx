import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { Icon } from '../components/Icon'
import { TRAINING_TYPES, trainingType, sessionRows } from '../lib/sessionLibrary'
import { defaultBlocks, errorMessage, uid } from '../lib/utils'

export function Sessions() {
  const { sessions, assignments, save, remove } = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async (focus = '') => {
    if (busy) return
    setBusy(true)
    try {
      const s = await save('sessions', { title: focus === 'Musculation' ? 'Nouvelle séance de musculation' : 'Nouvelle séance', objective: '', focus, duration_min: null, blocks: defaultBlocks() })
      nav(`/seances/${s.id}`)
    } catch (e) {
      alert(errorMessage(e))
    } finally { setBusy(false) }
  }

  const duplicate = async (id: string) => {
    const s = sessions.find((x) => x.id === id)
    if (!s) return
    const copy = await save('sessions', {
      title: `${s.title} (copie)`, objective: s.objective, focus: s.focus, duration_min: s.duration_min,
      blocks: s.blocks.map((b) => ({ ...b, id: uid(), items: b.items.map((it) => ({ ...it, id: uid() })) })),
    })
    nav(`/seances/${copy.id}`)
  }

  const del = async (id: string) => {
    const n = assignments.filter((a) => a.session_id === id).length
    if (!confirm(n ? `Cette séance est planifiée ${n} fois. Tout supprimer (planifications et retours) ?` : 'Supprimer cette séance ?')) return
    await remove('sessions', id)
  }

  const filtered = sessions.filter(s => `${s.title} ${s.objective} ${s.focus}`.toLocaleLowerCase('fr').includes(q.toLocaleLowerCase('fr')))
  const dateLabel = (date: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Sans date'

  return (
    <div className="training-library">
      <div className="row between wrap">
        <div><h1>Séances</h1><p className="muted">Choisis ton entraînement, retrouve tes séances par date.</p></div>
        <div className="row gap wrap">
          <Link className="btn" to="/exercices">Bibliothèque d’exercices</Link>
          <Link className="btn" to="/seances/import">Importer</Link>
          <button className="btn primary" disabled={busy} onClick={() => create()}>Créer une séance</button>
        </div>
      </div>
      <input className="search" aria-label="Rechercher une séance" placeholder="Rechercher une séance, un objectif…" value={q} onChange={e => setQ(e.target.value)} />
      {q && <p className="muted small" role="status">{filtered.length} séance(s) trouvée(s)</p>}
      <div className="training-tiles">
        {TRAINING_TYPES.map((type, index) => {
          const list = filtered.filter(s => trainingType(s) === type.name)
          const rows = sessionRows(list, assignments)
          const dates = [...new Set(rows.map(row => row.date))]
          return <details key={`${type.name}-${q ? 'search' : 'browse'}`} className={`training-tile training-color-${index}`} open={q ? list.length > 0 : undefined}>
            <summary>
              <span className="training-tile-icon"><Icon name={type.icon} size={26} /></span>
              <span className="training-tile-heading"><strong>{type.name}</strong><span className="muted small">{type.subtitle}</span></span>
              <span className="training-tile-count">{list.length}<span className="small muted"> {list.length === 1 ? 'séance' : 'séances'}</span></span>
              <span className="training-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div className="training-tile-body">
              <div className="row gap wrap training-tile-tools">
                <button className="btn small primary" disabled={busy} onClick={() => create(type.focus)}>Créer une séance{type.name === 'Musculation' ? ' de musculation' : ''}</button>
                {type.name === 'Musculation' && <Link className="btn small" to="/exercices?categorie=Musculation">Voir les exercices</Link>}
              </div>
              {!rows.length && <p className="muted small">{q ? 'Aucune séance ne correspond à cette recherche.' : 'Pas encore de séance dans cette catégorie.'}</p>}
              {dates.map(date => <section key={date || 'undated'} className="training-date-group">
                <h2>{dateLabel(date)}</h2>
                {rows.filter(row => row.date === date).map(({ session: s, assignment, source }) => <div className="training-session-row" key={assignment?.id ?? s.id}>
                  <div className="training-session-description">
                    <Link to={`/seances/${s.id}`}><strong>{s.title}</strong></Link>
                    <p className="muted small">{source === 'scheduled' ? `Planifiée · ${assignment?.time || 'heure à définir'}` : source === 'imported' ? 'Date du programme importé · à planifier' : 'Modèle à planifier'}{s.duration_min ? ` · ${s.duration_min} min` : ''} · {s.blocks.reduce((n, b) => n + b.items.length, 0)} exercices</p>
                    {s.objective && <p className="small muted">{s.objective}</p>}
                  </div>
                  <div className="row gap wrap">
                    <Link className="btn small" to={assignment ? `/planning?date=${assignment.date}` : `/planning?seance=${s.id}`}>{assignment ? 'Planning' : 'Planifier'}</Link>
                    <details className="row-menu"><summary className="btn small" aria-label={`Actions ${s.title}`}>•••</summary><div className="row-menu-content">
                      <Link className="btn small" to={`/seances/${s.id}`}>Modifier</Link>
                      <button className="btn small" onClick={() => duplicate(s.id).catch(e => alert(errorMessage(e)))}>Dupliquer</button>
                      <button className="btn small ghost danger" onClick={() => del(s.id).catch(e => alert(errorMessage(e)))}>Supprimer</button>
                    </div></details>
                  </div>
                </div>)}
              </section>)}
            </div>
          </details>
        })}
      </div>
      <p className="muted small">Classement d’après le titre et le thème. Les séances mêlant plusieurs disciplines sont dans « Autres séances ». Les dates affichées proviennent du planning ou du programme importé.</p>
    </div>
  )
}
