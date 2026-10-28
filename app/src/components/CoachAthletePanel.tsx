import {Link} from 'react-router-dom'
import {useData} from '../lib/data'
import {fullName,formatDate,todayISO} from '../lib/utils'
import {athletePlanningContext} from '../lib/cycleProjection'
import {dayCycle} from '../lib/planningPhases'
import {PHASES} from '../lib/season'
import {SidePanel} from './SidePanel'
export function CoachAthletePanel({athleteId,onClose}:{athleteId:string;onClose:()=>void}){
 const {athletes,tests,test_results,records,test_reports,me}=useData(),athlete=athletes.find(a=>a.id===athleteId),today=todayISO()
 if(!athlete)return null
 const context=athletePlanningContext(athlete,today,test_results,records,test_reports),cycle=dayCycle(me?.settings?.season,today,athleteId)
 return <SidePanel title={fullName(athlete)} onClose={onClose}><p className="small muted">{athlete.events||'Disciplines à renseigner'}</p><div className="panel-objective"><p className="eyebrow">OBJECTIF PERSONNEL</p><h3>{athlete.goals||'À définir avec l’athlète'}</h3></div><div className="row gap wrap"><span className="pill">{cycle.ambiguous?'Blocs à préciser':cycle.phase?PHASES[cycle.phase].label:'Phase à définir'}</span><Link className="btn small" to={`/saison?athlete=${athleteId}`}>Son parcours →</Link></div><h3>Dernières références datées</h3>{context.results.length?context.results.map(r=><div className="panel-reference" key={r.id}><b>{tests.find(t=>t.id===r.test_id)?.name??'Test'}</b><span>{r.value} {tests.find(t=>t.id===r.test_id)?.unit}</span><small>{formatDate(r.date)}</small></div>):<p className="small muted">Aucun test daté disponible.</p>}<h3>Performances enregistrées</h3>{context.records.slice(0,5).map(r=><div className="panel-reference" key={r.id}><b>{r.event}</b><span>{r.mark}</span><small>{formatDate(r.date)}</small></div>)}{!context.records.length&&<p className="small muted">Aucune performance datée disponible.</p>}<div className="panel-footer-actions"><Link className="btn primary" to={`/athletes/${athleteId}`}>Ouvrir le suivi complet</Link><Link className="btn" to={`/bilan?date=${today}&athlete=${athleteId}`}>Faire le bilan</Link></div></SidePanel>
}
