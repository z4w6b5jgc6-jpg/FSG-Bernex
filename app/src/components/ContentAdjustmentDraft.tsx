import {useState} from 'react'
import {api} from '../api'
import {useData} from '../lib/data'
import {sessionContent,type SessionContent,contentDiff} from '../lib/adaptation'
import {contentFingerprint,proposeManualExerciseEdit,scheduledAssignmentPatch,type ExerciseEditField} from '../lib/contentAdjustment'
import {sessionContentDoses,summarizeContent,CONTENT_METRICS,type ContentMetric} from '../lib/contentLoad'
import type {ProgramContentRow} from '../lib/programPeriodization'
import {Field} from './ui'
import {errorMessage,fullName,athletesFor} from '../lib/utils'
export function ContentAdjustmentDraft({row,athleteId,metric,onSaved,initialOpen=false}:{row:ProgramContentRow;athleteId:string;metric:ContentMetric;onSaved:()=>void;initialOpen?:boolean}){
 const {athletes,sessions,session_adjustments,save}=useData()
 const athlete=athletes.find(a=>a.id===athleteId)
 const [scope,setScope]=useState<'individual'|'scheduled'>(athleteId?'individual':'scheduled')
 const [choice,setChoice]=useState(''),[field,setField]=useState<ExerciseEditField>('sets'),[quantity,setQuantity]=useState(''),[reason,setReason]=useState(''),[draft,setDraft]=useState<SessionContent|null>(null),[stamp,setStamp]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const template=sessions.find(s=>s.id===row.assignment.session_id)
 const source=scope==='individual'?row.session:template
 if(!source)return null
 const original:SessionContent={title:source.title,objective:source.objective,focus:source.focus,duration_min:source.duration_min,blocks:source.blocks,targets:source.targets??[]}
 const members=athletesFor(row.assignment,athletes)
 const variants=session_adjustments.filter(v=>v.assignment_id===row.assignment.id)
 const signature=contentFingerprint(original)
 const options=original.blocks.flatMap((block,bi)=>block.items.map((item,ii)=>({block,item,bi,ii,key:`${bi}|${ii}`})))
 const selected=options.find(o=>o.key===choice)??options[0]
 const preview=()=>{setMessage('');try{if(!selected)throw new Error('Aucun exercice dans cette séance. Ouvre son éditeur pour ajouter le contenu.');setDraft(proposeManualExerciseEdit(original,selected.bi,selected.ii,field,quantity));setStamp(signature)}catch(e){setDraft(null);setMessage(errorMessage(e))}}
 const persist=async()=>{
  if(!draft||!reason.trim()||stamp!==signature)return
  setBusy(true);setMessage('')
  let copied:string|null=null
  try{
   const [templates,variants,assignments]=await Promise.all([api.list('sessions'),api.list('session_adjustments'),api.list('assignments')])
   if(contentFingerprint(assignments.find(a=>a.id===row.assignment.id))!==contentFingerprint(row.assignment))throw new Error('La planification a changé. Actualise les données avant de préparer cette variante.')
   const template=templates.find(s=>s.id===row.assignment.session_id),variant=variants.find(v=>v.assignment_id===row.assignment.id&&v.athlete_id===athleteId)
   if(!template)throw new Error('Le programme source n’est plus disponible.')
   const current=scope==='individual'?variant?.content??sessionContent(template):sessionContent(template)
   const normalized={...current,targets:current.targets??[]}
   if(contentFingerprint(normalized)!==stamp)throw new Error('Le contenu a changé depuis la préparation. Ferme ce panneau, actualise les données puis prépare une nouvelle proposition. Aucune écriture effectuée.')
   if(scope==='individual'){
    if(!athlete)throw new Error('Choisis un athlète pour une variante individuelle.')
    await save('session_adjustments',{id:variant?.id,assignment_id:row.assignment.id,athlete_id:athleteId,content:draft,rationale:`Revue de périodisation sur les contenus
${reason.trim()}`,source_ids:variant?.source_ids??[]})
   }else{
    const copy=await save('sessions',{...draft,title:template.title.replace(/\s*—\s*adaptation\s+\d{4}-\d{2}-\d{2}$/,'')+` — adaptation ${row.assignment.date}`})
    copied=copy.id
    await save('session_notes',{session_id:copy.id,text:`Adaptation de la séance programmée ${row.assignment.id}, programme source ${template.id}.
${reason.trim()}`})
    const fresh=(await api.list('assignments')).find(a=>a.id===row.assignment.id)
    if(contentFingerprint(fresh)!==contentFingerprint(row.assignment))throw new Error('La planification a changé pendant la préparation ; la copie n’a pas été affectée.')
    await save('assignments',scheduledAssignmentPatch(row.assignment,copy.id))
   }
   setDraft(null);setMessage(scope==='individual'?'Variante individuelle enregistrée.':'Séance programmée adaptée.');onSaved()
  }catch(e){setMessage((copied?'Une copie de travail a été créée dans la bibliothèque. Vérifier son affectation avant de recommencer. ':'')+errorMessage(e))}finally{setBusy(false)}
 }
 const before=summarizeContent(sessionContentDoses(original),metric),after=draft?summarizeContent(sessionContentDoses(draft),metric):null
 return <details className="content-adjustment-draft" open={initialOpen}><summary><b>Adapter {scope==='individual'&&athlete?`la séance pour ${fullName(athlete)}`:`la séance programmée du ${row.assignment.date}`}</b></summary><p className="small">Choisis l’exercice, la quantité et le motif. Seul le champ choisi est modifié. La quantité ou la nouvelle consigne vient de ta décision ; le reste du contenu est conservé.</p>
  <Field label="Portée de l’adaptation"><select value={scope} onChange={e=>{setScope(e.target.value as typeof scope);setDraft(null);setStamp('');setMessage('')}}><option value="scheduled">Cette séance programmée · {members.length} athlète(s) concerné(s)</option>{athlete&&<option value="individual">Seulement {fullName(athlete)} · variante individuelle</option>}</select></Field>
  {scope==='scheduled'&&<p className="small muted">Une copie sera affectée à cette date et à son public. Les autres dates utilisant le même modèle seront conservées.{variants.length>0?` ${variants.length} variante(s) individuelle(s) existante(s) seront conservées et pourront nécessiter une revue.`:''}</p>}
  <div className="form" onChange={()=>{setDraft(null);setMessage('')}}><Field label="Exercice à ajuster"><select value={selected?.key??''} onChange={e=>setChoice(e.target.value)}>{options.map(o=><option key={o.key} value={o.key}>{o.block.title} · {o.item.name}</option>)}</select></Field><Field label="Dimension à ajuster"><select value={field} onChange={e=>{setField(e.target.value as ExerciseEditField);setQuantity('')}}><option value="sets">Séries / efforts</option><option value="reps">Répétitions</option><option value="name">Texte de l’exercice importé</option><option value="distance">Distance</option><option value="duration">Durée d’effort</option><option value="intensity">Intensité et référence</option><option value="recovery">Récupération</option><option value="notes">Consignes complémentaires</option></select></Field><p className="small muted">Contenu actuel : {selected?.item[field]||'Non renseigné'}</p><Field label={['sets','reps'].includes(field)?'Nouvelle quantité choisie par le coach':'Nouvelle consigne choisie par le coach'}>{['sets','reps'].includes(field)?<input type="number" min={0} max={1000} step={1} value={quantity} onChange={e=>setQuantity(e.target.value)}/>:<textarea rows={3} value={quantity} onChange={e=>setQuantity(e.target.value)}/>}</Field><button className="btn" onClick={preview} disabled={busy}>Prévisualiser l’adaptation</button></div>
  {draft&&<><ul className="small">{contentDiff(original,draft).map((change,i)=><li key={i}>{change}</li>)}</ul><p className="small">{CONTENT_METRICS[metric].label} : {before.value??'Non calculable'} → {after?.value??'Non calculable'} {CONTENT_METRICS[metric].unit}{!before.complete||!after?.complete?' · sous-totaux partiels':''}.</p><Field label="Motif de cet ajustement"><textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Objectif du cycle, contenu examiné, justification de la quantité…"/></Field><button className="btn primary" disabled={busy||!reason.trim()||stamp!==signature} onClick={persist}>{busy?'Enregistrement…':scope==='individual'?'Valider cette variante individuelle':'Valider l’adaptation de cette séance programmée'}</button></>}
  {stamp&&draft&&stamp!==signature&&<p className="alert warn">Les données ont changé : prépare une nouvelle proposition.</p>}{message&&<p role="status">{message}</p>}
  {scope==='individual'&&session_adjustments.some(v=>v.assignment_id===row.assignment.id&&v.athlete_id===athleteId)&&<p className="tiny muted">Une variante existe déjà : la validation la remplacera par le contenu prévisualisé.</p>}
 </details>
}
