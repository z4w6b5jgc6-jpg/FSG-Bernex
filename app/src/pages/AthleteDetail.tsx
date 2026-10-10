import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { FeedbackCard } from '../components/FeedbackCard'
import { EffortBars, SleepBars } from '../components/Charts'
import { ENERGY, SORENESS, STRESS } from '../components/WellnessCheckin'
import { Empty, GroupBadge } from '../components/ui'
import { AthleteForm } from './Athletes'
import { feedbackStreak } from '../lib/athlete'
import { athletesFor, errorMessage, formatShort, fullName, todayISO, whatsappUrl } from '../lib/utils'

export function AthleteDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { athletes, groups, assignments, sessions, feedback, wellness, records, athlete_notes, save, remove, loading } = useData()
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('')
  const a = athletes.find((x) => x.id === id)
  if (!a) return loading ? <p className="muted">Chargement…</p> : <Empty>Athlète introuvable. <Link to="/athletes">Retour</Link></Empty>

  const g = groups.find((x) => x.id === a.group_id)
  const today = todayISO()
  const mine = assignments.filter((x) => athletesFor(x, [a]).length > 0)
  const past = mine.filter((x) => x.date <= today).sort((x, y) => y.date.localeCompare(x.date))
  const fbs = feedback.filter((f) => f.athlete_id === a.id)
  const fbFor = (assignmentId: string) => fbs.find((f) => f.assignment_id === assignmentId)
  const done = fbs.filter((f) => f.completed).length
  const rpes = fbs.map((f) => f.rpe).filter((v): v is number => v != null)
  const avg = rpes.length ? (rpes.reduce((s, v) => s + v, 0) / rpes.length).toFixed(1) : '–'
  const well = wellness.filter((w) => w.athlete_id === a.id)
  const lastWell = [...well].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 7)
  const recs = records.filter((r) => r.athlete_id === a.id).sort((x, y) => y.date.localeCompare(x.date))
  const notes = athlete_notes.filter((n) => n.athlete_id === a.id).sort((x, y) => y.created_at.localeCompare(x.created_at))

  const addNote = async () => {
    if (!note.trim()) return
    try {
      await save('athlete_notes', { athlete_id: a.id, text: note.trim() })
      setNote('')
    } catch (e) {
      alert(errorMessage(e))
    }
  }
  const del = async () => {
    if (!confirm(`Retirer définitivement ${fullName(a)} du club, avec tous ses retours ? (Tu peux aussi simplement le/la désactiver.)`)) return
    await remove('athletes', a.id)
    nav('/athletes')
  }

  return (
    <div>
      <Link to="/athletes" className="muted small">← Athlètes</Link>
      <div className="hero">
        <div className="hero-avatar" style={{ background: a.color }}>{a.avatar}</div>
        <div>
          <h1>{fullName(a)} {!a.active && <span className="pill">inactif</span>}</h1>
          <div className="hero-sub">
            {g && <GroupBadge name={g.name} color={g.color} />}
            {a.birth_year && <span>{Number(today.slice(0, 4)) - a.birth_year} ans</span>}
            {a.events && <span>{a.events}</span>}
          </div>
        </div>
      </div>
      {a.goals && <div className="goal">🎯 <b>Objectif :</b> {a.goals}</div>}
      <div className="row gap wrap actions">
        {a.phone && <a className="btn small whatsapp" href={whatsappUrl(`Salut ${a.first_name} !`, a.phone)} target="_blank" rel="noreferrer">📲 WhatsApp</a>}
        <button className="btn small" onClick={() => setEditing(true)}>Modifier / groupe</button>
        <button className="btn small ghost danger" onClick={del}>Retirer du club</button>
      </div>

      <div className="stats">
        <div className="stat"><b>{done}</b><span>séances faites</span></div>
        <div className="stat"><b>{past.length ? Math.round((fbs.length / past.length) * 100) : 0}%</b><span>retours</span></div>
        <div className="stat"><b>{avg}</b><span>effort moyen</span></div>
        <div className="stat"><b>🔥 {feedbackStreak(mine, fbs)}</b><span>série</span></div>
      </div>

      <section>
        <h2>🌙 Bien-être</h2>
        {well.length === 0 ? <Empty>Pas encore de check-in.</Empty> : (
          <>
            <div className="card"><SleepBars wellness={well} /></div>
            <div className="card">
              <table className="table small">
                <tbody>
                  {lastWell.map((w) => (
                    <tr key={w.id}>
                      <td>{formatShort(w.date)}</td>
                      <td>😴 {w.sleep_hours ?? '–'} h</td>
                      <td>{w.energy ? ENERGY[w.energy] : '–'}</td>
                      <td className={(w.soreness ?? 0) >= 4 ? 'warn-text' : ''}>{w.soreness ? SORENESS[w.soreness] : '–'}</td>
                      <td className={(w.stress ?? 0) >= 4 ? 'warn-text' : ''}>{w.stress ? STRESS[w.stress] : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="tiny muted">Sommeil · énergie · courbatures · stress</p>
            </div>
          </>
        )}
      </section>

      <section>
        <h2>🏅 Records</h2>
        {recs.length === 0 ? <p className="muted small">Aucun record saisi.</p> : (
          <div className="card">
            <ul className="plain rows">
              {recs.map((r) => (
                <li key={r.id} className="row between"><span><b>{r.event}</b> <span className="muted small">{formatShort(r.date)}{r.competition && ` · ${r.competition}`}</span></span><span className="record-mark">{r.mark}</span></li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2>Effort ressenti</h2>
        <div className="card"><EffortBars assignments={mine} feedback={fbs} /></div>
      </section>

      <section>
        <h2>📝 Mes notes de suivi <span className="muted small">(privées)</span></h2>
        <div className="card form">
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Discussion objectifs, retour de blessure…" />
          <button className="btn small primary" onClick={addNote} disabled={!note.trim()}>Ajouter la note</button>
          {notes.map((n) => (
            <div key={n.id} className="note">
              <div className="tiny muted row between">{new Date(n.created_at).toLocaleDateString('fr-CH')}
                <button className="link tiny" onClick={() => confirm('Supprimer cette note ?') && remove('athlete_notes', n.id)}>supprimer</button>
              </div>
              {n.text}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Historique des séances</h2>
        {past.length === 0 ? <Empty>Aucune séance passée.</Empty> : (
          <div className="list">
            {past.map((x) => {
              const f = fbFor(x.id)
              const subtitle = <Link to={`/planning/${x.id}`}>{sessions.find((s) => s.id === x.session_id)?.title} · {formatShort(x.date)}</Link>
              return f ? <FeedbackCard key={x.id} fb={f} athlete={a} subtitle={subtitle} /> : (
                <div key={x.id} className="card muted">{subtitle} — ⏳ pas de retour</div>
              )
            })}
          </div>
        )}
      </section>

      {editing && <AthleteForm initial={a} onClose={() => setEditing(false)} />}
    </div>
  )
}
