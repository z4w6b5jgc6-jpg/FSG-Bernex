import {targets, type SeasonPlan} from './season'
import {statedTrainingPhase} from './cycleProjection'
import type {Session} from '../types'

/** Une phase individuelle remplace le socle commun ; deux blocs du même
 * niveau restent ambigus, même s’ils annoncent la même phase. */
export function dayCycle(plan:SeasonPlan|undefined,date:string,athleteId='') {
 const active=plan?.blocks.filter(b=>b.start<=date&&b.end>=date&&
  (athleteId?targets(b,athleteId):b.athleteIds.length===0))??[]
 const individual=athleteId?active.filter(b=>b.athleteIds.includes(athleteId)):[]
 const blocks=individual.length?individual:active
 return {blocks,ambiguous:blocks.length>1,phase:blocks.length===1?blocks[0].phase:null}
}

/** Comparaison de libellés explicites, jamais une classification des exercices. */
export function trainingCycleCheck(plan:SeasonPlan|undefined,date:string,athleteId:string,
 session:Pick<Session,'title'|'objective'|'plan'>|undefined) {
 const cycle=dayCycle(plan,date,athleteId)
 const text=session?`${session.title} ${session.objective} ${session.plan?.cycle??''}`:''
 const stated=session?statedTrainingPhase(text):null
 const status=!session?'missing-session':cycle.ambiguous?'overlap':!cycle.phase?'unplanned':
  !stated?'unspecified':stated===cycle.phase?'same':'different'
 return {...cycle,stated,status}
}
