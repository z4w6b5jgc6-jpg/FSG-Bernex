import {useState} from 'react'
import {Link} from 'react-router-dom'
import schema from '../../../supabase/schema.sql?raw'
import seasonMigration from '../../../supabase/migration-season-2027.sql?raw'
import completeMigration from '../../../supabase/migration-complete-2027.sql?raw'
import {supabaseUrl} from '../api'
const SCRIPTS={season:{label:'1 · Cycles et charge',text:seasonMigration},complete:{label:'2 · Suivi et accès',text:completeMigration},new:{label:'Installation neuve uniquement',text:schema}}
export function DbUpdate(){
 const [selected,setSelected]=useState<keyof typeof SCRIPTS>('season'),[copied,setCopied]=useState(false)
 const ref=supabaseUrl?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1],editor=ref?`https://supabase.com/dashboard/project/${ref}/sql/new`:'https://supabase.com/dashboard'
 const script=SCRIPTS[selected].text
 const copy=async()=>{try{await navigator.clipboard.writeText(script);setCopied(true)}catch{const t=document.querySelector<HTMLTextAreaElement>('#schema');t?.select();document.execCommand('copy');setCopied(true)}}
 return <div className="login"><div className="card login-card form"><h1>Mettre à jour la base</h1><p className="small">Pour un projet existant, appliquer les mises à jour <b>1 puis 2</b> si elles ne sont pas déjà installées. Elles ont été vérifiées sur une copie locale du schéma d’origine.</p><label className="field"><span className="field-label">Script à examiner</span><select aria-label="Script à examiner" value={selected} onChange={e=>{setSelected(e.target.value as keyof typeof SCRIPTS);setCopied(false)}}>{Object.entries(SCRIPTS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label><p className="small muted">Vérifie la sauvegarde et le projet sélectionné avant l’exécution. Cette page copie un script ; elle ne modifie pas la base automatiquement.</p><ol className="small steps"><li>Copier le script choisi.</li><li>Ouvrir Supabase et vérifier le projet.</li><li>Coller le script dans SQL Editor, puis lancer « Run » et contrôler le résultat.</li><li>Pour un projet existant, passer au script 2 après le script 1, puis revenir à l’application.</li></ol><button className="btn primary block" onClick={copy}>{copied?'Copié !':'Copier le script choisi'}</button><a className="btn block" href={editor} target="_blank" rel="noreferrer">Ouvrir Supabase</a><details><summary className="tiny muted">Voir le script · {Math.round(script.length/1000)} ko</summary><textarea id="schema" readOnly rows={8} value={script} className="mono tiny"/></details><Link to="/" className="small center">Retour à l’application</Link></div></div>
}
