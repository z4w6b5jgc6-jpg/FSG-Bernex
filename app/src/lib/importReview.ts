import type {Assignment,Session,Block} from '../types'
import type {SessionIn} from './importSessions'
import {validDate} from './season'
export interface ImportScope {group_id:string|null;athlete_ids:string[]}
export const seriesKey=(title:string)=>{
 const squash=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')
 const m=title.match(/^(.*?\bS\d{1,2})\b/i)
 return m?squash(m[1]+(title.match(/·\s*(.+)$/)?.[1]??'')):squash(title)
}
export const sameScope=(a:ImportScope,b:ImportScope)=>a.group_id===b.group_id&&JSON.stringify([...a.athlete_ids].sort())===JSON.stringify([...b.athlete_ids].sort())
export const contentOf=(x:Pick<SessionIn,'title'|'objective'|'blocks'|'targets'>)=>JSON.stringify([x.title,x.objective,x.blocks.map(b=>[b.title,b.items.map(i=>[i.name,i.sets,i.reps,i.distance,i.duration,i.recovery,i.intensity,i.notes,i.load_kind,i.load_kg]),(b.images??[]).map(i=>[i.dataUrl,i.caption])]),(x.targets??[]).map(t=>[t.d,t.base,t.pct])])
/** Même série, même date ET même attribution : jamais le premier homonyme d’un autre groupe. */
export function plannedCandidates(row:SessionIn,scope:ImportScope,sessions:Session[],assignments:Assignment[]):Assignment[]{
 const matches=assignments.filter(a=>a.date===row.date&&sameScope(a,scope)&&seriesKey(sessions.find(s=>s.id===a.session_id)?.title??'')===seriesKey(row.title))
 return matches
}
export function plannedMatch(row:SessionIn,scope:ImportScope,sessions:Session[],assignments:Assignment[]):Assignment|undefined{
 const matches=plannedCandidates(row,scope,sessions,assignments);return matches.length===1?matches[0]:undefined
}
export function libraryMatch(row:SessionIn,sessions:Session[]):Session|undefined{
 const exactTitle=sessions.filter(s=>s.title===row.title)
 const exact=exactTitle.length?exactTitle:sessions.filter(s=>seriesKey(s.title)===seriesKey(row.title))
 return exact.find(s=>contentOf(s)===contentOf(row))??(exact.length===1?exact[0]:undefined)
}
export function cloneBlocks(blocks:Block[]):Block[]{return structuredClone(blocks).map(b=>({...b,id:crypto.randomUUID(),items:b.items.map(i=>({...i,id:crypto.randomUUID()})),...(b.images?{images:b.images.map(i=>({...i,id:crypto.randomUUID()}))}:{})}))}
export const dateProblem=(date:string)=>!!date&&!validDate(date)

/** Même inventaire, indépendamment de l’ordre de retour des requêtes. */
export function inventorySignature(sessions:Session[],assignments:Assignment[]):string{
 return JSON.stringify({sessions:[...sessions].sort((a,b)=>a.id.localeCompare(b.id)),assignments:[...assignments].sort((a,b)=>a.id.localeCompare(b.id))})
}
