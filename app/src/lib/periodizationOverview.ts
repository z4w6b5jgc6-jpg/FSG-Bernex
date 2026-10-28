import type {ProgramContentRow, ProgramContentWeek} from './programPeriodization'
import {seriesName} from './series'
import {PHASES,type Phase} from './season'
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
export const WORK_THEMES=[
 {id:'speed',label:'Vitesse / accélération',color:'#62a6db'},
 {id:'strength',label:'Force / puissance',color:'#c59b54'},
 {id:'technique',label:'Technique course / sauts',color:'#45ad96'},
 {id:'endurance',label:'Aérobie / demi-fond',color:'#a997df'},
 {id:'throws',label:'Technique des lancers',color:'#dd8f9c'},
] as const
export type WorkTheme=typeof WORK_THEMES[number]['id']
export function programmeTitle(title:string){return seriesName(title.replace(/\s*—\s*adaptation\s+\d{4}-\d{2}-\d{2}$/,''))}
export function programmeName(row:ProgramContentRow){return programmeTitle(row.session?.title??'Contenu manquant')}
/** Presence of themes written in the exercise/block: no dose, priority or adaptation inferred. */
export function workThemeEvidence(row:ProgramContentRow,theme:WorkTheme){
 return row.doses.filter(d=>{
  if(d.kind==='general')return false
  const text=norm(`${d.block} ${d.name} ${d.raw.notes}`)
  if(theme==='speed')return /\b(?:sprint|vitesse|acceleration|accelerations|departs?)\b/.test(text)||d.kind==='running'&&d.intensity?.basis==='VITESSE'
  if(theme==='strength')return d.kind==='strength'||/\b(?:musculation|force|puissance|gainage|renforcement|pompes|squats?|fentes?|nordic|medecine.ball)\b/.test(text)
  if(theme==='technique')return d.kind==='jumps'||/\b(?:technique|educatifs?|coordination|gammes?|impulsion|longueur|haies|bonds?|multibonds|appuis|foulees|lattes|cones)\b|course[s]? d.elan/.test(text)
  if(theme==='endurance')return /\b(?:aerobie|endurance|fartlek|seuil|tempo|demi.fond)\b/.test(text)
  return d.kind==='throws'||/\b(?:lancers?|javelot|disque|vortex|marteau)\b|poussee (?:de |du )?poids/.test(text)
 })
}
export interface SourcePeriod {phase:Phase|'mixed'|'unknown';first:number;last:number;dates:string[];assignmentIds:string[];incomplete:boolean;label:string}
export const isLight=(row:ProgramContentRow)=>!!(row.session as {plan?:{light?:boolean}})?.plan?.light||/\ball[eé]g[eé](?:e|es|s)?\b/i.test(row.session?.objective??'')||row.cycle.stated==='recovery'
export function sourcePeriodization(weeks:ProgramContentWeek[],programme=''){
 const scoped=weeks.map(week=>({...week,rows:week.rows.filter(r=>!programme||programmeName(r)===programme)}))
 const periods:SourcePeriod[]=[]
 for(const [index,week]of scoped.entries()){
  const known=[...new Set(week.rows.map(r=>r.cycle.stated).filter((p):p is Phase=>p!==null))]
  const phase:SourcePeriod['phase']=known.length===1?known[0]:known.length?'mixed':'unknown'
  const incomplete=week.rows.some(r=>!r.cycle.stated)
  const label=phase==='mixed'?'Phases différentes':phase==='unknown'?'À préciser':PHASES[phase].label
  const previous=periods.at(-1)
  if(previous&&previous.phase===phase&&previous.incomplete===incomplete){previous.last=index;previous.dates.push(...week.rows.map(r=>r.assignment.date));previous.assignmentIds.push(...week.rows.map(r=>r.assignment.id))}
  else periods.push({phase,first:index,last:index,dates:week.rows.map(r=>r.assignment.date),assignmentIds:week.rows.map(r=>r.assignment.id),incomplete,label})
 }
 return {weeks:scoped,periods,themes:WORK_THEMES.map(theme=>({...theme,weeks:scoped.map(week=>{const rows=week.rows.filter(row=>workThemeEvidence(row,theme.id).length);return {present:rows.length>0,assignmentIds:rows.map(r=>r.assignment.id),exercises:rows.flatMap(row=>workThemeEvidence(row,theme.id).map(d=>d.name))}})}))}
}
export function plannedMinutes(rows:ProgramContentRow[]){
 const known=rows.filter(r=>r.session?.duration_min!=null)
 return {value:known.length?known.reduce((sum,r)=>sum+r.session!.duration_min!,0):null,complete:rows.length>0&&known.length===rows.length,known:known.length,total:rows.length}
}
