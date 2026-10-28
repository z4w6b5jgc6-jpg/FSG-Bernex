import {Icon} from './Icon'
import {SessionIllustrations} from './SessionIllustrations'
import {previousExercise} from '../lib/workoutHistory'
import {latestVma,paceSeconds,parseMeters,vmaPercent,formatTime} from '../lib/vma'
import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import type { Session, SessionItem, ExerciseSet } from '../types'
import { errorMessage,itemSummary,formatDate } from '../lib/utils'
import { recoverySeconds,validateSets } from '../lib/workout'

export function WorkoutTracker({session,assignmentId,athleteId}:{session:Session;assignmentId:string;athleteId:string}){
 const {exercise_logs}=useData()
 const blocks=session.blocks.filter(b=>!/^remarques?$/i.test(b.title.trim())),items=blocks.flatMap(b=>b.items)
 const recorded=items.filter(item=>exercise_logs.some(l=>l.assignment_id===assignmentId&&l.athlete_id===athleteId&&l.item_id===item.id&&l.sets.some(s=>s.done))).length
 const [restUntil,setRestUntil]=useState<number|null>(null);const [now,setNow]=useState(Date.now)
 useEffect(()=>{if(restUntil==null)return;const id=setInterval(()=>{const value=Date.now();setNow(value);if(value>=restUntil)clearInterval(id)},1000);return()=>clearInterval(id)},[restUntil])
 const remaining=restUntil?Math.max(0,Math.ceil((restUntil-now)/1000)):0
 const startRest=(seconds:number)=>{setNow(Date.now());setRestUntil(Date.now()+seconds*1000)}
 return <div className="workout-tracker training-journal"><div className="journal-overview"><div><p className="eyebrow">TON JOURNAL DE SÉANCE</p><b>{recorded}<span> / {items.length}</span></b><small>exercices avec une réalisation enregistrée</small></div><button className="btn journal-finish" onClick={()=>document.getElementById('workout-feedback')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}>Fin de séance ↓</button><div className="journal-progress" aria-hidden="true"><span style={{width:`${items.length?100*recorded/items.length:0}%`}}/></div></div>
  {session.objective&&<p className="goal"><b>Objectif de la séance :</b> {session.objective}</p>}
  {restUntil!=null&&<div className="rest-timer" role="timer" aria-label="Récupération"><div><small>RÉCUPÉRATION</small><b>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</b></div><button type="button" className="btn small" onClick={()=>setRestUntil(restUntil+30000)}>+ 30 s</button><button type="button" className="btn small" onClick={()=>setRestUntil(null)}>Arrêter</button>{remaining===0&&<span>Temps écoulé — suis les consignes du coach.</span>}</div>}
  {blocks.map((b,index)=><section className="workout-block" key={b.id}><h2><span className="journal-block-index">{String(index+1).padStart(2,'0')}</span>{b.title}<small>{b.items.length} exercice(s)</small></h2><SessionIllustrations images={b.images}/>{b.items.map(item=><ExerciseTracker key={`${assignmentId}-${athleteId}-${item.id}`} item={item} assignmentId={assignmentId} athleteId={athleteId} startRest={startRest}/>)}</section>)}
 </div>
}
function ExerciseTracker({item,assignmentId,athleteId,startRest}:{item:SessionItem;assignmentId:string;athleteId:string;startRest:(seconds:number)=>void}){
 const {exercise_logs,assignments,save,tests,test_results}=useData()
 const previous=previousExercise(exercise_logs,assignments,athleteId,assignmentId,item.name)
 const previousSets=previous?.log.sets.filter(s=>s.done)??[]
 const reference=latestVma(tests,test_results.filter(r=>r.athlete_id===athleteId));const pct=vmaPercent(`${item.intensity} ${item.notes}`);const meters=parseMeters(item.distance);const pace=reference&&pct&&meters?formatTime(paceSeconds(reference.value,pct,meters)):null
 const existing=exercise_logs.find(r=>r.assignment_id===assignmentId&&r.athlete_id===athleteId&&r.item_id===item.id)
 const empty=(index:number):ExerciseSet=>({index,reps:null,load_kg:null,result:'',done:false})
 const [rows,setRows]=useState<ExerciseSet[]>(()=>existing?.sets??Array.from({length:/^\d+$/.test(item.sets)?Math.max(1,Math.min(30,+item.sets)):1},(_,i)=>empty(i+1)))
 const [showLoad,setShowLoad]=useState(()=>!!item.load_kg||!!existing?.sets.some(r=>r.load_kg!=null)||/squat|soulevé|developp|développ|muscul|presse|haltère|haltere|traction|arrach|épaul|epaul/i.test(item.name))
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const update=(i:number,p:Partial<ExerciseSet>)=>{setRows(rows.map((r,k)=>k===i?{...r,...p}:r));setDirty(true);setMessage('')}
 const persist=async()=>{const problem=validateSets(rows);if(problem)return setMessage(problem);setBusy(true);try{await save('exercise_logs',{id:existing?.id,assignment_id:assignmentId,athlete_id:athleteId,item_id:item.id,item_name:item.name,sets:rows});setDirty(false);setMessage('Réalisation enregistrée.')}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}}
 const rest=recoverySeconds(item.recovery)
 return <article className="exercise-tracker card"><div className="row between wrap"><h3><span className="exercise-title-icon"><Icon name="activity" size={18}/></span>{item.name}</h3><span className="pill">{rows.filter(r=>r.done).length}/{rows.length} cochées</span></div><p className="workout-prescription"><span className="tiny">PRÉVU</span>{itemSummary(item)||'Consignes à préciser avec le coach'}</p>{item.notes&&<p className="small muted">{item.notes}</p>}{pace&&<p className="my-pace">Pour toi : {pace} sur {meters} m à {pct} % VMA · test du {reference?.date}</p>}
  <div className="exercise-previous"><span>DERNIÈRE RÉALISATION</span>{previous?<><b>{formatDate(previous.assignment.date,{day:'numeric',month:'short'})}</b><p>{previousSets.slice(0,3).map((r,i)=>[r.reps!=null?`${r.reps} rép.`:'',r.load_kg!=null?`${r.load_kg} kg`:'',r.result].filter(Boolean).join(' · ')||`Série ${i+1} cochée sans mesure`).join(' / ')}{previousSets.length>3?` · +${previousSets.length-3} série(s)`:''}</p></>:<p>Aucune réalisation antérieure retrouvée pour cet exercice.</p>}</div>
  <div className={`set-grid set-head ${showLoad?'':'no-load'}`}><span>Série</span><span>Rép. réelles</span>{showLoad&&<span>kg</span>}<span>Résultat réel</span><span>Fait</span></div>
  {rows.map((row,i)=><div className={`set-grid ${showLoad?'':'no-load'} ${row.done?'set-done':''}`} key={i}><b>{i+1}</b><input type="number" inputMode="numeric" min="0" aria-label={`${item.name} série ${i+1} répétitions`} value={row.reps??''} placeholder={item.reps||'—'} onChange={e=>update(i,{reps:e.target.value===''?null:Number(e.target.value)})}/>{showLoad&&<input type="number" inputMode="decimal" min="0" step="0.5" aria-label={`${item.name} série ${i+1} charge en kg`} value={row.load_kg??''} placeholder="—" onChange={e=>update(i,{load_kg:e.target.value===''?null:Number(e.target.value)})}/>}<input aria-label={`${item.name} série ${i+1} résultat`} value={row.result} placeholder="temps / m…" onChange={e=>update(i,{result:e.target.value})}/><button type="button" className={`set-check ${row.done?'checked':''}`} aria-label={`${item.name} série ${i+1} faite`} aria-pressed={row.done} onClick={()=>{update(i,{done:!row.done});if(!row.done&&rest)startRest(rest)}}>{row.done?'✓':'○'}</button></div>)}
  <div className="row between wrap journal-exercise-actions"><button className="btn ghost small" type="button" onClick={()=>setShowLoad(!showLoad)}>{showLoad?'Masquer kg':'+ Charge kg'}</button><button className="btn ghost small" type="button" disabled={rows.length>=30} onClick={()=>{setRows([...rows,empty(rows.length+1)]);setDirty(true)}}>+ Ligne réalisée</button>{rest&&<button type="button" className="btn ghost small" onClick={()=>startRest(rest)}>Récupération {item.recovery}</button>}<button className="btn small primary" type="button" disabled={busy||!dirty} onClick={persist}>{busy?'Enregistrement…':'Enregistrer'}</button></div>
  {dirty&&<p className="tiny warn-text">Réalisation non enregistrée.</p>}{message&&<p className="small" role="status">{message}</p>}
 </article>
}
