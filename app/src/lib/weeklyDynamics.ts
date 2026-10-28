import type {ProgramContentWeek,ContentReviewIssue} from './programPeriodization'
import {sourcePeriodization,plannedMinutes,isLight,programmeName} from './periodizationOverview'
import {eggerStep} from './loadDynamics'
import type {ContentMetric} from './contentLoad'
import {CONTENT_METRICS} from './contentLoad'
import {startOfWeek} from './utils'
import {validDate} from './season'
export type DynamicsMeasure='planned_minutes'|'declared_load'|ContentMetric
export type IntentionDirection='increase'|'decrease'|'unload'|'stable'|'free'
export interface WeeklyIntention {direction:IntentionDirection;note:string}
export type WeeklyIntentions=Record<string,WeeklyIntention>
export const DIRECTION_LABELS:Record<IntentionDirection,string>={increase:'Progression',decrease:'Dégression',unload:'Allègement / récupération',stable:'Stabilisation',free:'Sans direction imposée'}
export const intentionKey=(week:string,athleteId:string,programme:string,measure:DynamicsMeasure)=>JSON.stringify([startOfWeek(week),athleteId,programme,measure])
export function validateWeeklyIntention(value:WeeklyIntention|null){if(value&&(!Object.hasOwn(DIRECTION_LABELS,value.direction)||typeof value.note!=='string'||value.note.length>2000))throw new Error('Intention invalide : vérifier la direction et le commentaire.')}
export function mergeWeeklyIntention(settings:import('./settings').ClubSettings,key:string,expected:WeeklyIntention|undefined,next:WeeklyIntention|null){
 let scope:unknown;try{scope=JSON.parse(key)}catch{throw new Error('Périmètre d’intention invalide.')}
 if(!Array.isArray(scope)||scope.length!==4||scope.some(s=>typeof s!=='string')||!validDate(scope[0])||!['planned_minutes','declared_load',...Object.keys(CONTENT_METRICS)].includes(scope[3]))throw new Error('Périmètre d’intention invalide.')
 validateWeeklyIntention(next)
 const current=settings.loadIntentions?.[key]
 if(current?.direction!==expected?.direction||current?.note!==expected?.note)throw new Error('Cette intention a été modifiée par un autre coach. Actualise les données avant d’enregistrer ; ton brouillon reste affiché.')
 const entries={...settings.loadIntentions};if(next)entries[key]=next;else delete entries[key]
 return {...settings,loadIntentions:entries}
}
export function dynamicsReading(week:ProgramContentWeek,measure:DynamicsMeasure,individual:boolean){
 if(measure==='planned_minutes')return {...plannedMinutes(week.rows),keys:''}
 if(measure==='declared_load')return {value:individual?week.declaredLoad:null,complete:individual&&week.rows.length>0&&week.knownReports===week.rows.length,keys:''}
 return week.metrics[measure]
}
export interface WeeklyDynamic {
 week:string;direction:IntentionDirection|'start'|'unknown';origin:'coach'|'source'|'egger'|'none';step:number|null;cycleLength:number|null;label:string;note:string
 observed:'increase'|'decrease'|'stable'|'unknown';value:number|null;previous:number|null;delta:number|null;percent:number|null;status:'review'|'same-direction'|'unassessed';reason:string;assignmentIds:string[]
}
const population=(week:ProgramContentWeek)=>week.rows.map(r=>`${programmeName(r)}|${r.assignment.group_id?'group:'+r.assignment.group_id:'people:'+r.assignment.athlete_ids.slice().sort().join(',')}`).sort().join(';;')
/** The historical pattern yields directions only, never athlete doses or bar heights. */
export function weeklyDynamics(weeks:ProgramContentWeek[],context:ProgramContentWeek[],measure:DynamicsMeasure,athleteId:string,programme:string,intentions:WeeklyIntentions={}):WeeklyDynamic[]{
 const source=sourcePeriodization(context)
 return weeks.map(week=>{
  const index=context.findIndex(w=>startOfWeek(w.start)===startOfWeek(week.start)),period=source.periods.find(p=>p.first<=index&&p.last>=index)
  const override=intentions[intentionKey(week.start,athleteId,programme,measure)]
  let direction:WeeklyDynamic['direction']='unknown',origin:WeeklyDynamic['origin']='none',step:number|null=null,cycleLength:number|null=null,note='Phase ou continuité non documentée : intention à préciser.'
  if(override){direction=override.direction;origin='coach';note=override.note||'Direction choisie par le coach pour cet indicateur.'}
  else if(week.rows.length&&week.rows.every(isLight)){direction='unload';origin='source';note='Allègement explicitement écrit dans toutes les séances de cette sélection.'}
  else if(period&&!period.incomplete&&period.phase!=='mixed'&&period.phase!=='unknown'&&week.rows.length){
   if(['recovery','taper','transition'].includes(period.phase)){direction='unload';origin='source';note='Période de récupération / affûtage / transition écrite dans les programmes.'}
   else{const reference=eggerStep(period.phase,index-period.first);if(reference){origin='egger';step=reference.step;cycleLength=reference.length;direction=reference.recovery?'unload':reference.step===1?'start':period.phase==='extensive'?'increase':'decrease';note=`Repère historique Egger proposé : ${period.phase==='extensive'?'3 semaines progressives + 1 récupération':'2 semaines importantes à tendance dégressive + 1 récupération'}. Calage sur la première semaine documentée du bloc, à revoir si la phase a commencé avant.`}}
  }
  const reading=dynamicsReading(week,measure,!!athleteId),before=index>0?context[index-1]:null,previous=before?dynamicsReading(before,measure,!!athleteId):null
  let observed:WeeklyDynamic['observed']='unknown',delta:number|null=null,percent:number|null=null,status:WeeklyDynamic['status']='unassessed',reason='Pas de semaine antérieure comparable.'
  if(before&&previous){
   if(week.partial||before.partial)reason='Semaine partielle : comparaison de direction suspendue.'
   else if(!reading.complete||!previous.complete||reading.value==null||previous.value==null)reason='Données absentes ou partielles : aucune conclusion de direction.'
   else if(!athleteId&&population(week)!==population(before))reason='Programmes ou publics différents : sélectionner un parcours comparable.'
   else if(measure!=='planned_minutes'&&measure!=='declared_load'&&reading.keys!==previous.keys)reason='Exercices différents : les totaux ne suffisent pas à comparer directement le stimulus.'
   else{
    delta=Math.round((reading.value-previous.value)*1e6)/1e6;percent=previous.value===0?null:Math.round(delta/previous.value*1000)/10;observed=delta>0?'increase':delta<0?'decrease':'stable'
    if(measure==='planned_minutes'&&origin!=='coach')reason='La durée des créneaux ne suffit pas à déduire la progression de charge. Choisis un volume de contenu comparable ou fixe une intention explicite sur les minutes.'
    else if(measure==='declared_load'&&origin!=='coach')reason='Le repère de volume externe ne prédit pas la charge interne déclarée. Une intention du coach est nécessaire pour cette comparaison.'
    else if(direction==='start'||direction==='free'||direction==='unknown')reason=direction==='start'?'Début / relance du motif : pas de variation imposée par rapport au bloc précédent.':direction==='free'?'Le coach n’impose pas de direction pour cette semaine.':'Direction attendue non définie.'
    else{const match=direction==='unload'?observed==='decrease':observed===direction;status=match?'same-direction':'review';reason=match?'Variation de cet indicateur dans le sens recherché ; cela ne valide pas la dose optimale.':`${DIRECTION_LABELS[direction]} recherchée, mais l’indicateur ${observed==='increase'?'augmente':observed==='decrease'?'diminue':'reste stable'}. Examiner le contenu et les autres dimensions avant d’adapter.`}
   }
  }
  return {week:week.start,direction,origin,step,cycleLength,label:direction==='start'?'Mise en charge':direction==='unknown'?'À préciser':DIRECTION_LABELS[direction],note,observed,value:reading.value,previous:previous?.value??null,delta,percent,status,reason,assignmentIds:week.rows.map(r=>r.assignment.id)}
 })
}
export function dynamicsIssues(dynamics:WeeklyDynamic[],measure:DynamicsMeasure):ContentReviewIssue[]{
 const unit=measure==='planned_minutes'?'min':measure==='declared_load'?'UA':CONTENT_METRICS[measure].unit
 return dynamics.filter(d=>d.status==='review').map(d=>({id:`D:${d.week}:${measure}`,kind:'volume',week:d.week,assignmentId:d.assignmentIds[0],fact:`${d.label} recherchée sur ${unit} : ${d.previous} → ${d.value} ${unit}${d.percent==null?'':` (${d.percent>0?'+':''}${d.percent} %)`}.`,suggestion:`${d.origin==='egger'?'Le repère Egger est une proposition à contextualiser. ':''}${d.reason} Vérifier les exercices de cette semaine, puis ajuster une dimension utile ou préciser l’intention du coach. Aucune quantité optimale n’est déduite de cet écart.`,sourceIds:d.direction==='increase'?['egger-extensive','egger-internal']:['egger-degressive','egger-internal']}))
}
