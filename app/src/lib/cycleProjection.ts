import {eggerStep} from './loadDynamics'
import {PHASES,HOLIDAYS,SOURCES,dayNumber,overlaps,targets,validDate,proposePreparation,type Phase,type SeasonPlan} from './season'
import type {Assignment,Competition,Availability,Athlete,TestResult,PersonalRecord,TestReport} from '../types'

export type Discipline='sprint'|'jumps'|'middle'|'throws'
export type DayIntent='quality'|'controlled'|'technical'|'recovery'|'competition'
export const DISCIPLINES:Record<Discipline,string>={sprint:'Sprint / haies',jumps:'Sauts',middle:'Demi-fond',throws:'Poids / javelot'}
export const INTENTS:Record<DayIntent,string>={quality:'Qualité prioritaire',controlled:'Développement contrôlé',technical:'Technique / entretien',recovery:'Récupération / repos à décider',competition:'Compétition'}
export interface ProjectionDay {date:string;focus:string;intent:DayIntent;phase?:Phase;sessionId?:string}
export interface ProjectionWeek {id:string;start:string;end:string;macro:string;blockId:string;phase:Phase;objective:string;review:string;role:'development'|'consolidation'|'recovery'|'specific';days:ProjectionDay[];context:string[];conflicts:string[];plannedCount:number;minutes:number|null;rpe:number|null}
export interface CycleProjection {id:string;name:string;athleteId:string;discipline:Discipline;basis:'season'|'target';signature:string;created:string;status:'draft'|'validated';recoveryEvery:number;targetDate?:string;weeks:ProjectionWeek[];athleteContext?:{asOf:string;signature:string;goals:string;events:string;testIds:string[];recordIds:string[];reportId?:string}}
export const shift=(date:string,days:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
const monday=(date:string)=>shift(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7))
export const phaseSignature=(plan:SeasonPlan)=>JSON.stringify({start:plan.start,end:plan.end,blocks:plan.blocks.map(b=>({id:b.id,start:b.start,end:b.end,phase:b.phase,athleteIds:[...b.athleteIds].sort(),cycle:b.cycle,notes:b.notes}))})
export const PHASE_GUIDES:Record<Phase,{purpose:string;progression:string;review:string;sourceIds:string[]}>= {
 extensive:{purpose:'Construire les capacités générales et stabiliser les apprentissages utiles à la discipline.',progression:'Egger décrit une dominante volume avec 3 semaines progressives puis 1 de récupération. Modèle historique adulte, à adapter ; ne pas augmenter automatiquement toutes les dimensions.',review:'Revoir assiduité, qualité technique et tolérance du travail avant la phase suivante.',sourceIds:['egger','youth','sprint']},
 intensive:{purpose:'Renforcer les capacités spécifiques et la qualité des efforts prioritaires.',progression:'Egger décrit une tendance dégressive sur 3 semaines : 2 semaines importantes puis récupération. La charge externe peut diminuer alors que la sollicitation interne reste forte.',review:'Vérifier la qualité des réalisations, les retours de fatigue et la récupération avant de privilégier l’expression explosive.',sourceIds:['egger','strength','youth']},
 explosive:{purpose:'Exprimer les qualités de vitesse, de puissance et la technique spécifique de compétition.',progression:'Repère Egger : tendance dégressive et récupération sur 3 semaines. Préserver la qualité et la vitesse d’exécution ; dégressif ne signifie pas ralentir les gestes.',review:'Comparer les réalisations spécifiques aux références personnelles, en tenant compte des conditions de mesure.',sourceIds:['egger','sprint','youth']},
 recovery:{purpose:'Dissiper la fatigue et faire le bilan du bloc précédent.',progression:'Choisir repos ou contenus allégés selon la situation ; aucun pourcentage de réduction n’est imposé.',review:'Recueillir les réponses individuelles avant la reprise du développement.',sourceIds:['youth','sprint']},
 taper:{purpose:'Préparer l’échéance en diminuant la fatigue résiduelle.',progression:'Ajuster le volume tout en conservant les repères spécifiques adaptés à l’athlète ; durée et modalités décidées par le coach.',review:'Confirmer disponibilité, sensations, logistique et réponse à l’affûtage. Les chiffres issus de l’endurance ne sont pas transférés aux autres disciplines.',sourceIds:['taper','sprint','youth']},
 competition:{purpose:'Organiser les compétitions, la récupération et l’entretien des acquis.',progression:'Repartir des dates réellement renseignées et de leur priorité individuelle ; réviser entre deux compétitions.',review:'Bilan de compétition et récupération avant de décider de la semaine suivante.',sourceIds:['sprint','youth']},
 camp:{purpose:'Organiser le camp autour d’objectifs explicites et de la récupération.',progression:'Confirmer le programme du camp, les moyens disponibles et les présences ; ne pas augmenter automatiquement le nombre de séances.',review:'Revoir charge réalisée, retours et récupération après camp.',sourceIds:['youth','sprint']},
 transition:{purpose:'Récupérer et préparer la reprise du prochain macrocycle.',progression:'Activités variées et reprise progressive à définir avec l’athlète.',review:'Bilan de la période, objectifs et disponibilité pour la suite.',sourceIds:['youth']},
}
// Choix éditoriaux d’organisation, proposés au coach : ces textes ne sont pas des protocoles validés.
const CONTENT:Record<Discipline,Record<'extensive'|'intensive'|'explosive',string[]>>={
 sprint:{extensive:['Technique de course et accélération','Coordination / technique de haies','Renforcement technique encadré','Préparation générale et mobilité'],intensive:['Accélération de qualité','Vitesse / haies spécifiques','Renforcement individualisé','Technique contrôlée et entretien'],explosive:['Vitesse spécifique, réalisations de qualité','Départs / enchaînements spécifiques','Entretien technique en salle','Repères de compétition et coordination']},
 jumps:{extensive:['Course d’élan et coordination','Appuis et apprentissages de saut','Renforcement technique encadré','Préparation générale et mobilité'],intensive:['Vitesse d’élan et appuis','Technique de saut spécifique','Renforcement individualisé','Coordination et technique contrôlée'],explosive:['Vitesse d’élan et impulsion de qualité','Enchaînements spécifiques au saut','Entretien technique en salle','Repères d’élan et préparation de compétition']},
 middle:{extensive:['Développement aérobie à individualiser','Technique de course et aisance aérobie','Renforcement technique encadré','Endurance adaptée et mobilité'],intensive:['Travail spécifique à l’épreuve, allures à définir','Technique de course et développement aérobie','Renforcement individualisé','Aérobie contrôlée et coordination'],explosive:['Repères d’allure de compétition','Vitesse / économie de course à individualiser','Entretien technique en salle','Préparation spécifique sans fatigue excessive']},
 throws:{extensive:['Coordination et gestuelle de lancer','Apprentissages poids / javelot','Renforcement technique encadré','Appuis, mobilité et préparation générale'],intensive:['Gestuelle spécifique et transfert de force','Enchaînements poids / javelot','Renforcement individualisé','Technique contrôlée et mobilité'],explosive:['Lancers spécifiques de qualité','Vitesse gestuelle et coordination','Entretien technique en salle','Repères de compétition et appuis']},
}
export function macroGroups(plan:SeasonPlan,athleteId:string){
 const bs=plan.blocks.filter(b=>!athleteId||targets(b,athleteId)).sort((a,b)=>a.start.localeCompare(b.start))
 return bs.map(b=>({block:b,macro:b.cycle||[...bs].reverse().find(p=>p.cycle&&p.start<=b.start)?.cycle||'Organisation de saison'}))
}
export function targetPlan(date:string,athleteId:string,lengths:{extensive:number;intensive:number;explosive:number;recovery:number;taper:number}):SeasonPlan{
 if(!validDate(date)||!Number.isInteger(lengths.taper)||lengths.taper<0||lengths.taper>3)throw new Error('Vérifie la date et la durée d’affûtage (0 à 3 semaines).')
 const blocks=proposePreparation(shift(date,-7*lengths.taper),athleteId?[athleteId]:[],lengths)
 const cycle=`Échéance ${date}`;blocks.forEach(b=>b.cycle=cycle)
 if(lengths.taper)blocks.push({id:crypto.randomUUID(),title:'Affûtage proposé',start:shift(date,-7*lengths.taper),end:shift(date,-1),phase:'taper',athleteIds:athleteId?[athleteId]:[],provisional:true,cycle,notes:'Durée choisie par le coach, à individualiser.'})
 blocks.push({id:crypto.randomUUID(),title:'Échéance choisie par le coach',start:date,end:date,phase:'competition',athleteIds:athleteId?[athleteId]:[],provisional:true,cycle,notes:'Date de scénario ; ne crée pas une compétition officielle.'})
 return{start:blocks[0].start,end:date,blocks}
}
export function projectCycles(options:{plan:SeasonPlan;athleteId:string;discipline:Discipline;recoveryEvery:number;assignments:Assignment[];competitions:Competition[];availability:Availability[];athleteAssignmentIds?:string[]}):ProjectionWeek[]{
 const {plan,athleteId,discipline,recoveryEvery,assignments,competitions,availability}=options
 if(!validDate(plan.start)||!validDate(plan.end)||plan.start>plan.end||dayNumber(plan.end)-dayNumber(plan.start)>730)throw new Error('Les dates du scénario doivent couvrir au maximum deux années.')
 if(![-1,0,3,4].includes(recoveryEvery))throw new Error('Choisir le repère Egger, sans cadence imposée, 2+1 ou 3+1.')
 const groups=macroGroups(plan,athleteId);const weeks:ProjectionWeek[]=[]
 for(let start=monday(plan.start);start<=plan.end;start=shift(start,7)){
  const end=shift(start,6),span={start:start<plan.start?plan.start:start,end:end>plan.end?plan.end:end}
  const active=groups.filter(g=>overlaps(g.block,span));const unique=[...new Set(active.map(g=>g.block.phase))]
  const main=[...active].sort((a,b)=>Number(b.block.athleteIds.includes(athleteId)&&!!athleteId)-Number(a.block.athleteIds.includes(athleteId)&&!!athleteId)||b.block.start.localeCompare(a.block.start))[0]
  if(!main)continue
  const phase=main.block.phase,guide=PHASE_GUIDES[phase]
  const index=Math.max(0,Math.floor((dayNumber(start)-dayNumber(monday(main.block.start)))/7))
  const allIndices=Array.from({length:7},(_,i)=>shift(start,i)).filter(d=>d>=span.start&&d<=span.end)
  const isRecovery=['recovery','taper','transition'].includes(phase)
  const unload=!isRecovery&&['extensive','intensive','explosive'].includes(phase)&&(recoveryEvery===-1?eggerStep(phase,index)?.recovery:recoveryEvery>0&&(index+1)%recoveryEvery===0)
  const role=isRecovery?'recovery':unload?'consolidation':['competition','camp'].includes(phase)?'specific':'development'
  const relevant=assignments.filter(a=>a.date>=span.start&&a.date<=span.end&&(!athleteId||options.athleteAssignmentIds?.includes(a.id)))
  const events=competitions.filter(c=>overlaps({start:c.date,end:c.end_date||c.date},span)&&(!athleteId||!c.athlete_ids.length||c.athlete_ids.includes(athleteId)))
  const holidays=HOLIDAYS.filter(h=>overlaps(h,span));const away=availability.filter(a=>athleteId&&a.athlete_id===athleteId&&a.status==='away'&&overlaps({start:a.start_date,end:a.end_date},span))
  const days=allIndices.filter(d=>[1,3,4,5].includes(new Date(d+'T12:00:00Z').getUTCDay())||relevant.some(a=>a.date===d)||events.some(c=>c.date<=d&&(c.end_date||c.date)>=d)).map(d=>{
   const offset=[1,3,4,5].indexOf(new Date(d+'T12:00:00Z').getUTCDay())
   const entry=active.filter(g=>g.block.start<=d&&g.block.end>=d).sort((a,b)=>Number(b.block.athleteIds.includes(athleteId)&&!!athleteId)-Number(a.block.athleteIds.includes(athleteId)&&!!athleteId)||b.block.start.localeCompare(a.block.start))[0]
   const dailyPhase=entry?.block.phase??phase
   const special=events.find(c=>c.date<=d&&(c.end_date||c.date)>=d)
   let focus:string,intent:DayIntent
   if(['extensive','intensive','explosive'].includes(dailyPhase)){focus=CONTENT[discipline][dailyPhase as 'extensive'|'intensive'|'explosive'][offset]??'Créneau supplémentaire existant : revoir le contenu et la récupération';intent=offset===0||offset===1?'quality':offset===2?'technical':'controlled'}
   else{focus=PHASE_GUIDES[dailyPhase].purpose;intent=['recovery','transition','taper'].includes(dailyPhase)?'recovery':'technical'}
   if(unload&&!['recovery','transition','taper'].includes(dailyPhase)){focus='Consolider / alléger : '+focus;intent='technical'}
   if(special){focus=special.name;intent='competition'}
   return{date:d,focus,intent,phase:dailyPhase}
  })
  const conflicts:string[]=[]
  if(unique.length>1)conflicts.push('Changement ou superposition de phases dans cette semaine : vérifier l’articulation jour par jour.')
  if(holidays.length)conflicts.push('Vacances : confirmer présence, encadrement et matériel ; aucune séance n’est annulée automatiquement.')
  if(away.length)conflicts.push('Indisponibilité annoncée : revoir les journées concernées avant de planifier.')
  if(recoveryEvery===-1&&['extensive','intensive','explosive'].includes(phase)&&dayNumber(main.block.end)-dayNumber(end)<7&&!unload)conflicts.push('Le bloc se termine avant la récupération du repère Egger : vérifier la suite, sans prolongation automatique.')
  if(active.some(g=>g.block.phase==='camp'))conflicts.push('Programme du camp à confirmer ; aucune séance supplémentaire n’est créée automatiquement.')
  if(events.length)conflicts.push('Compétition réelle cette semaine : réviser les séances autour de ses dates et de sa priorité.')
  if(!days.length)conflicts.push('Aucun créneau habituel dans cette semaine partielle ; organiser explicitement la récupération ou la compétition.')
  weeks.push({id:crypto.randomUUID(),start:span.start,end:span.end,macro:main.macro,blockId:main.block.id,phase,objective:unload?'Consolider les acquis et ajuster la fatigue avant la poursuite du bloc.':guide.purpose,review:guide.review,role,days,context:[...holidays.map(h=>'Vacances · '+h.title),...events.map(c=>'Compétition · '+c.name),...away.map(a=>`Indisponible ${a.start_date} – ${a.end_date}`)],conflicts,plannedCount:relevant.length,minutes:null,rpe:null})
 }
 return weeks
}
export function projectionIssues(p:CycleProjection):string[]{
 const issues:string[]=[]
 if(!p.name.trim()||!DISCIPLINES[p.discipline]||!p.weeks.length)issues.push('Le scénario doit avoir un nom, une discipline et des semaines.')
 for(const w of p.weeks){
  if(!validDate(w.start)||!validDate(w.end)||w.start>w.end||dayNumber(w.end)-dayNumber(w.start)>6||!PHASES[w.phase]||!w.objective.trim())issues.push('Vérifier les dates, la phase et l’objectif des microcycles.')
  if(w.minutes!=null&&(!Number.isInteger(w.minutes)||w.minutes<0||w.minutes>3000))issues.push('Durée hebdomadaire à vérifier (0 à 3000 minutes).')
  if(w.rpe!=null&&(!Number.isFinite(w.rpe)||w.rpe<1||w.rpe>10))issues.push('Effort hebdomadaire à vérifier (1 à 10).')
  for(const d of w.days)if(!validDate(d.date)||d.date<w.start||d.date>w.end||!INTENTS[d.intent]||!d.focus.trim())issues.push('Vérifier les journées du microcycle.')

 }
 return [...new Set(issues)]
}
export const cycleReferences=()=>SOURCES.filter(s=>['egger','strength','sprint','taper','youth','endurance2025','periodization2026'].includes(s.id))

