import {AvailabilityPanel,LoadChart,ExerciseResults} from '../components/AthleteMonitoring'
import { Avatar } from '../components/Avatar'
import { useState } from 'react'
import { BackLink } from '../components/BackLink'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { FeedbackCard } from '../components/FeedbackCard'
import { EffortBars, SleepBars } from '../components/Charts'
import { ENERGY, SORENESS, STRESS } from '../components/WellnessCheckin'
import { Empty, GroupBadge } from '../components/ui'
import { ProfileTiles } from '../components/ProfileTiles'
import { AthleteSeriesCard } from '../components/AthleteSeriesCard'
import { ReportCard, ReportForm } from '../components/TestInsights'
import { AthleteForm } from './Athletes'
import { feedbackStreak } from '../lib/athlete'
import { athletesFor, errorMessage, formatShort, fullName, todayISO, whatsappUrl } from '../lib/utils'

export function AthleteDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { hash } = useLocation()
  const { athletes, groups, assignments, sessions, feedback, wellness, athlete_notes, test_reports, competitions, save, remove, loading } = useData()
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('')
  const [addReport, setAddReport] = useState(false)
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
  const upcoming = competitions.filter((c) => c.athlete_ids.includes(a.id) && (c.end_date || c.date) >= today).sort((x, y) => x.date.localeCompare(y.date))
  const reports = test_reports.filter((r) => r.athlete_id === a.id).sort((x, y) => y.date.localeCompare(x.date))
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
      <BackLink to="/athletes" label="Athlètes" />
      <div className="hero">
        <Avatar a={a} />
        <div>
          <h1>{fullName(a)} {!a.active && <span className="pill">inactif</span>}</h1>
          <div className="hero-sub">
            {g && <GroupBadge name={g.name} color={g.color} />}
            {a.birth_year && <span>{Number(today.slice(0, 4)) - a.birth_year} ans</span>}
            {a.events && <span>{a.events}</span>}
          </div>
        </div>
      </div>
      {a.goals && <div className="goal"><b>Objectif :</b> {a.goals}</div>}
      {!a.user_id && <div className="small"><span className="pill wrap">Pas encore inscrit·e dans l’app</span></div>}
      <div className="row gap wrap actions">
        {a.phone && <a className="btn small whatsapp" href={whatsappUrl(`Salut ${a.first_name} !`, a.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}
        <button className="btn small" onClick={() => setEditing(true)}>Modifier / groupe</button>
      </div>

      <ProfileTiles athlete={a} coach />

      {hash === '#seances' && <AthleteSeriesCard athlete={a} />}

      <section>
        <h2 className="section-title">Suivi</h2>
        <div className="kpis">
          <div><b>{done}</b><span>faites</span></div>
          <div><b>{past.length ? Math.round((fbs.length / past.length) * 100) + '%' : '—'}</b><span>retours</span></div>
          <div><b>{avg}</b><span>effort</span></div>
          <div><b>{feedbackStreak(mine, fbs)}</b><span>série</span></div>
        </div>
        {lastWell[0] && (
          <div className="rows">
            <div className="row-item">
              <span className="row-main">Dernier ressenti<small>{formatShort(lastWell[0].date)}</small></span>
              <span className="row-tags">
                {lastWell[0].sleep_hours != null && <span className="status grey">{lastWell[0].sleep_hours} h</span>}
                {lastWell[0].energy != null && <span className={`status ${lastWell[0].energy <= 2 ? 'orange' : 'green'}`}>{ENERGY[lastWell[0].energy]}</span>}
                {lastWell[0].soreness != null && <span className={`status ${lastWell[0].soreness >= 4 ? 'orange' : 'grey'}`}>{SORENESS[lastWell[0].soreness]}</span>}
                {lastWell[0].stress != null && lastWell[0].stress >= 4 && <span className="status blue">{STRESS[lastWell[0].stress]}</span>}
              </span>
            </div>
          </div>
        )}
        <div className="card"><b className="small">Effort ressenti</b><EffortBars assignments={mine} feedback={fbs} /></div>
      </section>

      {well.length > 0 && (
        <details className="section-fold">
          <summary>Bien-être <span className="muted small">(7 derniers)</span></summary>
          <div className="card"><SleepBars wellness={well} /></div>
          <div className="card">
            <table className="table small">
              <tbody>
                {lastWell.map((w) => (
                  <tr key={w.id}>
                    <td>{formatShort(w.date)}</td>
                    <td>{w.sleep_hours ?? '–'} h</td>
                    <td>{w.energy ? ENERGY[w.energy] : '–'}</td>
                    <td className={(w.soreness ?? 0) >= 4 ? 'warn-text' : ''}>{w.soreness ? SORENESS[w.soreness] : '–'}</td>
                    <td className={(w.stress ?? 0) >= 4 ? 'warn-text' : ''}>{w.stress ? STRESS[w.stress] : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="tiny muted">Sommeil · énergie · courbatures · stress</p>
          </div>
        </details>
      )}
      <details className="section-fold"><summary>Charge déclarée</summary><LoadChart athleteId={a.id} /></details>
      <details className="section-fold"><summary>Disponibilités et absences</summary><AvailabilityPanel athleteId={a.id} /></details>
      <details className="section-fold"><summary>Carnet d’exercices</summary><ExerciseResults athleteId={a.id} /></details>

      {upcoming.length > 0 && (
        <details className="section-fold">
          <summary>Compétitions <span className="muted small">({upcoming.length})</span></summary>
          <ul className="plain rows">
            {upcoming.map((c) => (
              <li key={c.id} className="row between">
                <span><span className={`level-badge level-${c.level} sm`}>{c.level}</span> <b>{c.name}</b>{c.entries?.[a.id] && <span className="muted small"> · {c.entries[a.id]}</span>}</span>
                <span className="small muted">{formatShort(c.date)}</span>
              </li>
            ))}
          </ul>
          <Link to="/competitions" className="small">Toutes les compétitions →</Link>
        </details>
      )}

      <details className="section-fold">
        <summary>Bilans de tests <span className="muted small">({reports.length}, visibles par l’athlète)</span></summary>
        <button className="btn small" onClick={() => setAddReport(true)}>+ Bilan</button>
        {reports.length > 0 && <div className="list">{reports.map((r) => <ReportCard key={r.id} report={r} editable />)}</div>}
      </details>

      <details className="section-fold">
        <summary>Notes privées <span className="muted small">({notes.length})</span></summary>
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
      </details>

      <details className="section-fold">
        <summary>Historique des séances <span className="muted small">({past.length})</span></summary>
        {past.length === 0 ? <p className="muted small">Aucune séance passée.</p> : (
          <div className="list">
            {past.map((x) => {
              const f = fbFor(x.id)
              const subtitle = <Link to={`/planning/${x.id}`}>{sessions.find((s) => s.id === x.session_id)?.title} · {formatShort(x.date)}</Link>
              return f ? <FeedbackCard key={x.id} fb={f} athlete={a} subtitle={subtitle} /> : (
                <div key={x.id} className="card muted">{subtitle} — pas de retour</div>
              )
            })}
          </div>
        )}
      </details>

      <div className="row end actions"><button className="btn small ghost danger" onClick={del}>Retirer du club</button></div>

      {editing && <AthleteForm initial={a} onClose={() => setEditing(false)} />}
      {addReport && <ReportForm initial={{}} athleteId={a.id} onClose={() => setAddReport(false)} />}
    </div>
  )
}
