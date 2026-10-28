import { useState } from 'react'
import type { ProjectionWeek } from '../lib/cycleProjection'
import { previewLoadShape, referenceWeeks, weekValue, type LoadMetric, type LoadShape } from '../lib/loadDynamics'
import { PHASES } from '../lib/season'
import { formatDate, errorMessage } from '../lib/utils'
import { Field } from './ui'

const labels: Record<LoadMetric,string> = {reference:'Repère Egger · indice relatif historique',minutes:'Volume horaire cible · minutes',rpe:'Effort global cible · RPE / 10',load:'Charge interne cible approximative · UA'}
export function MacrocycleLoadChart({ weeks, selectedId, onSelect, onReplace }: { weeks: ProjectionWeek[]; selectedId?: string; onSelect: (id:string)=>void; onReplace: (weeks:ProjectionWeek[])=>void }) {
 const [metric,setMetric]=useState<LoadMetric>('reference'),[form,setForm]=useState(false),[blockId,setBlockId]=useState(''),[direction,setDirection]=useState<LoadShape['direction']>('progressive')
 const [start,setStart]=useState(''),[end,setEnd]=useState(''),[recovery,setRecovery]=useState(''),[rpeStart,setRpeStart]=useState(''),[rpeEnd,setRpeEnd]=useState(''),[recoveryRpe,setRecoveryRpe]=useState('')
 const [preview,setPreview]=useState<ProjectionWeek[]|null>(null),[previewSource,setPreviewSource]=useState(''),[overwrite,setOverwrite]=useState(false),[problem,setProblem]=useState('')
 const blocks=[...new Set(weeks.map(w=>w.blockId))]
 const block=blocks.includes(blockId)?blockId:blocks[0]
 const subset=weeks.filter(w=>w.blockId===block)
 const references=referenceWeeks(weeks)
 const columns=references.map(({week,reference})=>({week,reference,value:metric==='reference'?reference?.value??null:weekValue(week,metric)}))
 const max=metric==='reference'?100:metric==='rpe'?10:Math.max(1,...columns.map(c=>c.value??0))
 const resetPreview=()=>{setPreview(null);setOverwrite(false);setProblem('')}
 const build=()=>{
  try {if(start===''||end==='')throw new Error('Renseigne les durées de début et de fin.');const number=(value:string)=>value===''?null:Number(value);setPreview(previewLoadShape(subset,{direction,start:Number(start),end:Number(end),recovery:number(recovery),rpeStart:number(rpeStart),rpeEnd:number(rpeEnd),recoveryRpe:number(recoveryRpe)}));setPreviewSource(JSON.stringify(subset));setProblem('');setOverwrite(false)}catch(e){setPreview(null);setProblem(errorMessage(e))}
 }
 const existing=subset.some(w=>w.minutes!=null||w.rpe!=null)
 return <section className="macro-load" aria-label="Dynamique du macrocycle">
  <div className="row between wrap"><div><h3>La dynamique du macrocycle</h3><p className="small muted">Une barre par semaine · clique pour examiner les séances liées.</p></div><select aria-label="Mesure de la dynamique" value={metric} onChange={e=>setMetric(e.target.value as LoadMetric)}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
  {metric==='reference'?<p className="alert info small">Repère historique superposé aux dates du scénario, sans modifier les cibles ni les séances. Le motif repart au début de chaque bloc : un bloc court peut interrompre le motif. Ce graphique n’est pas une mesure de charge.</p>:<p className="tiny muted">Cibles de ce scénario uniquement. {metric==='load'?'UA = minutes × effort global prévu. Ce calcul ne mesure pas la charge externe ni la charge réellement ressentie.':metric==='rpe'?'RPE global prévu : ce n’est ni un % de 1RM ni un % de vitesse maximale.':'Les minutes renseignent la durée ; elles ne décrivent pas à elles seules le volume des sprints, sauts ou séries.'} Hachures : cible non renseignée.</p>}
  <div className="macro-load-scroll" tabIndex={0} aria-label="Histogramme hebdomadaire du macrocycle"><div className="macro-load-columns" style={{gridTemplateColumns:`repeat(${weeks.length}, minmax(65px, 1fr))`}}>
   {columns.map(({week:w,reference,value},i)=><button key={w.id} className={`macro-load-week ${w.id===selectedId?'selected':''} ${['consolidation','recovery'].includes(w.role)?'unload':''}`} aria-pressed={w.id===selectedId} aria-label={`Semaine du ${formatDate(w.start)} · ${PHASES[w.phase].label} · ${value==null?'non renseigné':value} · ${labels[metric]}`} onClick={()=>onSelect(w.id)}>
    <span className="macro-bar-space"><b>{value??'—'}</b><i className={value==null?'unknown':''} style={{height:value==null?6:Math.max(value>0?3:0,value/max*100),backgroundColor:PHASES[w.phase].color}}/></span>
    <span className="macro-week-number">S{i+1}</span><small>{formatDate(w.start,{day:'numeric',month:'short'})}</small><small className="macro-context-marker">{[w.context.some(c=>c.startsWith('Vacances'))?'Vacances':'',w.context.some(c=>c.startsWith('Compétition'))?'Compétition':'',w.phase==='camp'?'Camp':''].filter(Boolean).join(' · ')}</small><span className="macro-week-phase" style={{borderColor:PHASES[w.phase].color}}>{PHASES[w.phase].label}</span><small>{metric==='reference'&&reference?.recovery?'R · repère':w.role==='consolidation'?'Allègement':w.role==='recovery'?'Récupération':'Développement'}</small>
   </button>)}
  </div></div>
  <button className="btn small" aria-expanded={form} onClick={()=>{setForm(!form);resetPreview()}}>Dessiner mes cibles de progression</button>
  {form&&<div className="load-shape-form form" onChange={resetPreview}>
   <p className="small">Définis tes propres durées et efforts. Les indices historiques ne sont pas convertis en doses. La proposition concerne le scénario ; les séances programmées restent à revoir séparément.</p>
   <div className="grid2"><Field label="Mésocycle à dessiner"><select value={block} onChange={e=>setBlockId(e.target.value)}>{blocks.map(id=>{const group=weeks.filter(w=>w.blockId===id);return <option key={id} value={id}>{PHASES[group[0].phase].label} · {formatDate(group[0].start)} · {group.length} semaines</option>})}</select></Field><Field label="Direction du volume horaire"><select value={direction} onChange={e=>setDirection(e.target.value as LoadShape['direction'])}><option value="progressive">Progressive</option><option value="degressive">Dégressive</option><option value="stable">Stable</option></select></Field></div>
   <div className="grid2">{[['Début du développement · min',start,setStart],['Fin du développement · min',end,setEnd],['Semaine d’allègement · min',recovery,setRecovery],['Effort au début · RPE',rpeStart,setRpeStart],['Effort à la fin · RPE',rpeEnd,setRpeEnd],['Effort en allègement · RPE',recoveryRpe,setRecoveryRpe]].map(([label,value,setter])=><Field key={label as string} label={label as string}><input type="number" min={String(label).includes('RPE')?1:0} max={String(label).includes('RPE')?10:3000} step={String(label).includes('RPE')?.1:1} value={value as string} onChange={e=>(setter as (s:string)=>void)(e.target.value)}/></Field>)}</div>
   <p className="tiny muted">Les semaines déjà marquées « Allègement / Récupération » utilisent les valeurs dédiées. Sans ce rôle, aucune semaine de récupération n’est créée. Effort laissé vide = effort existant conservé, ou inconnu s’il était vide.</p>
   <button className="btn small" onClick={build}>Prévisualiser mes cibles</button>
   {problem&&<p className="alert warn" role="alert">{problem}</p>}
   {previewSource&&preview&&previewSource!==JSON.stringify(subset)&&<p className="alert warn">Les semaines ont changé : prévisualise à nouveau avant d’appliquer.</p>}{preview&&<div onChange={e=>e.stopPropagation()}><div className="board-scroll"><table className="table"><thead><tr><th>Semaine</th><th>Durée actuelle → proposée</th><th>RPE actuel → proposé</th><th>Charge cible · UA</th></tr></thead><tbody>{preview.map(w=>{const before=subset.find(x=>x.id===w.id)!;return <tr key={w.id}><td>{formatDate(w.start)}</td><td>{before.minutes??'—'} → {w.minutes} min</td><td>{before.rpe??'—'} → {w.rpe??'—'}</td><td>{weekValue(w,'load')??'Non renseignée'}</td></tr>})}</tbody></table></div>
    {existing&&<label className="check"><input type="checkbox" checked={overwrite} onChange={e=>setOverwrite(e.target.checked)}/> Remplacer les cibles déjà renseignées dans ce mésocycle.</label>}
    <button className="btn primary" disabled={existing&&!overwrite||previewSource!==JSON.stringify(subset)} onClick={()=>{if(previewSource!==JSON.stringify(subset))return;onReplace(preview);setPreview(null);setMetric('load');setForm(false)}}>Appliquer ces cibles au brouillon</button>
   </div>}
  </div>}
 </section>
}
