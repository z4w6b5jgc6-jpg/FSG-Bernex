import type {Athlete} from '../types'
import {weeklyReview,weekMonday,shiftDay,type ReviewData} from './weeklyReview'
import {dayNumber,validDate} from './season'

/** Résumé de pilotage factuel : aucune estimation de risque ni charge cible. */
export function managerCockpit(athletes:Athlete[],data:ReviewData,today:string,now:number,groupId='') {
 if(!validDate(today)||!Number.isFinite(now))throw new Error('Date du cockpit invalide.')
 const since=shiftDay(today,-6),starts=[...new Set([weekMonday(since),weekMonday(today)])]
 return athletes.filter(a=>a.active&&(!groupId||a.group_id===groupId)).map(athlete=>{
  const reviews=starts.map(start=>weeklyReview(athlete,start,today,data,now))
  const rows=reviews.flatMap(r=>r.rows).filter(r=>r.assignment.date>=since&&r.assignment.date<=today)
  const due=rows.filter(r=>r.started)
  const expected=due.filter(r=>r.feedbackExpected)
  const known=due.filter(r=>r.load!==null)
  const form=[...data.wellness].filter(w=>w.athlete_id===athlete.id&&w.date<=today&&dayNumber(today)-dayNumber(w.date)<=2).sort((a,b)=>b.date.localeCompare(a.date))[0]
  const away=data.availability.find(a=>a.athlete_id===athlete.id&&a.status==='away'&&a.start_date<=today&&a.end_date>=today)
  const pain=due.filter(r=>r.feedback?.pain?.trim()).map(r=>r.assignment.date).sort().at(-1)
  const signals:string[]=[]
  if(pain)signals.push(`Douleur signalée le ${pain}`)
  if(form?.energy!=null&&form.energy<=2)signals.push(`Énergie déclarée ${form.energy}/5`)
  if(form?.soreness!=null&&form.soreness>=4)signals.push(`Courbatures déclarées ${form.soreness}/5`)
  if(due.some(r=>r.issues.some(i=>/clarifier|partielle|hors des valeurs/.test(i))))signals.push('Données de réalisation à clarifier')
  const missing=expected.filter(r=>!r.feedback).length
  const attendanceMissing=due.filter(r=>!r.attendance).length
  const load=known.length?known.reduce((sum,r)=>sum+r.load!,0):null
  const daily=Array.from({length:7},(_,i)=>{const date=shiftDay(since,i),day=due.filter(r=>r.assignment.date===date),known=day.filter(r=>r.load!==null);return{date,planned:rows.some(r=>r.assignment.date===date),load:known.length?known.reduce((s,r)=>s+r.load!,0):null,partial:day.some(r=>r.load===null)}})
  return{athlete,rows,form,away,signals,missing,attendanceMissing,load,known:known.length,started:due.length,complete:due.length>0&&known.length===due.length,daily,expectedToday:rows.some(r=>r.assignment.date===today),needsReview:signals.length>0}
 })
}
