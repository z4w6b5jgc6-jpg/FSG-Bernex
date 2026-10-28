import {Link} from 'react-router-dom'
import {useData} from '../lib/data'
import {HOLIDAYS, PHASES} from '../lib/season'
import {PHASE_GUIDES} from '../lib/cycleProjection'
import {dayCycle,trainingCycleCheck} from '../lib/planningPhases'
import {addDays,athletesFor,formatDate,fullName} from '../lib/utils'
import {Field} from './ui'

export function PlanningCycles({week,athleteId,onAthlete}:{week:string;athleteId:string;onAthlete:(id:string)=>void}) {
 const {me,athletes,assignments,sessions,session_adjustments}=useData()
 const plan=me?.settings?.season
 const days=Array.from({length:7},(_,i)=>addDays(week,i))
 const entries=assignments.filter(a=>a.date>=week&&a.date<=days[6]).flatMap(a=>{
  const audience=athletesFor(a,athletes).filter(p=>!athleteId||p.id===athleteId)
  const scopes=audience.length?audience.map(p=>({id:p.id,name:fullName(p)})):athleteId?[]:[{id:'',name:'Aucun athlète actif attribué'}]
  return scopes.map(p=>{
   const variant=session_adjustments.find(v=>v.assignment_id===a.id&&v.athlete_id===p.id)
   const session=variant?.content??sessions.find(s=>s.id===a.session_id)
   return {assignment:a,person:p,session,variant:!!variant,check:trainingCycleCheck(plan,a.date,p.id,session)}
  })
 })
 const warnings=entries.filter(e=>['different','overlap','missing-session','unplanned'].includes(e.check.status))
 const unknown=entries.filter(e=>e.check.status==='unspecified').length
 const blocks=[...new Map(days.flatMap(date=>dayCycle(plan,date,athleteId).blocks).map(b=>[b.id,b])).values()]
 const seasonLink=`/saison${athleteId?'?athlete='+encodeURIComponent(athleteId):''}`
 return <section className="card planning-cycles" aria-label="Cycles de la semaine">
  <div className="row between wrap"><div><p className="eyebrow">DU CYCLE À LA PISTE</p><h2>Le fil de la semaine</h2></div><Field label="Parcours du planning"><select value={athleteId} onChange={e=>onAthlete(e.target.value)}><option value="">Vue globale · socle commun</option>{athletes.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{fullName(a)}</option>)}</select></Field></div>
  {!plan&&<p className="alert info small">Enregistre d’abord tes phases dans Saison pour les rapprocher des séances programmées.</p>}
  <div className="planning-phase-days">{days.map(date=>{const cycle=dayCycle(plan,date,athleteId),holiday=HOLIDAYS.find(h=>h.start<=date&&h.end>=date),scheduled=entries.filter(e=>e.assignment.date===date),count=new Set(scheduled.map(e=>e.assignment.id)).size;return <div key={date} className="planning-phase-day" style={{borderTopColor:cycle.phase?PHASES[cycle.phase].color:undefined}}><span className="tiny muted">{formatDate(date,{weekday:'short',day:'numeric'})}</span><b>{cycle.ambiguous?'Blocs superposés':cycle.phase?PHASES[cycle.phase].label:'Phase à définir'}</b><span className="tiny">{count?`${count} séance(s)`:'Aucune séance programmée'}</span>{cycle.blocks.some(b=>b.provisional)&&<span className="tiny warn-text">Phase à valider</span>}{holiday&&<span className="tiny">Vacances · {holiday.title}</span>}</div>})}</div>
  {blocks.length>0&&<details className="planning-phase-purpose"><summary>Objectifs des phases de cette semaine</summary>{blocks.map(b=><div key={b.id}><b>{b.cycle?b.cycle+' · ':''}{b.title}</b><p className="small">{PHASE_GUIDES[b.phase].purpose}</p>{b.notes&&<p className="small muted">Consigne du coach : {b.notes}</p>}</div>)}</details>}
  <div className="row gap wrap"><Link className="btn small" to={seasonLink}>Développer les microcycles →</Link><span className="small muted">{new Set(entries.map(e=>e.assignment.id)).size} séance(s) liée(s) par date et attribution</span></div>
  {warnings.length>0&&<details className="alert warn small"><summary>{warnings.length} point(s) de rapprochement à examiner</summary><ul>{warnings.map(e=><li key={e.assignment.id+'|'+e.person.id}><Link to={`/planning/${e.assignment.id}`}>{formatDate(e.assignment.date)} · {e.session?.title??'Séance introuvable'}</Link> · {e.person.name}{e.variant?' · variante individuelle':''}<br/>{e.check.status==='different'?`Phase écrite : ${PHASES[e.check.stated!].label} ; cycle : ${PHASES[e.check.phase!].label}. Articulation à examiner.`:e.check.status==='overlap'?'Plusieurs blocs de même portée couvrent cette date : préciser le cycle.':e.check.status==='unplanned'?'Aucun bloc de préparation pour ce parcours à cette date.':'Le modèle de cette séance est introuvable.'}</li>)}</ul></details>}
  {unknown>0&&<p className="tiny muted">{unknown} programme(s) individuel(s) sans phase écrite univoque : comparaison à compléter.</p>}
  <p className="tiny muted">{athleteId?'Le parcours individuel prévaut sur le socle commun.':'Le bandeau affiche le socle commun ; les points à examiner tiennent aussi compte des phases individuelles.'} Le rapprochement de libellés ne valide ni les doses ni l’adéquation physiologique. Les séances restent sous ta décision.</p>
 </section>
}