/** Références individuelles datées : pas d’inférence de déficit ni de score inventé. */
export function athletePlanningContext(athlete:Athlete,asOf:string,results:TestResult[],records:PersonalRecord[],reports:TestReport[]){
 const eligible=results.filter(r=>r.athlete_id===athlete.id&&validDate(r.date)&&r.date<=asOf).sort((a,b)=>b.date.localeCompare(a.date))
 const latest=[...new Map(eligible.map(r=>r.test_id).map(id=>[id,eligible.find(r=>r.test_id===id)!])).values()]
 const marks=records.filter(r=>r.athlete_id===athlete.id&&validDate(r.date)&&r.date<=asOf).sort((a,b)=>b.date.localeCompare(a.date))
 const report=reports.filter(r=>r.athlete_id===athlete.id&&validDate(r.date)&&r.date<=asOf).sort((a,b)=>b.date.localeCompare(a.date))[0]
 const signature=JSON.stringify({goals:athlete.goals,events:athlete.events,results:latest.map(r=>({id:r.id,value:r.value,date:r.date})),records:marks.map(r=>({id:r.id,mark:r.mark,date:r.date})),report})
 return{asOf,signature,goals:athlete.goals,events:athlete.events,testIds:latest.map(r=>r.id),recordIds:marks.map(r=>r.id),reportId:report?.id,results:latest,records:marks,report}
}
export function disciplinesFromEvents(events:string):Discipline[]{
 const t=events.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 const out:Discipline[]=[]
 if(/sprint|haies|vitesse|\b(?:60|100|200|400)\s*m\b/.test(t))out.push('sprint')
 if(/saut|longueur|hauteur|perche|triple/.test(t))out.push('jumps')
 if(/demi.fond|endurance|\b(?:800|1500|3000)\s*m\b/.test(t))out.push('middle')
 if(/lancer|poids|javelot|disque|marteau/.test(t))out.push('throws')
 return out
}

