import {programmeName,programmeTitle} from './periodizationOverview'
import type { Athlete, Assignment, Feedback, Session, SessionAdjustment } from '../types'
import { addDays, athletesFor, startOfWeek } from './utils'
import { actualLoad, dayNumber, HOLIDAYS, overlaps, PHASES, validDate, type Phase, type SeasonPlan } from './season'
import { trainingCycleCheck } from './planningPhases'
import { sessionContentDoses, summarizeContent, CONTENT_METRICS, type ContentMetric, type ContentDose } from './contentLoad'
export interface ContentReviewIssue {id:string;kind:'phase'|'volume'|'coverage'|'intensity'|'recovery';week:string;assignmentId?:string;itemId?:string;fact:string;suggestion:string;sourceIds:string[]}
export interface ProgramContentRow {assignment:Assignment;session:Session|SessionAdjustment['content']|undefined;variant:boolean;doses:ContentDose[];cycle:ReturnType<typeof trainingCycleCheck>}
export interface ProgramContentWeek {start:string;end:string;partial:boolean;rows:ProgramContentRow[];phase:string;metrics:Record<ContentMetric,ReturnType<typeof summarizeContent>>;declaredLoad:number|null;knownReports:number;holidays:string[];camp:boolean}
export interface ProgramContentData {athletes:Athlete[];assignments:Assignment[];sessions:Session[];adjustments:SessionAdjustment[];feedback:Feedback[]}
export function programPeriodization(plan:SeasonPlan,data:ProgramContentData,start:string,end:string,athleteId:string,options:{calendarConfirmed?:boolean;sourcePhases?:boolean;programme?:string}={}){
 if(!validDate(start)||!validDate(end)||start>end||dayNumber(end)-dayNumber(start)>370)throw new Error('Choisis une période valide de douze mois maximum.')
 const athlete=data.athletes.find(a=>a.id===athleteId)
 if(athleteId&&!athlete)throw new Error('Le parcours sélectionné n’est plus disponible.')
 const assignments=data.assignments.filter(a=>validDate(a.date)&&a.date>=start&&a.date<=end&&(!athlete||athletesFor(a,[athlete]).length)).sort((a,b)=>(a.date+a.time+a.id).localeCompare(b.date+b.time+b.id))
 const rows:ProgramContentRow[]=assignments.map(assignment=>{
  const variant=athlete&&data.adjustments.find(v=>v.assignment_id===assignment.id&&v.athlete_id===athlete.id)
  const session=variant?.content??data.sessions.find(s=>s.id===assignment.session_id)
  return {assignment,session,variant:!!variant,doses:session?sessionContentDoses(session):[],cycle:trainingCycleCheck(options.calendarConfirmed===false?undefined:plan,assignment.date,athleteId,session)}
 }).filter(row=>!options.programme||programmeName(row)===options.programme)
 const weeks:ProgramContentWeek[]=[]
 for(let date=startOfWeek(start);date<=end;date=addDays(date,7)){
  const from=date<start?start:date,to=addDays(date,6)>end?end:addDays(date,6),span={start:from,end:to}
  const own=rows.filter(r=>r.assignment.date>=from&&r.assignment.date<=to),doses=own.flatMap(r=>r.doses)
  const blocks=plan.blocks.filter(b=>overlaps(b,span)&&(athleteId?!b.athleteIds.length||b.athleteIds.includes(athleteId):!b.athleteIds.length))
  const explicit=[...new Set(own.map(r=>options.sourcePhases?r.cycle.stated:r.cycle.phase).filter((phase):phase is Phase=>phase!==null))]
  const phases=explicit.length?explicit:options.sourcePhases?[]:[...new Set(blocks.filter(b=>!['camp','competition'].includes(b.phase)).map(b=>b.phase))]
  const feedback=athlete?data.feedback.filter(f=>f.athlete_id===athlete.id&&own.some(r=>r.assignment.id===f.assignment_id)):[]
  const known=feedback.map(actualLoad).filter((n):n is number=>n!==null)
  weeks.push({start:from,end:to,partial:dayNumber(to)-dayNumber(from)<6,rows:own,phase:phases.length===1?phases[0]:phases.length?'mixed':'unknown',metrics:Object.fromEntries(Object.keys(CONTENT_METRICS).map(metric=>[metric,summarizeContent(doses,metric as ContentMetric)])) as ProgramContentWeek['metrics'],declaredLoad:known.length?known.reduce((n,v)=>n+v,0):null,knownReports:known.length,holidays:HOLIDAYS.filter(h=>overlaps(h,span)).map(h=>h.title),camp:plan.blocks.some(b=>b.phase==='camp'&&overlaps(b,span))})
 }
 const issues:ContentReviewIssue[]=[]
 const add=(issue:Omit<ContentReviewIssue,'id'>)=>issues.push({...issue,id:`P${issues.length+1}`})
 for(const week of weeks)for(const row of week.rows){
  const base={week:week.start,assignmentId:row.assignment.id}
  if(!row.session){add({...base,kind:'coverage',fact:'Le contenu de cette séance n’a pas été chargé.',suggestion:'Récupérer le programme avant d’évaluer sa charge ou sa cohérence.',sourceIds:['egger-internal']});continue}
  if(row.cycle.status==='different')add({...base,kind:'phase',fact:`${row.session.title} : phase écrite ${PHASES[row.cycle.stated!].label}, calendrier ${PHASES[row.cycle.phase!].label}.`,suggestion:'Comparer la finalité et les exercices à la phase souhaitée. Corriger le rattachement de cycle ou préparer une adaptation du contenu ; le changement d’étiquette seul ne change pas la charge.',sourceIds:['egger-extensive','egger-degressive','sprint-specificity']})
  if(row.cycle.status==='overlap')add({...base,kind:'phase',fact:'Plusieurs blocs de même priorité couvrent cette date.',suggestion:'Clarifier le cycle retenu avant de conclure à un écart de contenu.',sourceIds:['periodization-evidence']})
  const missing=row.doses.filter(d=>d.kind==='unknown'||!Object.keys(d.values).length&&d.kind!=='general')
  if(missing.length)add({...base,kind:'coverage',fact:`${missing.length} exercice(s) sans volume spécifique exploitable dans « ${row.session.title} ».`,suggestion:'Vérifier la modalité et les quantités indiquées dans le détail. Les totaux de cette séance restent partiels ; ne pas décider d’une réduction à partir de ce seul sous-total.',sourceIds:['egger-internal','youth-individualization']})
  const intensity=row.doses.filter(d=>!['general','unknown'].includes(d.kind)&&(!d.intensity||d.intensity.basis==='unknown'))
  if(intensity.length)add({...base,kind:'intensity',fact:`Intensité ou référence manquante / ambiguë sur ${intensity.length} exercice(s) de « ${row.session.title} ».`,suggestion:'Préciser l’intention d’exécution et la référence de chaque intensité : %VMA, %vitesse ou %1RM selon l’exercice. Aucun niveau cible n’est inventé.',sourceIds:['sprint-specificity','egger-internal']})
  const work=row.doses.filter(d=>!['general','unknown'].includes(d.kind))
  if((options.sourcePhases?row.cycle.stated:row.cycle.phase)==='explosive'&&work.length&&work.every(d=>d.kind==='running'&&d.intensity&&['VMA','RVA'].includes(d.intensity.basis)))add({...base,kind:'intensity',fact:`Dans « ${row.session.title} », la phase explosive est déclarée et les intensités de course renseignées utilisent uniquement VMA/RVA.`,suggestion:'Préciser la qualité spécifique recherchée : ces références ne caractérisent pas à elles seules la vitesse ou la puissance d’exécution. Vérifier s’il s’agit d’entretien aérobie volontaire ou si un contenu qualitatif spécifique manque ; adapter seulement après cette lecture.',sourceIds:['sprint-specificity','egger-degressive']})
  const recovery=row.doses.filter(d=>!['general','unknown'].includes(d.kind)&&!d.raw.recovery.trim())
  if(recovery.length)add({...base,kind:'recovery',fact:`Récupération non renseignée sur ${recovery.length} exercice(s) de « ${row.session.title} ».`,suggestion:'Préciser les récupérations entre efforts et entre séries en fonction du but de la séance. Vérifier leur articulation avec le volume et la qualité recherchée.',sourceIds:['sprint-specificity','egger-degressive']})
 }
 // Trends only for one athlete, adjacent full weeks, complete and comparable content.
 const observations:{week:string;metric:ContentMetric;text:string}[]=[]
 if(athlete)for(let i=1;i<weeks.length;i++){
  const before=weeks[i-1],after=weeks[i]
  if(before.partial||after.partial||!before.rows.length||!after.rows.length)continue
  if(['intensive','explosive','recovery','taper','transition'].includes(after.phase)){
   const previous=before.rows.flatMap(r=>r.doses),current=after.rows.flatMap(r=>r.doses)
   for(const dose of current){const matches=previous.filter(d=>d.name===dose.name&&d.kind===dose.kind),duplicates=current.filter(d=>d.name===dose.name&&d.kind===dose.kind);if(matches.length!==1||duplicates.length!==1)continue
    const earlier=matches[0]
    if(!dose.recovery||!earlier.recovery||!dose.intensity||!earlier.intensity||dose.intensity.basis==='unknown'||dose.count==null||earlier.count==null)continue
    if(dose.count!==earlier.count||dose.distance!==earlier.distance||dose.raw.load_kg!==earlier.raw.load_kg||dose.intensity.basis!==earlier.intensity.basis||dose.intensity.low!==earlier.intensity.low||dose.intensity.high!==earlier.intensity.high)continue
    if(dose.recovery.high<earlier.recovery.low)add({kind:'recovery',week:after.start,assignmentId:after.rows.find(r=>r.doses.includes(dose))?.assignment.id,itemId:dose.itemId,fact:`« ${dose.name} » : récupération écrite ${earlier.raw.recovery} → ${dose.raw.recovery}, avec quantités et référence d’intensité identiques.`,suggestion:'Cette hausse de densité modifie la sollicitation malgré un volume identique. Examiner le maintien de la récupération antérieure si l’objectif est la qualité ou l’allègement, ou justifier cette densité. La durée antérieure n’est pas un optimum scientifique.',sourceIds:['sprint-specificity','egger-internal','egger-degressive']})
   }
  }
  for(const metric of Object.keys(CONTENT_METRICS) as ContentMetric[]){
   const a=before.metrics[metric],b=after.metrics[metric]
   if(!a.complete||!b.complete||a.keys!==b.keys||a.value==null||b.value==null)continue
   const change=b.value-a.value
   observations.push({week:after.start,metric,text:`${CONTENT_METRICS[metric].label} : ${a.value} → ${b.value} ${CONTENT_METRICS[metric].unit} (${change>0?'+':''}${change}).`})
   const sameBlock=options.sourcePhases?before.phase===after.phase&&before.phase!=='unknown'&&before.phase!=='mixed':before.rows.some(r=>r.cycle.blocks.some(x=>after.rows.some(s=>s.cycle.blocks.some(y=>y.id===x.id))))
   const recovery=after.rows.every(r=>(options.sourcePhases?r.cycle.stated:r.cycle.phase)&&['recovery','taper','transition'].includes((options.sourcePhases?r.cycle.stated:r.cycle.phase)!)||(r.session as Session)?.plan?.light===true)
   if(change>0&&(sameBlock&&['intensive','explosive'].includes(after.phase)||recovery))add({kind:'volume',week:after.start,assignmentId:after.rows.find(r=>r.doses.some(d=>d.values[metric]!=null))?.assignment.id,fact:`${CONTENT_METRICS[metric].label} augmente de ${a.value} à ${b.value} ${CONTENT_METRICS[metric].unit}${recovery?' pendant une récupération/allègement déclaré':` dans le bloc ${PHASES[after.phase as keyof typeof PHASES].label}`}.`,suggestion:'Examiner cette hausse au regard de la tendance dégressive ou de l’allègement recherché. Si elle n’est pas intentionnelle, ajuster une dimension du volume des exercices concernés, en préservant l’intensité et les récupérations utiles à l’objectif. Le coach fixe la dose après lecture du contenu.',sourceIds:['egger-degressive','egger-internal','sprint-specificity']})
  }
 }
 const unplanned=data.sessions.filter(s=>!data.assignments.some(a=>a.session_id===s.id)&&s.plan?.date&&validDate(s.plan.date)&&s.plan.date>=start&&s.plan.date<=end&&(!options.programme||programmeTitle(s.title)===options.programme))
 return {weeks,rows,issues,observations,individual:!!athlete,unplanned,unknownItems:rows.flatMap(r=>r.doses).filter(d=>d.kind==='unknown').length,variants:athlete?rows.filter(r=>r.variant).length:data.adjustments.filter(v=>rows.some(r=>r.assignment.id===v.assignment_id)).length}
}
