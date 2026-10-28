import {useEffect,useRef,type ReactNode} from 'react'

/** Panneau de lecture : focus contenu, Échap, retour au déclencheur. */
export function SidePanel({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null),close=useRef(onClose)
 useEffect(()=>{close.current=onClose},[onClose])
 useEffect(()=>{
  const trigger=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow
  document.body.style.overflow='hidden';ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();close.current();return}
   if(e.key!=='Tab')return
   const nodes=[...ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')??[]].filter(n=>n.getClientRects().length)
   const first=nodes[0],last=nodes.at(-1)
   if(!first){e.preventDefault();ref.current?.focus();return}
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
  document.addEventListener('keydown',key)
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);if(trigger?.isConnected)trigger.focus()}
 },[])
 return <div className="side-panel-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} className="coach-side-panel" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><header><div><p className="eyebrow">ESPACE COACH</p><h2>{title}</h2></div><button className="btn ghost icon" onClick={onClose} aria-label="Fermer le panneau">✕</button></header><div className="side-panel-body">{children}</div></div></div>
}