/** Reconnaît seulement une phase explicitement écrite ; ne juge pas les exercices. */
export function statedTrainingPhase(text:string):Phase|null{
 const label=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 const found=Object.entries({extensive:/\bextens(?:if|ive)\b/,intensive:/\bintens(?:if|ive)\b/,explosive:/\bexplos(?:if|ive)\b/,recovery:/\brecuperation\b/,taper:/\baffutage\b/}).filter(([,pattern])=>pattern.test(label))
 return found.length===1?found[0][0] as Phase:null
}

/** Points à examiner, sans interdire une organisation choisie et justifiée par le coach. */
export function projectionWarnings(p:CycleProjection):string[]{
 const warnings:string[]=[]
 for(let i=1;i<p.weeks.length;i++){const before=p.weeks[i-1],after=p.weeks[i];if(['consolidation','recovery'].includes(before.role)&&['consolidation','recovery'].includes(after.role)&&dayNumber(after.start)-dayNumber(before.end)===1)warnings.push(`Semaines du ${before.start} et du ${after.start} : allègements successifs, confirmer qu’ils sont voulus plutôt qu’une récupération comptée deux fois.`)}
 for(const w of p.weeks){
  const demanding=w.days.filter(d=>['quality','competition'].includes(d.intent)).sort((a,b)=>a.date.localeCompare(b.date))
  for(let i=1;i<demanding.length;i++)if(dayNumber(demanding[i].date)-dayNumber(demanding[i-1].date)===1)warnings.push(`Semaine du ${w.start} : journées prioritaires consécutives, récupération à examiner.`)
  if(['recovery','consolidation'].includes(w.role)&&w.days.some(d=>d.intent==='quality'))warnings.push(`Semaine du ${w.start} : rôle d’allègement avec un contenu prioritaire maintenu, articulation à justifier.`)
 }
 return [...new Set(warnings)]
}
