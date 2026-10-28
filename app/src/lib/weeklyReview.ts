import type {Athlete,Assignment,Session,Feedback,Attendance,ExerciseLog,SessionAdjustment,Wellness,Availability} from '../types'
import {actualLoad,dayNumber,validDate} from './season'
import {genevaTime} from './release'

export interface ReviewData{assignments:Assignment[];sessions:Session[];feedback:Feedback[];attendance:Attendance[];exercise_logs:ExerciseLog[];session_adjustments:SessionAdjustment[];wellness:Wellness[];availability:Availability[]}
export interface ReviewedTraining {assignment:Assignment;session:Session|SessionAdjustment['content']|undefined;feedback:Feedback|undefined;attendance:Attendance|undefined;logs:ExerciseLog[];started:boolean;feedbackExpected:boolean;actualMinutes:number|null;load:number|null;issues:string[];linkedHistorically:boolean;changedAfter:boolean}
export interface WeeklyReview{athlete:Athlete;start:string;end:string;asOf:string;rows:ReviewedTraining[];started:number;expectedReturns:number;returns:number;missingReturns:number;present:number;attendanceTaken:number;completed:number;actualMinutes:number|null;minutesKnown:number;minutesComplete:boolean;load:number|null;loadKnown:number;loadMissing:number;complete:boolean;latestWellness:Wellness|undefined;points:string[]}
export const shiftDay=(date:string,days:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export const weekMonday=(date:string)=>shiftDay(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7))
const latest=<T extends {updated_at?:string}>(rows:T[])=>[...rows].sort((a,b)=>(b.updated_at??'').localeCompare(a.updated_at??''))[0]
/** Décrit les données disponibles à la date de revue, sans déduire une dose ou un risque de blessure. */
export function weeklyReview(athlete:Athlete,start:string,asOf:string,data:ReviewData,now:number):WeeklyReview{
 if(!validDate(start)||!validDate(asOf)||!Number.isFinite(now))throw new Error('Date de revue invalide.')
 start=weekMonday(start);const end=shiftDay(start,6)
 const today=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Europe/Zurich'})
 const cutoff=asOf<today?genevaTime(shiftDay(asOf,1),'00:00').getTime()-1:now
 const effectiveAsOf=asOf<today?asOf:today
 const evidence=(id:string)=>data.feedback.some(f=>f.assignment_id===id&&f.athlete_id===athlete.id)||data.attendance.some(f=>f.assignment_id===id&&f.athlete_id===athlete.id)||data.exercise_logs.some(f=>f.assignment_id===id&&f.athlete_id===athlete.id)||data.session_adjustments.some(f=>f.assignment_id===id&&f.athlete_id===athlete.id)
 const attributed=(a:Assignment)=>a.athlete_ids.includes(athlete.id)||!!a.group_id&&a.group_id===athlete.group_id
 const assignments=data.assignments.filter(a=>a.date>=start&&a.date<=end&&(attributed(a)||evidence(a.id))).sort((a,b)=>(a.date+a.time+a.id).localeCompare(b.date+b.time+b.id))
 const rows:ReviewedTraining[]=assignments.map(assignment=>{
  const original=data.sessions.find(s=>s.id===assignment.session_id)
  const override=data.session_adjustments.find(s=>s.assignment_id===assignment.id&&s.athlete_id===athlete.id)
  const session=override?.content??original
  const fb=latest(data.feedback.filter(f=>f.assignment_id===assignment.id&&f.athlete_id===athlete.id))
  const att=latest(data.attendance.filter(f=>f.assignment_id===assignment.id&&f.athlete_id===athlete.id))
  const logs=data.exercise_logs.filter(f=>f.assignment_id===assignment.id&&f.athlete_id===athlete.id)
  const validTime=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(assignment.time)
  const started=validTime?genevaTime(assignment.date,assignment.time).getTime()<=cutoff:assignment.date<effectiveAsOf||assignment.date===effectiveAsOf&&!!fb
  // Une séance du jour sans retour n’est pas dite manquante avant le lendemain : pas de durée inventée.
  const feedbackExpected=assignment.date<effectiveAsOf||!!fb&&started
  const issues:string[]=[]
  if(att&&['absent','excused'].includes(att.status)&&fb?.completed)issues.push('Présence et réalisation déclarée à clarifier.')
  if(fb&&!fb.completed&&logs.some(l=>l.sets.some(s=>s.done)))issues.push('Séance déclarée non faite avec des séries cochées : vérifier une réalisation partielle.')
  if(fb&&!fb.completed&&(Number(fb.duration_min)>0||Number(fb.rpe)>0))issues.push('Retour « non faite » avec durée ou effort renseigné : charge à clarifier.')
  const validDose=!!fb&&(!fb.completed||fb.duration_min!=null&&fb.duration_min>0&&fb.duration_min<=600&&fb.rpe!=null&&fb.rpe>=1&&fb.rpe<=10)
  const load=started&&validDose&&!issues.some(i=>i.includes('charge à clarifier')||i.includes('réalisation partielle'))?actualLoad(fb!):null
  const actualMinutes=started&&fb?(fb.completed?(fb.duration_min!=null&&fb.duration_min>0&&fb.duration_min<=600?fb.duration_min:null):load===0?0:null):null
  if(started&&fb&&fb.completed&&load==null){const invalid=fb.duration_min!=null&&(!Number.isFinite(fb.duration_min)||fb.duration_min<=0||fb.duration_min>600)||fb.rpe!=null&&(!Number.isFinite(fb.rpe)||fb.rpe<1||fb.rpe>10);issues.push(invalid?'Durée ou effort hors des valeurs admises : à clarifier.':'Durée réelle ou effort non renseigné : charge incomplète.')}
  if(started&&!att)issues.push('Présence non relevée.')
  if(feedbackExpected&&!fb)issues.push('Retour après séance manquant.')
  const updated=override?.updated_at??original?.updated_at
  const changedAfter=!!updated&&updated.slice(0,10)>assignment.date&&started
  return{assignment,session,feedback:started?fb:undefined,attendance:started?att:undefined,logs:started?logs:[],started,feedbackExpected,actualMinutes,load,issues:started?issues:[],linkedHistorically:!attributed(assignment),changedAfter}
 })
 const due=rows.filter(r=>r.started),expected=due.filter(r=>r.feedbackExpected),known=due.filter(r=>r.feedback&&r.load!==null)
 const missed=expected.filter(r=>!r.feedback||r.load===null)
 const load=known.length?known.reduce((n,r)=>n+r.load!,0):null
 const minutesRows=due.filter(r=>r.actualMinutes!==null)
 const actualMinutes=minutesRows.length?minutesRows.reduce((n,r)=>n+r.actualMinutes!,0):null
 const wellnessCutoff=end<effectiveAsOf?end:effectiveAsOf
 const latestWellness=[...data.wellness].filter(w=>w.athlete_id===athlete.id&&w.date<=wellnessCutoff&&dayNumber(wellnessCutoff)-dayNumber(w.date)<=7).sort((a,b)=>b.date.localeCompare(a.date))[0]
 const points:string[]=[]
 if(expected.some(r=>!r.feedback))points.push('Compléter les retours après séance avant de conclure sur la charge.')
 if(due.some(r=>r.issues.some(i=>/clarifier|partielle|incohérent/.test(i))))points.push('Clarifier les données de réalisation incohérentes.')
 if(due.some(r=>r.feedback?.pain.trim()))points.push('Une douleur a été signalée : échanger avant de valider la suite.')
 if(latestWellness&&(latestWellness.energy!=null&&latestWellness.energy<=2||latestWellness.soreness!=null&&latestWellness.soreness>=4))points.push('Réponses de forme à revoir avec l’athlète ; seuils de tri, sans diagnostic.')
 if(!latestWellness&&due.length)points.push('Pas de questionnaire récent disponible ; ne pas supposer un bon état de forme.')
 if(rows.some(r=>r.linkedHistorically))points.push('Certaines séances sont retrouvées grâce aux relevés individuels malgré un changement d’affectation.')
 return{athlete,start,end,asOf:effectiveAsOf,rows,started:due.length,expectedReturns:expected.length,returns:due.filter(r=>!!r.feedback).length,missingReturns:expected.filter(r=>!r.feedback).length,present:due.filter(r=>r.attendance?.status==='present').length,attendanceTaken:due.filter(r=>!!r.attendance).length,completed:due.filter(r=>r.feedback?.completed).length,actualMinutes,minutesKnown:minutesRows.length,minutesComplete:due.length>0&&minutesRows.length===due.length,load,loadKnown:known.length,loadMissing:missed.length,complete:due.length>0&&due.every(r=>!!r.feedback&&r.load!==null),latestWellness,points}
}
export const reviewTitle=(start:string)=>`Bilan hebdomadaire — ${weekMonday(start)}`
export function reviewNote(review:WeeklyReview,action:string,decision:string,nextObjective:string,author:string):string{
 if(!decision.trim())throw new Error('Précise la décision sportive avant d’enregistrer le bilan.')
 return [reviewTitle(review.start),`Revue au ${review.asOf} · ${author}`,`Décision : ${action}`,decision.trim(),`Constats sportifs : ${review.completed} séance(s) déclarée(s) faite(s), ${review.present} présence(s) relevée(s), ${review.returns} retour(s), ${review.missingReturns} retour(s) manquant(s).`,`Charge déclarée disponible : ${review.load??'inconnue'} UA${review.complete?'':' · données partielles'}.`,`Objectif proposé pour la semaine suivante : ${nextObjective.trim()||'À définir'}.`,'Bilan privé des coachs ; aucune séance modifiée automatiquement.'].join('\n')
}
