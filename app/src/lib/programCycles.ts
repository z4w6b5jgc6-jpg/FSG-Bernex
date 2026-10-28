import type {Athlete,Assignment,Session,SessionAdjustment} from '../types'
import {dayNumber,validDate,overlaps,PHASES,type Phase,type SeasonPlan,type SeasonBlock} from './season'
import {trainingCycleCheck} from './planningPhases'

export interface ProgramData{athletes:Athlete[];assignments:Assignment[];sessions:Session[];session_adjustments:SessionAdjustment[]}
export interface ProgramEvidence{athleteId:string;assignmentId:string;sessionId:string;date:string;title:string;phase:Phase|null;version:string;variant:boolean;status:string}
export interface ProgramCycleProposal{key:string;start:string;end:string;phase:Phase;athleteIds:string[];evidence:ProgramEvidence[];observedDates:string[];duplicate:boolean;collisions:string[];commonConflicts:number}
export const programSignature=(rows:ProgramEvidence[],athleteIds:string[])=>JSON.stringify({athleteIds:[...athleteIds].sort(),refs:rows.map(r=>[r.athleteId,r.assignmentId,r.sessionId,r.date,r.phase,r.version,r.variant]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))})

/** Rapproche uniquement les phases écrites dans les programmes attribués.
 * Les jours non observés ne prouvent ni phase, ni récupération, ni dose. */
export function auditProgramCycles(plan:SeasonPlan,data:ProgramData,maxGap=10,athleteId=''){
 if(!validDate(plan.start)||!validDate(plan.end)||plan.start>plan.end)throw new Error('Vérifie les bornes de saison.')
 if(!Number.isInteger(maxGap)||maxGap<1||maxGap>21)throw new Error('Choisir un écart de regroupement entre 1 et 21 jours.')
 const people=data.athletes.filter(a=>a.active&&(!athleteId||a.id===athleteId)),rows:ProgramEvidence[]=[],unassigned:string[]=[],invalidDates:string[]=[]
 for(const assignment of data.assignments){
  if(!validDate(assignment.date)){invalidDates.push(assignment.id);continue}
  if(assignment.date<plan.start||assignment.date>plan.end)continue
  const audience=people.filter(a=>assignment.athlete_ids.includes(a.id)||!!assignment.group_id&&a.group_id===assignment.group_id)
  if(!audience.length){if(!athleteId)unassigned.push(assignment.id);continue}
  for(const person of audience){
   const variant=data.session_adjustments.find(v=>v.assignment_id===assignment.id&&v.athlete_id===person.id)
   const original=data.sessions.find(s=>s.id===assignment.session_id),session=variant?.content??original
   const check=trainingCycleCheck(plan,assignment.date,person.id,session)
   rows.push({athleteId:person.id,assignmentId:assignment.id,sessionId:assignment.session_id,date:assignment.date,title:session?.title??'Modèle introuvable',phase:check.stated,version:variant?.updated_at??original?.updated_at??'',variant:!!variant,status:check.status})
  }
 }
 rows.sort((a,b)=>(a.date+a.athleteId+a.assignmentId).localeCompare(b.date+b.athleteId+b.assignmentId))
 const proposals:ProgramCycleProposal[]=[],conflicts:{athleteId:string;date:string;evidence:ProgramEvidence[]}[]=[]
 for(const person of people){
  const own=rows.filter(r=>r.athleteId===person.id),dates=[...new Set(own.map(r=>r.date))].sort()
  let segment:ProgramEvidence[]=[]
  const flush=()=>{
   if(!segment.length)return
   const phase=segment[0].phase!,start=segment[0].date,end=segment.at(-1)!.date,key=programSignature(segment,[person.id])
   const duplicate=plan.blocks.some(b=>b.origin?.kind==='programs'&&b.origin.signature===key&&b.phase===phase&&b.start<=start&&b.end>=end&&b.athleteIds.includes(person.id))
   const collisions=plan.blocks.filter(b=>b.athleteIds.includes(person.id)&&overlaps(b,{start,end})&&!duplicate).map(b=>b.id)
   const commonConflicts=plan.blocks.filter(b=>!b.athleteIds.length&&b.phase!==phase&&overlaps(b,{start,end})).length
   proposals.push({key,start,end,phase,athleteIds:[person.id],evidence:segment,observedDates:[...new Set(segment.map(r=>r.date))],duplicate,collisions,commonConflicts});segment=[]
  }
  for(const date of dates){
   const atDate=own.filter(r=>r.date===date),phases=new Set(atDate.map(r=>r.phase).filter(Boolean))
   if(phases.size>1){flush();conflicts.push({athleteId:person.id,date,evidence:atDate});continue}
   if(atDate.some(r=>!r.phase)){flush();continue}
   if(segment.length&&(segment[0].phase!==atDate[0].phase||dayNumber(date)-dayNumber(segment.at(-1)!.date)>maxGap))flush()
   segment.push(...atDate)
  }
  flush()
 }
 return{rows,proposals,conflicts,unassigned,invalidDates,unknown:rows.filter(r=>!r.phase),differences:rows.filter(r=>r.status==='different')}
}

export function addProgramCycleDrafts(plan:SeasonPlan,data:ProgramData,keys:string[],maxGap:number,athleteId:string,reviewedAt:string):SeasonPlan{
 if(!validDate(reviewedAt))throw new Error('Date de revue invalide.')
 const audit=auditProgramCycles(plan,data,maxGap,athleteId),unique=[...new Set(keys)]
 const chosen=unique.map(key=>audit.proposals.find(p=>p.key===key))
 if(!chosen.length||chosen.some(p=>!p))throw new Error('Les programmes ont changé depuis la sélection. Refaire la revue.')
 if(chosen.some(p=>p!.duplicate||p!.collisions.length))throw new Error('Un bloc individuel existe déjà sur ces dates. Le revoir avant un nouvel ajout.')
 const blocks:SeasonBlock[]=chosen.map(proposal=>{
  const p=proposal!
  return{id:crypto.randomUUID(),title:`${PHASES[p.phase].label} · programmes rapprochés`,phase:p.phase,start:p.start,end:p.end,athleteIds:p.athleteIds,provisional:true,cycle:'Parcours issu des programmes',notes:`Bornes issues de ${p.observedDates.length} date(s) de séance observée(s). Écart maximal de regroupement choisi : ${maxGap} jours. Confirmer la continuité, les objectifs et la récupération entre ces dates.`,origin:{kind:'programs',signature:p.key,assignmentIds:[...new Set(p.evidence.map(r=>r.assignmentId))],reviewedAt,maxGap}}
 })
 return{...plan,blocks:[...plan.blocks,...blocks]}
}

export function sourceBlockState(block:SeasonBlock,data:ProgramData,plan:SeasonPlan,evidence?:ProgramEvidence[]){
 if(!block.origin)return 'manual' as const
 const rows=(evidence??auditProgramCycles(plan,data,block.origin.maxGap).rows).filter(r=>block.athleteIds.includes(r.athleteId)&&(block.origin!.assignmentIds.includes(r.assignmentId)||r.date>=block.start&&r.date<=block.end))
 if(programSignature(rows,block.athleteIds)!==block.origin.signature)return 'changed' as const
 if(rows.some(r=>r.phase!==block.phase||r.date<block.start||r.date>block.end))return 'changed' as const
 return 'current' as const
}

/** Comparaison indépendante de l’ordre des clés retournées par JSONB. */
export function planVersion(plan:SeasonPlan|null|undefined):string{
 const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,canonical(value)])):v
 return JSON.stringify(canonical(plan??null))
}
