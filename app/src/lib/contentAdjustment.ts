import type {SessionItem} from '../types'
import type {SessionContent} from './adaptation'
export function contentFingerprint(value:unknown):string {
 const sort=(v:unknown):unknown=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,val])=>[k,sort(val)])):v
 return JSON.stringify(sort(value))
}
/** One explicit field of one exercise, chosen by the coach. No automatic percentage/dose. */
export function proposeContentAdjustment(source:SessionContent,blockIndex:number,itemIndex:number,field:'sets'|'reps',value:string):SessionContent {
 const item=source.blocks[blockIndex]?.items[itemIndex]
 if(!item||!/^\d+$/.test((item[field]??'').trim()))throw new Error('Le champ d’origine doit contenir un nombre entier reconnu.')
 if(!/^\d+$/.test(value)||Number(value)>1000)throw new Error('Choisis une quantité entière de 0 à 1000. Cette limite est un contrôle de saisie, pas une recommandation d’entraînement.')
 const next=structuredClone(source)
 const replacement:SessionItem={...item,[field]:String(Number(value))}
 next.blocks[blockIndex].items[itemIndex]=replacement
 return next
}

/** Reassign only this scheduled occurrence; its date, time and audience are preserved. */
export function scheduledAssignmentPatch(source:import('../types').Assignment,sessionId:string){
 if(!sessionId||sessionId===source.session_id)throw new Error('Une nouvelle copie de séance est requise.')
 return {id:source.id,session_id:sessionId,date:source.date,time:source.time,location:source.location,group_id:source.group_id,athlete_ids:[...source.athlete_ids],note:source.note,...(source.visible_from!==undefined?{visible_from:source.visible_from}:{})}
}

export type ExerciseEditField='sets'|'reps'|'distance'|'duration'|'intensity'|'recovery'|'name'|'notes'
/** Explicit coach edit also works for an exercise imported as free text. */
export function proposeManualExerciseEdit(source:SessionContent,blockIndex:number,itemIndex:number,field:ExerciseEditField,value:string):SessionContent{
 const allowed:ExerciseEditField[]=['sets','reps','distance','duration','intensity','recovery','name','notes']
 if(!allowed.includes(field)||!source.blocks[blockIndex]?.items[itemIndex])throw new Error('Exercice ou champ invalide.')
 if(value.length>5000)throw new Error('Le texte doit rester inférieur à 5000 caractères.')
 if(['sets','reps'].includes(field)&&(!/^\d+$/.test(value)||Number(value)>1000))throw new Error('Choisis une quantité entière de 0 à 1000.')
 if(field==='name'&&!value.trim())throw new Error('Le contenu de l’exercice ne peut pas être vide.')
 const next=structuredClone(source)
 next.blocks[blockIndex].items[itemIndex]={...next.blocks[blockIndex].items[itemIndex],[field]:value}
 return next
}
