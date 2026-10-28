import type { AiAdvice, Session, SessionItem } from '../types'
import { TRAINING_KNOWLEDGE } from '../data/trainingKnowledge'

export const AI_FIELDS = ['name','sets','reps','distance','duration','recovery','intensity','notes','load_kg'] as const
export type AIField = typeof AI_FIELDS[number]
export type AISession = Pick<Session,'title'|'objective'|'focus'|'duration_min'|'blocks'>
/** Strict projection : pas de profils, cibles individuelles, illustrations ou notes privées du coach. */
export function sessionForAI(s:AISession):AISession {
 return {title:s.title,objective:s.objective,focus:s.focus,duration_min:s.duration_min,blocks:s.blocks.map(b=>({id:b.id,title:b.title,items:b.items.map(i=>({id:i.id,load_kind:i.load_kind,...Object.fromEntries(AI_FIELDS.map(f=>[f,i[f]??'']))} as SessionItem))}))}
}
export function validateSessionAdvice(raw:unknown,session:AISession):AiAdvice {
 if(!raw||typeof raw!=='object')throw new Error('Réponse IA illisible. Aucune modification appliquée.')
 const x=raw as Record<string,unknown>
 if(typeof x.resume!=='string'||x.resume.length>12000||!Array.isArray(x.suggestions)||x.suggestions.length>10)throw new Error('Réponse IA incomplète ou trop longue.')
 const seen=new Set<string>()
 const suggestions=x.suggestions.map((v:unknown)=>{
  if(!v||typeof v!=='object')throw new Error('Proposition IA invalide.')
  const s=v as Record<string,unknown>
  for(const f of ['bloc','exercice','champ','valeur','proposition','pourquoi'])if(typeof s[f]!=='string'||(s[f] as string).length>3000)throw new Error('Proposition IA incomplète.')
  if(!Array.isArray(s.source_ids)||!s.source_ids.length||s.source_ids.some(id=>typeof id!=='string'||!TRAINING_KNOWLEDGE.some(k=>k.id===id)))throw new Error('Référence IA inconnue : proposition rejetée.')
  if(s.champ!==''){
   if(!AI_FIELDS.includes(s.champ as AIField)||typeof s.block_id!=='string'||typeof s.item_id!=='string')throw new Error('Modification IA non reconnue.')
   const b=session.blocks.find(b=>b.id===s.block_id),i=b?.items.find(i=>i.id===s.item_id)
   if(!i||b!.title!==s.bloc||i.name!==s.exercice)throw new Error('La proposition ne correspond pas à un exercice de cette séance.')
   const key=JSON.stringify([s.block_id,s.item_id,s.champ]);if(seen.has(key))throw new Error('Propositions contradictoires pour le même champ.');seen.add(key)
  }
  return s as unknown as AiAdvice['suggestions'][number]
 })
 return {resume:x.resume,suggestions}
}
