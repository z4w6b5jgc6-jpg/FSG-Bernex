import type { ResearchRequest,ResearchPaper,ResearchResult } from '../src/lib/research'
export const TOPIC_QUERIES={
 periodization:'TITLE_ABS:(periodization OR periodisation) AND TITLE_ABS:(training OR athletes)',
 taper:'TITLE_ABS:(tapering OR taper) AND TITLE_ABS:(athletes OR performance)',
 sprint:'TITLE_ABS:sprint AND TITLE_ABS:(training OR periodization)',
 strength:'TITLE_ABS:("resistance training" OR plyometric) AND TITLE_ABS:(adolescent OR youth)',
 youth:'TITLE_ABS:(youth OR adolescent) AND TITLE_ABS:("athletic development" OR "training load")',
} as const
export function parseResearchRequest(value:unknown,year:number):ResearchRequest{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_request')
 const v=value as Record<string,unknown>
 if(Object.keys(v).some(k=>!['topic','fromYear','ai'].includes(k))||typeof v.topic!=='string'||!Object.hasOwn(TOPIC_QUERIES,v.topic)||typeof v.ai!=='boolean'||!Number.isInteger(v.fromYear)||Number(v.fromYear)<2000||Number(v.fromYear)>year)throw new Error('invalid_request')
 return {topic:v.topic as ResearchRequest['topic'],fromYear:Number(v.fromYear),ai:v.ai}
}
export function parsePapers(body:unknown,today:string):ResearchPaper[]{
 const items=(body as {resultList?:{result?:unknown[]}})?.resultList?.result??[]
 return items.flatMap(raw=>{
  const r=raw as Record<string,unknown>;const id=String(r.id??'');const year=Number(r.pubYear)
  if(r.source!=='MED'||!/^\d+$/.test(id)||!Number.isInteger(year)||year>Number(today.slice(0,4))||String(r.firstPublicationDate??'')>today)return []
  return [{id,title:String(r.title??'').slice(0,600),authors:String(r.authorString??'').slice(0,800),year,journal:String(r.journalTitle??(r.journalInfo as {journal?:{title?:string}})?.journal?.title??''),url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`,abstract:String(r.abstractText??'').replace(/<[^>]*>/g,' ').slice(0,16000),doi:String(r.doi??'').slice(0,200),retrieved_at:today}]
 })
}
export async function retrieveResearch(request:ResearchRequest,fetcher:typeof fetch=fetch,today=new Date().toISOString().slice(0,10)):Promise<ResearchResult>{
 const query=`SRC:MED AND (${TOPIC_QUERIES[request.topic]}) AND FIRST_PDATE:[${request.fromYear}-01-01 TO ${today}] AND (PUB_TYPE:review OR PUB_TYPE:meta-analysis)`
 const url=new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search')
 url.searchParams.set('query',query);url.searchParams.set('format','json');url.searchParams.set('resultType','core');url.searchParams.set('pageSize','12');url.searchParams.set('sort','P_PDATE_D desc')
 const response=await fetcher(url.toString(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw new Error('La recherche documentaire est temporairement indisponible.')
 return {papers:parsePapers(await response.json(),today),ai_ranked:false}
}
export function applyRanking(papers:ResearchPaper[],output:unknown):ResearchPaper[]{
 const object=typeof output==='string'?JSON.parse(output):output
 const ids=(object as {ids?:unknown[]})?.ids
 if(!Array.isArray(ids)||papers.length>0&&ids.length===0||ids.some(id=>typeof id!=='string'||!papers.some(p=>p.id===id))||new Set(ids).size!==ids.length)throw new Error('invalid_ranking')
 return [...ids.map(id=>papers.find(p=>p.id===id)!),...papers.filter(p=>!ids.includes(p.id))]
}
