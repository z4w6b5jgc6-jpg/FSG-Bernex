import { useState } from 'react'
import { useData } from '../lib/data'
import { HOLIDAYS, PHASES, actualLoad, dayNumber, overlaps, targets, type SeasonPlan } from '../lib/season'
import { addDays, athletesFor, formatDate } from '../lib/utils'

export function SeasonHistogram({ plan, athleteId, onWeek }: { plan: SeasonPlan; athleteId: string; onWeek: (date: string) => void }) {
 const {assignments,sessions,session_adjustments,athletes,feedback,competitions}=useData()
 const [metric,setMetric]=useState<'sessions'|'minutes'|'target'|'actual'>('sessions')
 const count=Math.max(1,Math.min(105,Math.ceil((dayNumber(plan.end)-dayNumber(plan.start)+1)/7)))
 const dates=Array.from({length:count},(_,i)=>addDays(plan.start,i*7))
 const athlete=athletes.find(a=>a.id===athleteId)
 const columns=dates.map(date=>{
  const span={start:date,end:addDays(date,6)}
  const active=plan.blocks.filter(b=>overlaps(b,span)&&(!athleteId||targets(b,athleteId)))
  const phase=active.filter(b=>!['camp','competition'].includes(b.phase)).sort((a,b)=>Number(!!b.athleteIds.length)-Number(!!a.athleteIds.length)||b.start.localeCompare(a.start))[0]??active.find(b=>b.phase==='competition')??active.find(b=>b.phase==='camp')
  const planned=assignments.filter(a=>a.date>=date&&a.date<=span.end&&(!athlete||athletesFor(a,[athlete]).length))
  const minutes=planned.map(a=>{const override=athleteId&&session_adjustments.find(x=>x.assignment_id===a.id&&x.athlete_id===athleteId);return (override?override.content:sessions.find(s=>s.id===a.session_id))?.duration_min})
  const target=plan.weekTargets?.[`${date}|${athleteId||'group'}`]
  const fbs=athleteId?feedback.filter(f=>f.athlete_id===athleteId&&planned.some(a=>a.id===f.assignment_id)):[]
  const known=fbs.map(actualLoad).filter((v):v is number=>v!==null)
  let value:number|null=planned.length
  let incomplete=false
  if(metric==='minutes'){value=minutes.some(m=>m!=null)?minutes.reduce<number>((n,m)=>n+(m??0),0):null;incomplete=minutes.some(m=>m==null)}
  if(metric==='target')value=target?.minutes!=null&&target?.rpe!=null?target.minutes*target.rpe:null
  if(metric==='actual'){value=athleteId&&known.length?known.reduce((a,b)=>a+b,0):null;incomplete=known.length<fbs.length||fbs.length<planned.filter(a=>a.date<=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'})).length}
  return {date,active,phase,value,incomplete,holiday:HOLIDAYS.filter(h=>overlaps(h,span)),events:competitions.filter(c=>overlaps({start:c.date,end:c.end_date||c.date},span)&&(!athleteId||!c.athlete_ids.length||c.athlete_ids.includes(athleteId))),camp:active.some(b=>b.phase==='camp')}
 })
 const max=Math.max(1,...columns.map(c=>c.value??0))
 const labels={sessions:'Séances prévues par sous-groupe',minutes:'Durée de contenus prévus · min',target:'Charge visée par le coach · UA',actual:'Charge déclarée individuelle · UA'}
 return <section className="histogram-panel card" aria-label="Histogramme de la saison">
  <div className="row between wrap"><div><p className="eyebrow">VUE D’ENSEMBLE</p><h2>La saison en un regard</h2></div><select aria-label="Mesure de l’histogramme" value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}>{Object.entries(labels).map(([k,v])=><option key={k} value={k} disabled={k==='actual'&&!athleteId}>{v}</option>)}</select></div>
  <div className="histogram-scroll" tabIndex={0} aria-label="Semaines de la saison"><div className="histogram-area">
   <div className="histogram-axis"><span>{max}</span><span>0</span></div>
   <div className="histogram-columns" style={{gridTemplateColumns:`repeat(${count},minmax(10px,1fr))`}}>
    {columns.map((c,i)=>{const title=`Semaine du ${formatDate(c.date)} · ${c.phase?PHASES[c.phase.phase].label:'Phase à préciser'} · ${c.value==null?'non renseigné':c.value}${c.incomplete?' (partiel)':''}${c.holiday.length?' · vacances':''}${c.camp?' · camp':''}`;return <button key={c.date} className={`histogram-column ${c.holiday.length?'vacation-week':''}`} title={title} aria-label={title} onClick={()=>onWeek(c.date)}>
     <span className="histogram-event">{c.events.length?'◆':c.camp?'●':''}</span>
     <span className={`histogram-bar ${c.value==null?'histogram-unknown':''} ${c.incomplete?'histogram-partial':''}`} style={{height:c.value==null?'5px':`${Math.max(c.value>0?2:0,c.value/max*145)}px`,backgroundColor:c.phase?PHASES[c.phase.phase].color:'var(--muted)'}}/>
     <span className="histogram-phase" style={{background:c.phase?PHASES[c.phase.phase].color:'var(--border)'}}/>
     <span className="histogram-month">{i===0||c.date.slice(0,7)!==columns[i-1].date.slice(0,7)?formatDate(c.date,{month:'short'}):''}</span>
    </button>})}
   </div>
  </div></div>
  <div className="season-legend">{Object.entries(PHASES).map(([k,v])=><span key={k}><i style={{background:v.color}}/>{v.label}</span>)}<span>◆ compétition · ● camp</span></div>
  <p className="tiny muted">Hauteur : {labels[metric].toLowerCase()}. Couleur : phase de préparation. Hachures : valeur inconnue ou partielle. Fond grisé : vacances. Clique une semaine pour les détails et les cibles. Aucune charge n’est déduite de la seule couleur d’une phase.</p>
 </section>
}
