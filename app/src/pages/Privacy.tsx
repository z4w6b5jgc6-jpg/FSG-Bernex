import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useData } from '../lib/data'
import { DEFAULT_HOSTING, DRAFT_PRIVACY, decryptExport, downloadData, encryptExport, healthConsent, validatePrivacy } from '../lib/confidentiality'
import { errorMessage, todayISO } from '../lib/utils'
import { Field } from '../components/ui'
import { DataInfo } from '../components/DataInfo'
import type { PrivacySettings } from '../lib/settings'

export function Privacy() {
 const data=useData(); const {me,privacy_acceptances,save,refreshMe}=data
 const coach=me?.role==='coach';const policy=me?.settings?.privacy ?? DRAFT_PRIVACY
 const [draft,setDraft]=useState<PrivacySettings>(()=>({...policy,organization:policy.organization||me?.club_name||'',hosting_details:policy.hosting_details||DEFAULT_HOSTING}))
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false)
 const [agree,setAgree]=useState(false);const [representative,setRepresentative]=useState('')
 const [retention,setRetention]=useState<Record<string,number>|null>(null)
 const [password,setPassword]=useState('');const [restored,setRestored]=useState<unknown>(null)
 const accepted=me?.athlete_id ? healthConsent(me.athlete_id,privacy_acceptances,policy) : false
 const updatePolicy=async(e:FormEvent)=>{
  e.preventDefault();if(policy.published&&draft.published&&draft.version===policy.version&&JSON.stringify(draft)!==JSON.stringify(policy))return setMessage('Utilise une nouvelle version pour modifier une information déjà publiée.');const p=validatePrivacy(draft);if(p)return setMessage(p)
  setBusy(true);setMessage('')
  try{await api.saveSettings({...me?.settings,privacy:draft});await refreshMe();setMessage('Politique enregistrée. Une nouvelle version exige un nouveau choix pour le suivi facultatif.')}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}
 }
 const consent=async(value:boolean)=>{
  if(!me?.athlete_id)return
  setBusy(true);setMessage('')
  try{await save('privacy_acceptances',{athlete_id:me.athlete_id,version:policy.version,health_consent:value,representative:representative.trim()});setMessage(value?'Ton choix a été enregistré.':'Suivi facultatif désactivé. Les nouvelles saisies de santé sont bloquées ; contacte le responsable pour une demande d’effacement.');setAgree(false)}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}
 }
 const exportData=async()=>{
  setBusy(true);setMessage('')
  try{
   if(data.loading||data.error)throw new Error('Les données ne sont pas entièrement chargées. Actualise avant de créer un export.')
   const tables=Object.fromEntries(Object.entries(data).filter(([k,v])=>Array.isArray(v)&&k!=='me'))
   const payload={format:'coach-athle-export-v1',exported_at:new Date().toISOString(),settings:coach?me?.settings:undefined,tables}
   if(coach)downloadData(`coach-athle-${todayISO()}.encrypted.json`,await encryptExport(payload,password))
   else downloadData(`mes-donnees-${todayISO()}.json`,payload)
   setMessage(coach?'Export fonctionnel chiffré créé sur ton appareil. Conserve le mot de passe séparément et vérifie le fichier.':'Export des données accessibles depuis ton compte créé. Pour un accès complémentaire ou une suppression, contacte le responsable du traitement.')
  }catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}
 }
 return <div className="privacy-page"><p className="eyebrow">DONNÉES PERSONNELLES</p><h1>Confidentialité et mes données</h1>
  <p className="muted">Information, choix du suivi facultatif et outils de gestion.</p>
  {policy.published?<PolicyDocument policy={policy}/>:<DataInfo club={me?.club_name}/>}
  {!coach&&me?.athlete_id&&policy.published&&<section className="card form"><h2>Mon choix pour le suivi facultatif</h2><p>{accepted?'Suivi facultatif activé pour cette version.':'Suivi facultatif non activé pour cette version. Tu peux consulter tes programmes et transmettre ton bilan sportif sans l’activer.'}</p><label className="check"><input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)}/>J’ai compris l’information et j’accepte le suivi facultatif de sommeil, fatigue, douleurs et ressenti par les coachs.</label><Field label="Représentant légal, si son intervention est requise"><input value={representative} onChange={(e)=>setRepresentative(e.target.value)}/></Field><div className="row gap wrap"><button className="btn primary" disabled={busy||!agree} onClick={()=>consent(true)}>Enregistrer mon accord</button><button className="btn" disabled={busy||!accepted} onClick={()=>consent(false)}>Retirer mon accord</button></div></section>}
  {coach&&<details className="card"><summary><b>Information détaillée (facultatif)</b> <span className="small muted">— remplace le texte court ci-dessus une fois publiée</span></summary><form className="form" onSubmit={updatePolicy}>
   <Field label="Responsable du traitement"><input required value={draft.organization} onChange={(e)=>setDraft({...draft,organization:e.target.value})}/></Field><Field label="Adresse"><input required value={draft.address} onChange={(e)=>setDraft({...draft,address:e.target.value})}/></Field><Field label="Contact pour les données personnelles"><input required type="email" value={draft.contact} onChange={(e)=>setDraft({...draft,contact:e.target.value})}/></Field><Field label="Version de l’information"><input required value={draft.version} onChange={(e)=>setDraft({...draft,version:e.target.value})}/></Field>
   <Field label="Lieux de traitement, sous-traitants et garanties vérifiés"><textarea rows={4} required value={draft.hosting_details??''} onChange={(e)=>setDraft({...draft,hosting_details:e.target.value})}/></Field>
   <div className="grid2"><Field label="Conservation sportive · mois"><input type="number" min="1" max="120" value={draft.retention_months} onChange={(e)=>setDraft({...draft,retention_months:Number(e.target.value)})}/></Field><Field label="Conservation santé · mois"><input type="number" min="1" max="120" value={draft.health_retention_months} onChange={(e)=>setDraft({...draft,health_retention_months:Number(e.target.value)})}/></Field></div>
   <p className="small muted">Les durées initiales sont des paramètres de travail à justifier, pas des délais imposés par la loi. En cas de changement substantiel, utilise une nouvelle version.</p>
   <label className="check"><input type="checkbox" checked={draft.published} onChange={(e)=>setDraft({...draft,published:e.target.checked})}/>J’ai vérifié le cadre et les informations ci-dessus et je publie cette version pour le groupe.</label><button className="btn primary" disabled={busy}>Enregistrer</button>
  </form></details>}
  <section className="card form"><h2>{coach?'Export fonctionnel chiffré':'Exporter mes données accessibles'}</h2><p className="small muted">{coach?'Les données chargées de l’application sont chiffrées sur cet appareil avec AES-GCM. Cet export ne remplace pas une sauvegarde complète PostgreSQL et des comptes d’authentification.':'Le fichier comprend les données visibles par ton compte ; conserve-le dans un endroit privé.'}</p>{coach&&<Field label="Mot de passe de l’export · 12 caractères minimum"><input type="password" minLength={12} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="new-password"/></Field>}<button className="btn" disabled={busy||(coach&&password.length<12)} onClick={exportData}>{coach?'Créer l’export chiffré':'Télécharger mon export'}</button>
  {coach&&<details><summary>Vérifier un export chiffré</summary><p className="small muted">Lecture locale uniquement : aucune restauration en base n’est exécutée.</p><input aria-label="Export chiffré à vérifier" type="file" accept=".json" onChange={async(e)=>{try{const file=e.target.files?.[0];if(file){const v=await decryptExport(JSON.parse(await file.text()),password);setRestored(v);setMessage('Export déchiffré sur cet appareil.')}}catch{setMessage('Impossible de déchiffrer : fichier ou mot de passe incorrect.')}}}/>{restored!=null&&<p className="small ok-text">Fichier lisible · {Object.keys((restored as {tables?:object}).tables??{}).length} collections. Aucun contenu publié.</p>}</details>}
  </section>
  {coach&&<section className="card"><h2>Contrôler les échéances de conservation</h2><p className="small muted">Prévisualisation avant suppression des questionnaires, champs de santé des retours, anciens messages, notes et réalisations. Les profils, performances, tests et documents nécessitent une revue distincte selon leur finalité et les obligations applicables.</p><button className="btn" disabled={busy} onClick={async()=>{setBusy(true);try{setRetention(await api.retentionPreview())}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}}}>Prévisualiser les échéances</button>{retention&&<><ul>{Object.entries(retention).map(([k,v])=><li key={k}>{k} : {v}</li>)}</ul><button className="btn danger" disabled={busy||!Object.values(retention).some(Boolean)} onClick={async()=>{if(!confirm('Supprimer définitivement les données listées ou vider leurs champs de santé ? Vérifie ton export et les exceptions de conservation avant de confirmer.'))return;setBusy(true);try{await api.purgeRetention(retention);setRetention(null);await data.reload();setMessage('Traitement des données expirées effectué. Vérifie séparément les autres catégories et les sauvegardes.')}catch(e){setMessage(errorMessage(e))}finally{setBusy(false)}}}>Confirmer la purge des données listées</button></>}</section>}
  {message&&<p className="alert info" role="status">{message}</p>}<Link to={coach?'/reglages':'/profil'}>Retour aux réglages →</Link>
 </div>
}

