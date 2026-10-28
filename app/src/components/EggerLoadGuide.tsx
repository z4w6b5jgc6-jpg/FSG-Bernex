import { EGGER_REFERENCE } from '../lib/loadDynamics'
import { PHASES } from '../lib/season'
export function EggerLoadGuide() {
 return <section className="egger-guide" aria-label="Dynamique des charges selon Egger">
  <div className="row between wrap"><div><p className="eyebrow">REPÈRE DOCUMENTÉ · EGGER 1997</p><h3>Progressif en extensif, dégressif en intensif et explosif</h3></div><a className="small" href="https://www.persee.fr/doc/insep_1241-0691_1997_num_21_1_2059?pageId=T1_189" target="_blank" rel="noreferrer">Lire le passage · p. 188–189</a></div>
  <div className="egger-models">{Object.entries(EGGER_REFERENCE).map(([phase, model]) => <article key={phase} style={{borderTopColor:PHASES[phase as keyof typeof PHASES].color}}>
   <strong>{PHASES[phase as keyof typeof PHASES].label}</strong><span className="small">{model.label}</span>
   <div className="egger-mini-bars" role="img" aria-label={`${model.label} : indices relatifs ${model.indices.join(', ')}. Dernière semaine de récupération.`}>{model.indices.map((value,i) => <div key={i}><span>{value}</span><i className={i===model.indices.length-1?'unload':''} style={{height:value*.55,backgroundColor:PHASES[phase as keyof typeof PHASES].color}}/><small>S{i+1}{i===model.indices.length-1?' · R':''}</small></div>)}</div><p className="tiny muted">{model.purpose}</p>
  </article>)}</div>
  <p className="tiny muted">Indices relatifs de la figure 1, p. 188 : ni % de 1RM, ni minutes, ni cibles de tes athlètes. Le texte p. 189 donne aussi un exemple de séries 3 → 4 → 5 → 2 : les chiffres illustrent le principe, sans constituer une règle unique. Modèle de force de haut niveau adulte, à adapter aux U16–U18.</p>
 </section>
}
