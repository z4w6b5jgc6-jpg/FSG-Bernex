import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {useData} from '../lib/data'
import {TRAINING_KNOWLEDGE} from '../data/trainingKnowledge'
import {SOURCES} from '../lib/season'
import {cycleCandidates,runLocalCycleReview,type CycleReviewPick} from '../lib/localCycleReview'
import {unloadLocalAssistant} from '../lib/localAssistant'
import type {auditPeriodization} from '../lib/periodizationAudit'
import {errorMessage} from '../lib/utils'
export function LocalPeriodizationReview({audit,individual}:{audit:ReturnType<typeof auditPeriodization>;individual:boolean}){
 const {evidence_library}=useData()
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[picks,setPicks]=useState<CycleReviewPick[]>([]),[stamp,setStamp]=useState('')
 const version=useRef('')
 const candidates=cycleCandidates(audit.issues)
 const facts=audit.rows.slice(0,8).map(r=>({start:r.week.start,phase:r.week.phase,role:r.week.role,targetMinutes:r.week.minutes,targetRpe:r.week.rpe,plannedMinutes:r.minutes,declaredLoad:r.declaredLoad,knownReports:r.known,plannedSessions:r.assignments.length,sessions:r.sessions.slice(0,2).map(s=>({title:s.session?.title.slice(0,150),objective:s.session?.objective.slice(0,200),items:s.session?.blocks.flatMap(b=>b.items).slice(0,3).map(i=>({name:i.name.slice(0,80),sets:i.sets.slice(0,40),reps:i.reps.slice(0,40),distance:i.distance.slice(0,40),intensity:i.intensity.slice(0,40),recovery:i.recovery.slice(0,40)}))}))}))
 const fingerprint=JSON.stringify({candidates,facts,evidence_library})
 useEffect(()=>{version.current=fingerprint;return()=>{version.current=''}},[fingerprint])
 const stale=!!stamp&&stamp!==fingerprint
 const run=async()=>{const source=fingerprint;setBusy(true);setPicks([]);setMessage('');try{const result=await runLocalCycleReview(candidates,facts,evidence_library,setMessage);if(version.current!==source){setMessage('Les données ont changé pendant l’analyse : relance la revue.');return}setPicks(result);setStamp(source);setMessage('Revue locale terminée. Ce classement ne valide ni les doses ni la conformité physiologique.')}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}}
 return <section className="local-periodization-review">
  <h3>Revue IA appuyée sur les références</h3><p className="small">Le modèle local rapproche les écarts calculés des fiches documentaires et priorise les corrections à examiner. Les chiffres et les propositions affichés proviennent du contrôle vérifiable ; l’IA ne crée pas de dosage.</p>
  <details><summary>Base documentaire utilisée · {TRAINING_KNOWLEDGE.length} fiches + {evidence_library.filter(r=>r.reviewed&&r.review_note.trim()).slice(0,3).length} publication(s) évaluée(s) par le coach</summary>{TRAINING_KNOWLEDGE.map(k=><article className="card" key={k.id}><b>{k.title}</b><p className="small">{k.principle}</p><p className="small">Usage : {k.application}</p><p className="tiny muted">{k.limit}</p><a className="tiny" href={SOURCES.find(s=>s.id===k.sourceId)?.url} target="_blank" rel="noreferrer">{k.locator} · vérifié le {k.checked}</a></article>)}</details>
  <p className="tiny muted">WebGPU requis. Premier usage : téléchargement d’un modèle volumineux. L’inférence traite les données sur cet appareil ; aucune donnée individuelle n’est envoyée à une IA externe. Périmètre borné : {Math.min(audit.rows.length,8)} / {audit.rows.length} semaines résumées, 2 séances par semaine, 3 exercices par séance au maximum, {candidates.length} / {audit.issues.length} points proposés. Les autres restent dans l’audit complet. Les publications ajoutées restent à lire et à évaluer ; elles ne deviennent pas automatiquement des règles.</p>
  <button className="btn" disabled={busy||!individual||!candidates.length} onClick={run}>{busy?'Analyse locale…':'Charger le modèle et analyser les écarts'}</button> <button className="btn ghost small" disabled={busy} onClick={()=>unloadLocalAssistant().then(()=>setMessage('Modèle déchargé de la mémoire.'))}>Libérer la mémoire</button>
  {!individual&&<p className="tiny muted">Choisis d’abord un athlète pour la revue de charge individuelle.</p>}{message&&<p role="status" className="small">{message}</p>}{stale&&<p className="alert warn">Les données ou références ont changé : cette analyse doit être relancée.</p>}
  {!stale&&picks.map((pick,i)=>{const candidate=candidates.find(c=>c.id===pick.candidate_id),ref=TRAINING_KNOWLEDGE.find(k=>k.id===pick.reference_id);return candidate&&ref?<article className="card" key={pick.candidate_id}><span className="eyebrow">PRIORITÉ DE REVUE {i+1}</span><p><b>{candidate.fact}</b></p><p>{candidate.correction}</p><p className="small">Principe documenté : {ref.principle}</p><p className="tiny muted">{ref.limit}</p><a className="small" href={SOURCES.find(s=>s.id===ref.sourceId)?.url} target="_blank" rel="noreferrer">Vérifier la source · {ref.locator}</a>{candidate.assignmentId&&<p><Link className="btn small" to={`/planning/${candidate.assignmentId}`}>Décider de l’adaptation</Link></p>}</article>:null})}
 </section>
}
