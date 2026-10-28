import {useState,useRef,useEffect} from 'react'
import {api} from '../api'
import {useData} from '../lib/data'
import {redactNames,redactSession} from '../lib/redact'
import {sessionForAI,validateSessionAdvice,type AIField} from '../lib/sessionAI'
import {TRAINING_KNOWLEDGE} from '../data/trainingKnowledge'
import {libraryForAI} from '../lib/aiLibrary'
import {SOURCES} from '../lib/season'
import {errorMessage} from '../lib/utils'
import {RichText} from './RichText'
import type {AiAdvice,Block,ChatMessage,Session} from '../types'

const FIELD_LABELS:Record<AIField,string>={name:'Exercice',sets:'Séries',reps:'Répétitions',distance:'Distance',duration:'Durée',recovery:'Récupération',intensity:'Intensité',notes:'Consignes',load_kg:'Charge en kg'}

/** Deux entrées, un même moteur : propositions sourcées et discussion, puis choix du coach. */
export function AiAdvicePanel({session,onApplyBlocks}:{session:Session;onApplyBlocks:(blocks:Block[])=>void}){
 const {athletes,assignments,evidence_library}=useData()
 const library=libraryForAI(evidence_library)
 const [input,setInput]=useState(''),[messages,setMessages]=useState<ChatMessage[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [result,setResult]=useState<{advice:AiAdvice;snapshot:string}|null>(null),[selected,setSelected]=useState<number[]>([]),[applied,setApplied]=useState(false)
 const current=useRef(session);useEffect(()=>{current.current=session},[session])
 const signature=JSON.stringify(sessionForAI(session)),stale=!!result&&result.snapshot!==signature
 const request=async(mode:'direct'|'discussion')=>{
  if(busy||(mode==='discussion'&&!input.trim()))return
  setBusy(true);setError('');setApplied(false)
  const snapshot=JSON.stringify(sessionForAI(session)),safeSession=redactSession(sessionForAI(session),athletes)
  const question=redactNames(input.trim(),athletes).text
  const history=mode==='direct'?[]:[...messages,{role:'user' as const,content:question}]
  try{
   if(history.length>12)throw new Error('Cette discussion atteint douze messages. Ouvre une nouvelle discussion pour continuer ; aucun message n’a été supprimé silencieusement.')
   const answer=mode==='direct'?await api.improveSession(safeSession,library):JSON.parse(await api.chat(history,safeSession,library))
   const advice=validateSessionAdvice(answer,safeSession,library.map(l=>l.id))
   if(snapshot!==JSON.stringify(sessionForAI(current.current))){setError('La séance a changé pendant la réponse. Relance l’analyse sur le contenu actuel.');return}
   setResult({advice,snapshot});setSelected(advice.suggestions.flatMap((s,i)=>s.champ?[i]:[]))
   setMessages(mode==='direct'?[{role:'assistant',content:JSON.stringify(advice)}]:[...history,{role:'assistant',content:JSON.stringify(advice)}]);if(mode==='discussion')setInput('')
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 const apply=()=>{
  if(!result||stale||busy)return
  const blocks=structuredClone(session.blocks)
  for(const idx of selected){const s=result.advice.suggestions[idx];if(!s?.champ)continue;const item=blocks.find(b=>b.id===s.block_id)?.items.find(i=>i.id===s.item_id);if(!item){setError('Exercice introuvable : relance l’analyse.');return}item[s.champ as AIField]=s.valeur}
  onApplyBlocks(blocks);setApplied(true);setResult(null);setSelected([])
 }
 const uses=assignments.filter(a=>a.session_id===session.id).length
 return <section className="card form session-ai" aria-label="Assistant de séance">
  <div className="row between wrap gap"><div><h2>Améliorer et ajuster avec l’IA</h2><p className="small muted">Des propositions directes ou une discussion à partir de cette séance. Tu décides des changements.</p></div><button type="button" className="btn primary" disabled={busy} onClick={()=>request('direct')}>{busy?'Analyse en cours…':'Analyser et proposer'}</button></div>
  <details><summary className="small">Références et données utilisées</summary><p className="small">Fiches vérifiées : Egger, périodisation, sprint, affûtage et développement des jeunes. Ces synthèses ne remplacent pas les ouvrages complets. Un dosage proposé reste une hypothèse pratique à valider.</p><ul className="plain">{TRAINING_KNOWLEDGE.map(k=><li key={k.id} className="small"><b>{k.title}</b> — {k.locator}</li>)}</ul><p className="tiny muted">IA hébergée par Cloudflare : le contenu de la séance et les messages sont transmis au service. Les noms connus du groupe sont masqués ; cela ne garantit pas l’anonymat. Aucun profil, historique de santé ou illustration n’est ajouté automatiquement. La discussion reste en mémoire dans cet écran ; aucune promesse de non-conservation par le fournisseur.</p></details>
  {messages.length>0&&<div className="chat-list" aria-label="Discussion de la séance">{messages.map((m,i)=><div className={`bubble ${m.role}`} key={i}><RichText text={m.role==='assistant'?JSON.parse(m.content).resume:m.content}/></div>)}</div>}
  {result&&<div className="form"><h3>Ajustements proposés</h3>{stale&&<p role="status" className="alert warn">Le contenu a changé. Relance l’analyse avant d’appliquer ces propositions.</p>}{!result.advice.suggestions.length&&<p className="small">Aucun changement de champ proposé pour le moment. Tu peux préciser ta demande ci-dessous.</p>}{result.advice.suggestions.map((s,i)=>{
   const before=session.blocks.find(b=>b.id===s.block_id)?.items.find(it=>it.id===s.item_id)
   return <article className="card form" key={i}><div className="row gap">{s.champ&&<input aria-label={`Retenir la proposition ${i+1}`} type="checkbox" checked={selected.includes(i)} disabled={stale||busy} onChange={()=>setSelected(x=>x.includes(i)?x.filter(v=>v!==i):[...x,i])}/>}<b>{s.proposition}</b></div>{s.champ&&<><p className="small">{s.bloc} · {s.exercice} · {FIELD_LABELS[s.champ as AIField]}</p><div className="grid2"><div className="small"><b>Actuel</b><p>{before?.[s.champ as AIField]||'Non renseigné'}</p></div><div className="small"><b>Proposé</b><p>{s.valeur||'Champ vide'}</p></div></div></>}<RichText text={s.pourquoi}/><div className="small">{s.source_ids?.map(id=>{const pub=library.find(l=>l.id===id);if(pub)return <p key={id} className="tiny muted">Ta bibliothèque : {pub.title} ({pub.year})</p>;const k=TRAINING_KNOWLEDGE.find(k=>k.id===id)!,ref=SOURCES.find(r=>r.id===k.sourceId);return <details key={id}><summary>{k.title}</summary><p>{k.principle}</p><p>Limite : {k.limit}</p>{ref&&<a href={ref.url} target="_blank" rel="noreferrer">{ref.title} — {k.locator}</a>}</details>})}</div></article>
  })}{selected.length>0&&<><button type="button" className="btn primary" disabled={stale||busy} onClick={apply}>Appliquer les {selected.length} modifications retenues au brouillon</button><p className="tiny muted">La séance n’est pas encore enregistrée.{uses>0?` Ce modèle est utilisé à ${uses} date(s) : son enregistrement modifiera le contenu commun à ces dates. Pour une seule occurrence, utilise « Adapter cette séance » depuis Saison.`:''}</p></>}</div>}
  {applied&&<p role="status" className="alert info">Modifications ajoutées au brouillon. Vérifie-les puis utilise Enregistrer en haut de la séance.</p>}
  {error&&<p role="alert" className="alert warn">{error}</p>}
  <form className="form" onSubmit={e=>{e.preventDefault();request('discussion')}}><label className="field"><span className="field-label">Discuter et ajuster cette séance</span><textarea rows={3} value={input} onChange={e=>setInput(e.target.value)} maxLength={4000} placeholder="Ex. Je souhaite rester sur piste. Que proposes-tu pour conserver l’objectif de cette séance ?"/></label><div className="row gap wrap"><button className="btn primary" disabled={busy||!input.trim()}>Envoyer à l’IA</button><button type="button" className="btn ghost" disabled={busy} onClick={()=>{setMessages([]);setResult(null);setSelected([]);setError('');setApplied(false)}}>Nouvelle discussion</button></div></form>
 </section>
}
