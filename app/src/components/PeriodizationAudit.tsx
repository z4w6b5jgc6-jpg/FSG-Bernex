import {LocalPeriodizationReview} from './LocalPeriodizationReview'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import type { ProjectionWeek } from '../lib/cycleProjection'
import { auditPeriodization } from '../lib/periodizationAudit'
import { formatDate } from '../lib/utils'
export function PeriodizationAudit({weeks,athleteId}:{weeks:ProjectionWeek[];athleteId:string}) {
 const {athletes,assignments,sessions,session_adjustments,feedback,loading,error}=useData()
 const athlete=athletes.find(a=>a.id===athleteId)
 const audit=auditPeriodization(weeks,{assignments,sessions,adjustments:session_adjustments,feedback},athlete)
 const kinds={phase:'Articulation de phase',target:'Écart à la cible du coach','duration-trend':'Tendance à examiner',missing:'Donnée à compléter'}
 return <section className="periodization-audit" aria-label="Analyse des séances et corrections proposées">
  <div className="row between wrap"><div><p className="eyebrow">SÉANCES RÉELLEMENT PROGRAMMÉES</p><h3>Analyse et corrections à examiner</h3></div><span className="pill">{audit.issues.length} point(s) de revue</span></div>
  {!athlete&&<p className="alert info small">Choisis un athlète dans « Parcours » pour comparer ses durées et ses charges. Les contenus parallèles des sous-groupes ne sont pas additionnés en une charge collective.</p>}
  {(loading||error)&&<p className="alert warn">{loading?'Actualisation en cours : analyse provisoire.':`Données partiellement indisponibles : ${error}`}</p>}
  <div className="board-scroll"><table className="table"><thead><tr><th>Semaine</th><th>Séances</th><th>Durée prévue / cible</th><th>Charge déclarée · UA</th></tr></thead><tbody>{audit.rows.map(r=><tr key={r.week.id}><td>{formatDate(r.week.start)}</td><td>{r.assignments.length}</td><td>{r.minutes??'—'} / {r.week.minutes??'—'} min</td><td>{r.declaredLoad??'—'}{athlete&&<small className="muted"> · {r.known} retour(s) chiffré(s) / {r.assignments.length} séances</small>}</td></tr>)}</tbody></table></div>
  <p className="tiny muted">Charge déclarée = somme des durées réalisées × RPE de cet athlète, seulement pour les retours renseignés ; elle peut être partielle. Les retours « non réalisé » comptent zéro. La durée prévue ne mesure ni les mètres de sprint, ni les contacts de saut, ni le tonnage. Intensité externe et récupération entre efforts restent à examiner dans les contenus.</p>
  {!audit.issues.length&&<p className="small muted">Aucun écart détecté par ces contrôles. Cela ne valide pas l’adéquation physiologique des séances ; les données de volume et d’intensité spécifiques peuvent manquer.</p>}
  <div className="periodization-issues">{audit.issues.map((issue,i)=><article key={`${issue.weekId}-${i}`}><span className="eyebrow">{kinds[issue.kind]} · {formatDate(weeks.find(w=>w.id===issue.weekId)!.start)}</span><p><b>{issue.text}</b></p><p className="small">{issue.correction}</p>{issue.assignmentId&&<Link className="btn small" to={`/planning/${issue.assignmentId}`}>Examiner / adapter la séance</Link>}</article>)}</div>
  <LocalPeriodizationReview audit={audit} individual={!!athlete}/>
  <p className="tiny muted">Les propositions sont locales et explicites. Aucune séance ni charge n’est modifiée par l’analyse. Le coach décide du changement et de sa justification.</p>
 </section>
}
