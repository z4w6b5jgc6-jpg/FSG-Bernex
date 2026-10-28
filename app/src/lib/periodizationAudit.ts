import type { Assignment, Athlete, Session, SessionAdjustment, Feedback } from '../types'
import type { ProjectionWeek } from './cycleProjection'
import { statedTrainingPhase } from './cycleProjection'
import { actualLoad, PHASES } from './season'
import { athletesFor } from './utils'
export interface AuditIssue { kind:'phase'|'target'|'duration-trend'|'missing'; weekId:string; text:string; correction:string; assignmentId?:string }
export function auditPeriodization(weeks:ProjectionWeek[], data:{assignments:Assignment[];sessions:Session[];adjustments:SessionAdjustment[];feedback:Feedback[]}, athlete?:Athlete) {
 const issues:AuditIssue[]=[]
 const rows=weeks.map(week=>{
  const assignments=data.assignments.filter(a=>a.date>=week.start&&a.date<=week.end&&(!athlete||athletesFor(a,[athlete]).length))
  const sessions=assignments.map(assignment=>{
   const variant=athlete&&data.adjustments.find(x=>x.assignment_id===assignment.id&&x.athlete_id===athlete.id)
   const session=variant?variant.content:data.sessions.find(s=>s.id===assignment.session_id)
   const planCycle=variant?'':(session as Session|undefined)?.plan?.cycle??''
   const phase=session?statedTrainingPhase(`${session.title} ${session.objective} ${planCycle}`):null
   if(phase&&phase!==week.phase)issues.push({kind:'phase',weekId:week.id,assignmentId:assignment.id,text:`« ${session!.title} » : phase écrite ${PHASES[phase].label}, scénario ${PHASES[week.phase].label}.`,correction:'Vérifier le contenu, puis corriger le rattachement de phase ou adapter la séance. Changer seulement le titre ne corrige pas une dose.'})
   return {assignment,session,phase}
  })
  const complete=sessions.length>0&&sessions.every(x=>x.session?.duration_min!=null)
  const minutes=athlete&&complete?sessions.reduce((sum,x)=>sum+x.session!.duration_min!,0):null
  const feedback=athlete?data.feedback.filter(f=>f.athlete_id===athlete.id&&assignments.some(a=>a.id===f.assignment_id)):[]
  const known=feedback.map(actualLoad).filter((n):n is number=>n!==null)
  const load=known.length?known.reduce((a,b)=>a+b,0):null
  if(athlete&&minutes!=null&&week.minutes!=null&&minutes!==week.minutes)issues.push({kind:'target',weekId:week.id,text:`Durée programmée ${minutes} min ; cible du scénario ${week.minutes} min (écart ${minutes-week.minutes>0?'+':''}${minutes-week.minutes} min).`,correction:'Examiner les séances liées pour rapprocher leur durée de la cible, ou réviser la cible avec une justification. Cet écart ne détermine pas quelles répétitions retirer.',assignmentId:assignments[0]?.id})
  if(athlete&&assignments.length&&!complete)issues.push({kind:'missing',weekId:week.id,text:'Durée prévue absente sur au moins une séance : comparaison complète impossible.',correction:'Compléter les durées réelles des programmes ou préciser un autre indicateur de volume ; ne pas remplacer une valeur manquante par zéro.',assignmentId:sessions.find(x=>x.session?.duration_min==null)?.assignment.id})
  return {week,assignments,sessions,minutes,declaredLoad:load,reported:feedback.length,known:known.length}
 })
 // The change in hours is a review prompt, never proof of a mismatch in specific training volume.
 if(athlete)for(let i=1;i<rows.length;i++){
  const previous=rows[i-1],current=rows[i]
  if(previous.week.blockId!==current.week.blockId||previous.minutes==null||current.minutes==null)continue
  if(['intensive','explosive'].includes(current.week.phase)&&current.minutes>previous.minutes)issues.push({kind:'duration-trend',weekId:current.week.id,text:`La durée augmente de ${previous.minutes} à ${current.minutes} min dans ce bloc ${PHASES[current.week.phase].label}.`,correction:'Le repère Egger est dégressif : examiner le volume spécifique, les efforts et les récupérations. Une hausse de durée seule ne démontre pas une charge excessive ni une erreur de périodisation.',assignmentId:current.assignments[0]?.id})
 }
 return {rows,issues}
}
