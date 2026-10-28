import type {WeeklyDynamic} from '../lib/weeklyDynamics'
import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {useData} from '../lib/data'
import {runLocalCycleReview,type CycleReviewCandidate,type CycleReviewPick} from '../lib/localCycleReview'
import {TRAINING_KNOWLEDGE} from '../data/trainingKnowledge'
import {SOURCES} from '../lib/season'
import type {programPeriodization} from '../lib/programPeriodization'
import {errorMessage} from '../lib/utils'
export function ProgramContentAI({analysis,start,end,dynamics=[]}:{dynamics?:WeeklyDynamic[];analysis:ReturnType<typeof programPeriodization>;start:string;end:string}){
 const {evidence_library}=useData()
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[picks,setPicks]=useState<CycleReviewPick[]>([]),[stamp,setStamp]=useState('')
 const [selection,setSelection]=useState<string[]|null>(null)
 const choices=analysis.issues
 const selected=selection==null?choices.slice(0,3).map(i=>i.id):selection
 const candidates:CycleReviewCandidate[]=choices.filter(i=>selected.includes(i.id)).map(i=>({id:i.id,fact:`${i.week} · ${i.fact}`,correction:i.suggestion,references:i.sourceIds,assignmentId:i.assignmentId}))
 const facts={start,end,weeklyIntentions:dynamics.map(d=>({week:d.week,direction:d.direction,origin:d.origin,observed:d.observed,status:d.status,reason:d.reason})),metricTuple:'[observed value or null, quantified exercise count, eligible exercise count, complete]; physical units: running_m=m, running_reps=efforts, running_work_s=s, jump_attempts/throw_attempts/strength_reps=reps, tonnage_kg=kg',scope:analysis.individual?'individual':'common programmes; no group athlete load',weeks:analysis.weeks.map(w=>({start:w.start,end:w.end,phase:w.phase,partialWeek:w.partial,programmed:w.rows.length,metrics:Object.fromEntries(Object.entries(w.metrics).map(([key,value])=>[key,[value.value,value.known,value.total,value.complete]])),declaredLoad:w.declaredLoad,reports:w.knownReports,holiday:w.holidays,camp:w.camp})),evidence:[...new Set(choices.filter(i=>selected.includes(i.id)).map(i=>i.assignmentId).filter(Boolean))].map(id=>{const row=analysis.rows.find(r=>r.assignment.id===id);return {related:choices.filter(i=>i.assignmentId===id&&selected.includes(i.id)).map(i=>i.id),targets:row?.session?.targets,items:row?.doses.filter(d=>d.kind!=='general').map(d=>({name:d.name,kind:d.kind,source:d.kindSource,values:d.values,intensity:d.intensity,recovery:d.raw.recovery,quantities:d.raw}))}})}
 const fingerprint=JSON.stringify({facts,candidates,library:evidence_library})
 const current=useRef('');useEffect(()=>{current.current=fingerprint;return()=>{current.current=''}},[fingerprint])
 const stale=!!stamp&&stamp!==fingerprint
 const run=async()=>{const source=fingerprint;setBusy(true);setPicks([]);setMessage('');try{const result=await runLocalCycleReview(candidates,facts,evidence_library,setMessage);if(current.current!==source){setMessage('Les contenus ont changé : relance la revue.');return}setPicks(result);setStamp(source);setMessage('Revue locale terminée : les pistes restent à examiner avec les contenus et les sources.')}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}}
 return <details className="program-content-ai"><summary><b>Aide IA sur les contenus et les points à examiner</b></summary><p className="small">La synthèse chiffrée de toutes les {analysis.weeks.length} semaines est incluse. Points joints : {candidates.length}/{choices.length}. Choisis au maximum dix points ; leurs exercices, quantités, intensités et récupérations sont joints. Le modèle priorise des pistes fondées sur ces constats et les huit fiches documentaires. Il ne prescrit pas une dose optimale.</p>
  <div className="content-ai-choices">{choices.map(i=><label className="check" key={i.id}><input type="checkbox" checked={selected.includes(i.id)} disabled={busy||!selected.includes(i.id)&&selected.length>=10} onChange={e=>setSelection(e.target.checked?[...selected,i.id]:selected.filter(x=>x!==i.id))}/><span>{i.week} · {i.fact}</span></label>)}</div>
  <p className="tiny muted">IA locale WebGPU, après téléchargement explicite du modèle. Aucun contenu individuel n’est envoyé à une IA externe. Un contexte trop volumineux est refusé ; il faut alors sélectionner moins de points ou une période plus courte. Aucune donnée n’est tronquée en silence.</p>
  <button className="btn" disabled={busy||!candidates.length} onClick={run}>{busy?'Analyse locale…':'Charger le modèle et examiner ces contenus'}</button>
  {message&&<p role="status">{message}</p>}{stale&&<p className="alert warn">Les données ou le périmètre ont changé : relance la revue avant de retenir une piste.</p>}
  {!stale&&picks.map((pick,index)=>{const candidate=candidates.find(c=>c.id===pick.candidate_id),source=TRAINING_KNOWLEDGE.find(k=>k.id===pick.reference_id);return candidate&&source?<article className="card" key={pick.candidate_id}><span className="eyebrow">PISTE {index+1}</span><p><b>{candidate.fact}</b></p><p>{candidate.correction}</p><p className="small">{source.principle}</p><p className="tiny muted">{source.limit}</p><a className="small" href={SOURCES.find(s=>s.id===source.sourceId)?.url} target="_blank" rel="noreferrer">Vérifier la référence · {source.locator}</a>{candidate.assignmentId&&<p><Link className="btn small" to={`/planning/${candidate.assignmentId}`}>Préparer l’adaptation avec le coach</Link></p>}</article>:null})}
 </details>
}
