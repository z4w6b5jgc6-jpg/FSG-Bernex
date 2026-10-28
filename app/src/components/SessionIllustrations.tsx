import {useState} from 'react'
import type {SessionIllustration} from '../types'
import {Modal} from './ui'
export function SessionIllustrations({images=[],onRemove}:{images?:SessionIllustration[];onRemove?:(id:string)=>void}){
 const [selected,setSelected]=useState<SessionIllustration|null>(null)
 const valid=images.filter(i=>/^data:image\/(png|jpeg|gif|webp);base64,/.test(i.dataUrl))
 if(!valid.length)return null
 return <><div className="session-illustrations">{valid.map(i=><figure key={i.id}><button type="button" onClick={()=>setSelected(i)} aria-label={`Agrandir l’illustration ${i.id}`}><img src={i.dataUrl} alt={i.caption} loading="lazy"/></button><figcaption>{i.caption}</figcaption>{onRemove&&<button type="button" className="btn small" onClick={()=>onRemove(i.id)}>Retirer cette illustration</button>}</figure>)}</div>{selected&&<Modal title="Illustration du programme" onClose={()=>setSelected(null)}><img className="illustration-large" src={selected.dataUrl} alt={selected.caption}/><p className="small">{selected.caption}</p></Modal>}</>
}