export function PolicyDocument({policy}:{policy:PrivacySettings}){return (<section className="card policy-document">
   <h2>Information sur les traitements · version {policy.version}</h2>
   <h3>Responsable et contact</h3><p>{policy.organization||'Responsable à renseigner'} · {policy.address||'Adresse à renseigner'}</p><p>{policy.contact||'Contact à renseigner'}</p>
   <h3>Pourquoi et quelles données ?</h3><p>Organiser les entraînements et les compétitions, suivre les présences, les performances et les objectifs, et permettre les échanges avec les coachs. Les informations d’identité, de contact, de groupe et les contenus sportifs nécessaires servent à ces finalités.</p>
   <p>Le suivi de sommeil, fatigue, douleurs et ressenti personnel est facultatif. Il aide les coachs à examiner une adaptation et ne constitue pas un dossier médical. Les décisions sportives restent celles des coachs, sans diagnostic ni prédiction automatisée de blessure.</p>
   <h3>Qui peut consulter ?</h3><p>Chaque athlète accède à son suivi. Les coachs autorisés du groupe accèdent aux données nécessaires à l’encadrement. Les notes privées de coach ne sont pas affichées aux autres athlètes. Les comptes et les règles de la base restreignent les accès.</p>
   <h3>Hébergement, recherche et IA</h3><p>Les services utilisés sont Supabase pour les données et les comptes, et Cloudflare pour le site et les fonctions serveur. Leurs sous-traitants, lieux de traitement et garanties doivent figurer dans les informations d’hébergement ci-dessous. Le choix d’une région ne garantit pas à lui seul l’absence d’accès depuis un autre pays.</p><p>{policy.hosting_details||'Détails contractuels, lieux de traitement et garanties à compléter avant publication.'}</p>
   <p>Aucun profil, résultat individuel, douleur ou message personnel n’est envoyé à un modèle d’IA externe par les fonctions d’aide à l’entraînement. La recherche documentaire emploie des thèmes généraux. L’aide IA individuelle optionnelle s’exécute dans le navigateur sur les appareils compatibles, après téléchargement du modèle ; les données individuelles ne sont pas incluses dans les requêtes de téléchargement. La consultation d’un lien externe reste soumise au fonctionnement et aux journaux de ce site.</p>
   <h3>Conservation et droits</h3><p>Les durées configurées sont de {policy.retention_months} mois pour le suivi sportif et de {policy.health_retention_months} mois pour les saisies de santé. Le responsable doit en vérifier la justification, gérer les échéances et traiter les exceptions légales. L’outil de gestion propose un contrôle et une purge des questionnaires expirés ; les messages et notes nécessitent aussi une revue humaine.</p>
   <p>Tu peux demander des renseignements sur tes données, leur rectification, et leur effacement lorsque les conditions le permettent. Tu peux retirer ton accord au suivi facultatif. Le retrait bloque les nouvelles saisies concernées ; les demandes d’effacement et les obligations de conservation se traitent avec le responsable.</p>
   <h3>Mineurs et choix éclairé</h3><p>L’information doit être comprise par l’athlète. L’intervention du représentant légal est à organiser selon la capacité de discernement et le cadre retenu. Un nom saisi dans l’application est une déclaration, pas une vérification de l’autorité parentale.</p>
   <p className="small muted">Cette information et les réglages techniques ne constituent pas une certification LPD/LIPAD. Le responsable valide le cadre applicable et les documents.</p>
  </section>)}
