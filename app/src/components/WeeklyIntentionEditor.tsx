import {useState} from 'react'
import {api} from '../api'
import {useData} from '../lib/data'
import {DIRECTION_LABELS,mergeWeeklyIntention,type WeeklyIntention,type IntentionDirection} from '../lib/weeklyDynamics'
import {errorMessage} from '../lib/utils'
import {Field} from './ui'
export function WeeklyIntentionEditor({scopeKey,value}:{scopeKey:string;value:WeeklyIntention|undefined}){
 const {refreshMe}=useData()
 const [baseline,setBaseline]=useState(value),[direction,setDirection]=useState<IntentionDirection|'auto'>(value?.direction??'auto'),[note,setNote]=useState(value?.note??''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const changed=direction!==(baseline?.direction??'auto')||direction!=='auto'&&note!==(baseline?.note??'')
 const save=async()=>{setBusy(true);setMessage('');try{const me=await api.getMe();if(me?.role!=='coach')throw new Error('Le compte coach doit être connecté.');const next=direction==='auto'?null:{direction,note:note.trim()};const settings=mergeWeeklyIntention(me.settings??{},scopeKey,baseline,next);await api.saveSettings(settings);setBaseline(next??undefined);setNote(next?.note??'');await refreshMe();setMessage('Intention enregistrée pour cette semaine et cet indicateur. Les séances restent à adapter séparément.')}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}}
 return <details className="weekly-intention-editor"><summary>Préciser l’intention de cette semaine</summary><p className="small muted">Ce choix concerne uniquement la semaine, le parcours, le programme et l’indicateur affichés. Le repère proposé ne prescrit aucune dose.</p><div className="grid2"><Field label="Direction recherchée cette semaine"><select value={direction} disabled={busy} onChange={e=>{setDirection(e.target.value as typeof direction);setMessage('')}}><option value="auto">Repère proposé / indication du programme</option>{Object.entries(DIRECTION_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field><Field label="Justification de l’intention"><input value={note} maxLength={2000} disabled={busy||direction==='auto'} onChange={e=>setNote(e.target.value)} placeholder="Objectif ou adaptation du repère…"/></Field></div><button className="btn small" disabled={busy||!changed} onClick={save}>{busy?'Enregistrement…':'Enregistrer cette intention'}</button>{message&&<p className="small" role="status">{message}</p>}</details>
}
