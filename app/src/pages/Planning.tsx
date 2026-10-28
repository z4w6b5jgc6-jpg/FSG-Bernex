import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {validDate} from '../lib/season'
import { useData } from '../lib/data'
import { AssignmentForm } from '../components/AssignmentForm'
import { GroupBadge } from '../components/ui'
import { TrainingInfo } from '../components/TrainingInfo'
import {PlanningCycles} from '../components/PlanningCycles'
import {CoachWeekBoard} from '../components/CoachWeekBoard'
import type { Assignment } from '../types'
import { addDays, athletesFor, formatDate, startOfWeek, todayISO } from '../lib/utils'

export function Planning() {
  const { assignments: allAssignments, sessions, groups, athletes, feedback, competitions: allCompetitions,session_adjustments } = useData()
  const [params, setParams] = useSearchParams()
  const [athleteId,setAthleteId]=useState(params.get('athlete')??'')
  const [groupId,setGroupId]=useState(''),[search,setSearch]=useState('')
  const sessionFor=(a:Assignment)=>session_adjustments.find(v=>v.assignment_id===a.id&&v.athlete_id===athleteId)?.content??sessions.find(s=>s.id===a.session_id)
  const assignments=allAssignments.filter(a=>(!athleteId||athletesFor(a,athletes).some(p=>p.id===athleteId))&&(!groupId||a.group_id===groupId||athletesFor(a,athletes).some(p=>p.group_id===groupId))).filter(a=>`${sessionFor(a)?.title??''} ${groups.find(g=>g.id===a.group_id)?.name??''}`.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')))
  const competitions=allCompetitions.filter(c=>(!athleteId||!c.athlete_ids.length||c.athlete_ids.includes(athleteId))&&(!groupId||!c.athlete_ids.length||athletes.some(a=>a.group_id===groupId&&c.athlete_ids.includes(a.id))))
  const [view,setView]=useState<'board'|'calendar'>('board')
  const [week, setWeek] = useState(startOfWeek(validDate(params.get('date') ?? '') ? params.get('date')! : todayISO()))
  const [form, setForm] = useState<Partial<Assignment> | null>(
    params.get('seance') ? { athlete_ids:athleteId?[athleteId]:[],session_id: params.get('seance')!, date: validDate(params.get('date')??'')?params.get('date')!:todayISO() } : null,
  )
  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))

  const closeForm = () => {
    setForm(null)
    if (params.has('seance')) setParams({}, { replace: true })
  }

  return (
    <div className="planning-workspace">
      <p className="workspace-crumb">Espace entraîneurs <span>/</span> Organisation</p>
      <div className="row between wrap">
        <div><h1>Planning</h1><p className="small muted">Du cycle au programme de chaque athlète.</p></div>
        <div className="row gap wrap">
          <Link className="btn" to={`/bilan?date=${week}${athleteId?'&athlete='+encodeURIComponent(athleteId):''}`}>Bilan de la semaine</Link><Link className="btn" to="/planning/athletes">Qui fait quoi</Link>
          <Link className="btn" to="/planning/export">Excel</Link>
          <button className="btn primary" onClick={() => setForm({ group_id:athleteId?null:groupId||null,athlete_ids:athleteId?[athleteId]:[],date: today >= week && today <= addDays(week, 6) ? today : week })}>+ Planifier</button>
        </div>
      </div>
      <div className="season-planning-intro"><Link className="btn primary" to="/saison">Cycles et vue annuelle →</Link><Link className="btn" to="/seances/import">Importer Excel / Word</Link><span className="small muted">Lun. · mer. · jeu. · ven. / 18 h–20 h</span></div>
      <TrainingInfo />
      <div className="row gap wrap planning-view-tabs"><button className={`btn small ${view==='board'?'primary':''}`} onClick={()=>setView('board')}>Tableau de la semaine</button><button className={`btn small ${view==='calendar'?'primary':''}`} onClick={()=>setView('calendar')}>Calendrier</button></div>
      <div className="week-nav">
        <button className="btn small" aria-label="Semaine précédente" onClick={() => setWeek(addDays(week, -7))}>←</button>
        <span>
          {formatDate(week, { day: 'numeric', month: 'short' })} – {formatDate(addDays(week, 6), { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button className="btn small" aria-label="Semaine suivante" onClick={() => setWeek(addDays(week, 7))}>→</button>
        <button className="btn ghost small" onClick={() => setWeek(startOfWeek(today))}>Aujourd’hui</button>
      </div>

      <div className="work-board-toolbar"><label>Groupe<select aria-label="Groupe du planning" value={groupId} onChange={e=>{setGroupId(e.target.value);setAthleteId('')}}><option value="">Tous les groupes</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Athlète<select aria-label="Athlète du planning" value={athleteId} onChange={e=>setAthleteId(e.target.value)}><option value="">Vue d’ensemble</option>{athletes.filter(a=>a.active&&(!groupId||a.group_id===groupId)).map(a=><option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}</select></label><label className="work-board-search">Rechercher un programme<input aria-label="Rechercher un programme" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Séance, groupe…"/></label></div>
      <details className="planning-cycle-context"><summary>Cycles, vacances et points à vérifier</summary><PlanningCycles week={week} athleteId={athleteId} onAthlete={setAthleteId}/></details>

      {view==='board'&&<CoachWeekBoard week={week} athleteId={athleteId} groupId={groupId} search={search} onPlan={date=>setForm({date,group_id:athleteId?null:groupId||null,athlete_ids:athleteId?[athleteId]:[]})}/>}
      {view==='calendar'&&<div className="week">
        {days.map((d) => {
          const items = assignments.filter((a) => a.date === d).sort((a, b) => a.time.localeCompare(b.time))
          return (
            <div key={d} className={`day ${d === today ? 'today' : ''}`}>
              <div className="day-head">
                <span>{formatDate(d, { weekday: 'long', day: 'numeric' })}</span>
                <button className="btn ghost icon small" title="Planifier ce jour" onClick={() => setForm({ date: d,athlete_ids:athleteId?[athleteId]:[] })}>+</button>
              </div>
              {competitions.filter((c) => c.date <= d && (c.end_date || c.date) >= d).map((c) => (
                <Link key={c.id} to="/competitions" className={`slot comp-slot level-${c.level}`}>
                  <strong>{c.name}</strong>
                  <div className="small muted">Niveau {c.level}{c.location && ` · ${c.location}`}</div>
                </Link>
              ))}
              {items.map((a) => {
                const s = sessionFor(a)
                const g = groups.find((x) => x.id === a.group_id)
                const expected = athleteId?1:athletesFor(a, athletes).length
                const got = feedback.filter((f) => f.assignment_id === a.id&&(!athleteId||f.athlete_id===athleteId)).length
                return (
                  <Link key={a.id} to={`/planning/${a.id}`} className="slot">
                    <strong>{a.time && <span className="muted">{a.time} </span>}{s?.title ?? 'Séance supprimée'}</strong>
                    <div className="row gap small">
                      {g && <GroupBadge name={g.name} color={g.color} />}
                      {a.athlete_ids.length > 0 && <span className="muted">+{a.athlete_ids.length}</span>}
                      {d <= today && <span className="muted">{got}/{expected}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>}

      {form && <AssignmentForm initial={form} onClose={closeForm} />}
    </div>
  )
}
