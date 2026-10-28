import type { Session, SessionItem } from '../types'
export type LoadKind='running'|'jumps'|'throws'|'strength'|'general'|'unknown'
export type ContentMetric='running_m'|'running_reps'|'running_work_s'|'jump_attempts'|'throw_attempts'|'strength_reps'|'tonnage_kg'
export const CONTENT_METRICS:Record<ContentMetric,{label:string;unit:string;kind:LoadKind}>={running_m:{label:'Course · distance des efforts',unit:'m',kind:'running'},running_reps:{label:'Course · efforts renseignés',unit:'efforts',kind:'running'},running_work_s:{label:'Course · durée des efforts',unit:'s',kind:'running'},jump_attempts:{label:'Sauts / bonds · répétitions',unit:'rép.',kind:'jumps'},throw_attempts:{label:'Lancers · répétitions',unit:'rép.',kind:'throws'},strength_reps:{label:'Musculation · répétitions',unit:'rép.',kind:'strength'},tonnage_kg:{label:'Musculation · tonnage renseigné',unit:'kg',kind:'strength'}}
export const LOAD_KINDS:Record<LoadKind,string>={running:'Course',jumps:'Sauts / bonds',throws:'Lancers',strength:'Musculation',general:'Général / mobilité',unknown:'À classer'}
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const finite=(s:string)=>{const n=Number(s.trim().replace(',','.'));return /^\d+(?:[.,]\d+)?$/.test(s.trim())&&Number.isFinite(n)&&n<=Number.MAX_SAFE_INTEGER?n:null}
const count=(s:string)=>/^\d+$/.test(s.trim())&&Number.isSafeInteger(Number(s.trim()))?Number(s.trim()):null
export function meters(s:string):number|null{const m=s.trim().match(/^(\d+(?:[.,]\d+)?)\s*(m|km)$/i);if(!m)return null;const value=Number(m[1].replace(',','.'))*(m[2].toLowerCase()==='km'?1000:1);return Number.isFinite(value)&&value<=Number.MAX_SAFE_INTEGER?value:null}
export interface IntensityReading {basis:'VMA'|'RVA'|'1RM'|'VITESSE'|'effort-max'|'unknown';low:number|null;high:number|null;raw:string}
export function readIntensity(raw:string):IntensityReading|null{
 if(!raw.trim())return null
 const text=norm(raw).trim();const m=text.match(/^(\d+(?:[.,]\d+)?)(?:\s*[-–a]\s*(\d+(?:[.,]\d+)?))?\s*%\s*(?:de\s*(?:la\s*)?)?(vma|rva|1\s*rm|vitesse(?: maximale)?|vmax)?$/)
 if(m){const basis=m[3]?/1\s*rm/.test(m[3])?'1RM':m[3].startsWith('v')&&m[3]!=='vma'?'VITESSE':m[3].toUpperCase():'unknown';const low=Number(m[1].replace(',','.')),high=Number((m[2]??m[1]).replace(',','.'));return low<=high&&high<=300?{basis:basis as IntensityReading['basis'],low,high,raw}:{basis:'unknown',low:null,high:null,raw}}
 return {basis:/^(?:max|maximal|maximale|a fond)$/.test(text)?'effort-max':'unknown',low:null,high:null,raw}
}
export function strictRecovery(raw:string):{low:number;high:number}|null{
 const time=(s:string)=>{let m=s.trim().match(/^(\d+)\s*['’]\s*(\d{1,2})?\s*(?:["”])?$/);if(m)return Number(m[2]??0)<60&&Number.isSafeInteger(Number(m[1])*60+Number(m[2]??0))?Number(m[1])*60+Number(m[2]??0):null;m=s.trim().match(/^(\d+(?:[.,]\d+)?)\s*(min|mn|minutes?|s|sec|secondes?|["”])$/i);return m?Number(m[1].replace(',','.'))*(m[2].toLowerCase().startsWith('m')?60:1):null}
 const parts=raw.trim().split(/\s*(?:–|\sà\s|\s-\s)\s*/);if(parts.length>2)return null
 const low=time(parts[0]),high=parts.length===1?low:time(parts[1]);return low!=null&&high!=null&&low<=high?{low,high}:null
}
export function loadKind(item:SessionItem,block:string):{kind:LoadKind;source:string}{
 if(item.load_kind&&Object.hasOwn(LOAD_KINDS,item.load_kind))return {kind:item.load_kind,source:'Type confirmé dans la fiche'}
 const name=norm(item.name),context=norm(block)
 if(/echauff|retour au calme|prevention|mobilite|etirement/.test(context))return {kind:'general',source:'Bloc général ; exclu des volumes spécifiques'}
 const matches:LoadKind[]=[]
 if(/\b(?:sprint|course|courses|footing|fartlek|fractionne|acceleration|accelerations)\b/.test(name))matches.push('running')
 if(/\b(?:saut|sauts|bond|bonds|multibonds|pentabond|decabond|triplebond|cloche[ -]pied)\b/.test(name)&&!/course d.elan|sans saut/.test(name))matches.push('jumps')
 if(/\b(?:lancer|lancers|javelot|vortex|disque|marteau|medecine[ -]ball)\b|\bpoussee (?:de |du )?poids\b/.test(name))matches.push('throws')
 if(/\b(?:squat|squats|souleve de terre|hip thrust|traction|tractions|developpe|presse|pompes|tirage|nordic|fentes)\b/.test(name))matches.push('strength')
 if(matches.length===1)return {kind:matches[0],source:'Type repéré dans le nom, à vérifier'}
 if(matches.length>1)return {kind:'unknown',source:'Nom mêlant plusieurs modalités'}
 const blockMatches:LoadKind[]=[]
 if(/\b(?:vitesse|course|courses|sprint|endurance|demi.fond|400.?800)\b/.test(context))blockMatches.push('running')
 if(/\b(?:musculation|force)\b/.test(context))blockMatches.push('strength')
 if(/\b(?:bondissements|pliometrie|sauts)\b/.test(context))blockMatches.push('jumps')
 if(/\b(?:lancers)\b/.test(context))blockMatches.push('throws')
 return blockMatches.length===1?{kind:blockMatches[0],source:'Type repéré dans le titre du bloc, à vérifier'}:{kind:'unknown',source:'Modalité à préciser'}
}
export interface ContentDose {itemId:string;blockId:string;name:string;block:string;kind:LoadKind;kindSource:string;source:'fields'|'text'|'unknown';count:number|null;distance:number|null;values:Partial<Record<ContentMetric,number>>;intensity:IntensityReading|null;recovery:{low:number;high:number}|null;raw:{sets:string;reps:string;distance:string;load_kg:string;duration:string;intensity:string;recovery:string;notes:string};questions:string[]}
export function itemContentDose(item:SessionItem,block:{id:string;title:string}):ContentDose{
 const classification=loadKind(item,block.title),questions:string[]=[],raw={sets:item.sets??'',reps:item.reps??'',distance:item.distance??'',load_kg:item.load_kg??'',duration:item.duration??'',intensity:item.intensity??'',recovery:item.recovery??'',notes:item.notes??''}
 const sets=count(raw.sets),reps=count(raw.reps)
 let repetitions=sets!=null&&reps!=null?sets*reps:!raw.sets.trim()?reps:classification.kind==='running'&&!raw.reps.trim()?sets:null
 let distance=meters(raw.distance),source:ContentDose['source']=repetitions!=null?'fields':'unknown'
 // Strict single expression only. Extra quantities or ranges remain unknown.
 if(!raw.sets.trim()&&!raw.reps.trim()&&!raw.distance.trim()){
  const text=item.name.trim();const matches=[...text.matchAll(/(?:^|\s)(\d+)\s*[x×]\s*(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(km|m)\b/gi)]
  if(matches.length===1&&classification.kind==='running'){const match=matches[0],rest=(text.slice(0,match.index)+text.slice(match.index!+match[0].length)).trim();if(!/[\d+×]/.test(rest)){repetitions=Number(match[1])*Number(match[2]??1);distance=Number(match[3].replace(',','.'))*(match[4].toLowerCase()==='km'?1000:1);source='text'}else questions.push('Expression composée : quantité totale à confirmer.')}
 }
 if(repetitions==null&&!raw.sets.trim()&&!raw.reps.trim()){const explicit=item.name.trim().match(/^(\d+)\s+(?:courses?|sprints?|departs?|sauts?|lancers?|passages?|repetitions?)\b/i);if(explicit){repetitions=Number(explicit[1]);source='text'}}
 const blockRepeat=block.title.match(/\(\s*[x×]\s*(\d+)\s*\)\s*$/i)
 if(blockRepeat&&repetitions!=null)repetitions*=Number(blockRepeat[1])
 else if(/(?:\d+\s*[x×]|\btours?\b)/i.test(block.title)&&!blockRepeat)questions.push('Répétition du circuit/bloc ambiguë : total non calculé.')
 const unresolvedBlock=questions.some(q=>q.startsWith('Répétition du circuit'))
 const values:ContentDose['values']={}
 if(!unresolvedBlock&&repetitions!=null){
  if(classification.kind==='running'){values.running_reps=repetitions;if(distance!=null)values.running_m=repetitions*distance;const duration=strictRecovery(item.duration??'');if(duration&&duration.low===duration.high)values.running_work_s=repetitions*duration.low}
  if(classification.kind==='jumps')values.jump_attempts=repetitions
  if(classification.kind==='throws')values.throw_attempts=repetitions
  if(classification.kind==='strength'){values.strength_reps=repetitions;const kg=finite(raw.load_kg.replace(/\s*kg\s*$/i,''));if(kg!=null)values.tonnage_kg=repetitions*kg}
 }
 for(const key of Object.keys(values) as ContentMetric[])if(!Number.isFinite(values[key])||values[key]!>Number.MAX_SAFE_INTEGER){delete values[key];questions.push('Quantité trop grande ou invalide : calcul refusé.')}
 const inline=[item.name,item.notes??''].join(' ');
 if(!raw.intensity.trim()){const readings=[...inline.matchAll(/\b\d+(?:[.,]\d+)?(?:\s*[-–à]\s*\d+(?:[.,]\d+)?)?\s*%\s*(?:(?:de\s*(?:la\s*)?)?(?:VMA|RVA|1\s*RM|vitesse(?: maximale)?|vmax))?/gi)];if(readings.length===1){raw.intensity=readings[0][0].trim();questions.push('Intensité repérée dans le texte de l’exercice, à confirmer.')}}
 if(!raw.recovery.trim()){const reading=inline.match(/(?:r[eé]cup(?:[eé]ration)?\s*[:=]?\s*|\br\s*=\s*)(\d+(?:[.,]\d+)?\s*(?:min(?:utes?)?|mn|s|sec(?:ondes?)?|["”]|['’]\s*\d{0,2}))/i);if(reading){raw.recovery=reading[1].trim();questions.push('Récupération repérée dans le texte de l’exercice, à confirmer.')}}
 const intensity=readIntensity(raw.intensity),recovery=strictRecovery(raw.recovery)
 if(classification.kind==='unknown')questions.push('Classer la modalité avant de chiffrer son volume.')
 if(!['general','unknown'].includes(classification.kind)&&repetitions==null)questions.push('Quantité exacte non reconnue : séries / répétitions à préciser.')
 if(classification.kind==='running'&&distance==null)questions.push('Distance par effort non reconnue.')
 if(!['general','unknown'].includes(classification.kind)&&(!intensity||intensity.basis==='unknown'))questions.push(raw.intensity?'Intensité sans référence exploitable ou formulation ambiguë.':'Intensité non renseignée.')
 if(!['general','unknown'].includes(classification.kind)&&!recovery)questions.push(raw.recovery?'Récupération qualitative ou multiple : à examiner dans le texte.':'Récupération non renseignée.')
 return {itemId:item.id,blockId:block.id,name:item.name,block:block.title,kind:classification.kind,kindSource:classification.source,source,count:repetitions,distance,values,intensity,recovery,raw,questions}
}
export function sessionContentDoses(session:Pick<Session,'blocks'>):ContentDose[]{return session.blocks.flatMap(block=>block.items.map(item=>itemContentDose(item,block)))}
export function summarizeContent(doses:ContentDose[],metric:ContentMetric){
 const eligible=doses.filter(d=>d.kind===CONTENT_METRICS[metric].kind),known=eligible.filter(d=>d.values[metric]!=null),unknownKind=doses.filter(d=>d.kind==='unknown').length
 return {value:known.length?known.reduce((n,d)=>n+d.values[metric]!,0):null,known:known.length,total:eligible.length,unknownKind,complete:eligible.length>0&&known.length===eligible.length&&unknownKind===0,keys:[...new Set(eligible.map(d=>norm(d.name)))].sort().join('|')}
}
