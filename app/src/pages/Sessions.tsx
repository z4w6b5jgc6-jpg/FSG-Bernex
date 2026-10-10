import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { Empty } from '../components/ui'
import { FOCUSES } from '../data/defaults'
import { defaultBlocks, errorMessage, uid } from '../lib/utils'

export function Sessions() {
  const { sessions, assignments, save, remove } = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState('')

  const create = async () => {
    try {
      const s = await save('sessions', { title: 'Nouvelle séance', objective: '', focus: '', duration_min: 90, blocks: defaultBlocks() })
      nav(`/seances/${s.id}`)
    } catch (e) {
      alert(errorMessage(e))
    }
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

  const filtered = sessions
    .filter((s) => (!focus || s.focus === focus) && s.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))

  return (
    <div>
      <div className="row between">
        <h1>Séances</h1>
        <button className="btn primary" onClick={create}>+ Nouvelle séance</button>
      </div>
      <div className="row gap filters">
        <input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={focus} onChange={(e) => setFocus(e.target.value)}>
          <option value="">Tous les thèmes</option>
          {FOCUSES.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <Empty>Aucune séance. Crée ta première séance type, tu pourras ensuite la réutiliser et la planifier autant de fois que tu veux.</Empty>
      ) : (
        <div className="cards">
          {filtered.map((s) => {
            const count = s.blocks.reduce((n, b) => n + b.items.length, 0)
            const used = assignments.filter((a) => a.session_id === s.id).length
            return (
              <div key={s.id} className="card">
                <Link to={`/seances/${s.id}`}><h3>{s.title}</h3></Link>
                <p className="muted small">
                  {[s.focus, s.duration_min && `${s.duration_min} min`, `${count} exercice(s)`, used && `planifiée ${used}×`].filter(Boolean).join(' · ')}
                </p>
                {s.objective && <p className="small">{s.objective}</p>}
                <div className="row gap wrap">
                  <Link className="btn small primary" to={`/planning?seance=${s.id}`}>📅 Planifier</Link>
                  <Link className="btn small" to={`/seances/${s.id}`}>Modifier</Link>
                  <button className="btn small" onClick={() => duplicate(s.id)}>Dupliquer</button>
                  <button className="btn small ghost danger" onClick={() => del(s.id)}>Supprimer</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
