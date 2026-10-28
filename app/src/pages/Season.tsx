import {ProgramPeriodization} from '../components/ProgramPeriodization'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useData } from '../lib/data'
import {planVersion} from '../lib/programCycles'
import {ProgramCycleReview} from '../components/ProgramCycleReview'
import {CycleDevelopment} from '../components/CycleDevelopment'
import { SeasonHistogram } from '../components/SeasonHistogram'
import { Field, Modal } from '../components/ui'
import { addDays, errorMessage, formatDate, fullName, todayISO, uid } from '../lib/utils'
import { HOLIDAY_SOURCE, PHASES, SOURCES, initialSeason, proposePreparation, reviewAthlete, targets, validDate, validateSeason, sequenceWarnings, type Phase, type SeasonBlock, type SeasonPlan } from '../lib/season'

const period = (start: string, end: string) => `${formatDate(start, { day: 'numeric', month: 'short' })} – ${formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`

export function Season() {
  const { me, athletes, assignments, feedback, wellness, competitions, refreshMe, save } = useData()
  const [params] = useSearchParams()
  const [baseline,setBaseline]=useState(()=>planVersion(me?.settings?.season))
  const [remotePlan,setRemotePlan]=useState<{plan:SeasonPlan;stamp:string}|null>(null)
  const [plan, setPlan] = useState<SeasonPlan>(() => structuredClone(me?.settings?.season ?? initialSeason()))
  const [athleteId, setAthleteId] = useState(params.get('athlete') ?? '')
  const [date, setDate] = useState(todayISO())
  const [editing, setEditing] = useState<SeasonBlock | null>(null)
  const [weekEdit,setWeekEdit]=useState<string|null>(null)
  const [builder, setBuilder] = useState(false)
  const [targetDate, setTargetDate] = useState('')
  const [lengths, setLengths] = useState({ extensive: 4, intensive: 3, explosive: 3, recovery: 1 })
  const [builderError, setBuilderError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [decision, setDecision] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteMessage, setNoteMessage] = useState('')
  const selected = athletes.find((a) => a.id === athleteId)
  const blocks = plan.blocks.filter((b) => !athleteId || targets(b, athleteId)).sort((a, b) => a.start.localeCompare(b.start))
  const points = selected ? reviewAthlete(selected, date, wellness, feedback, assignments, plan.blocks) : []
  const change = (p: SeasonPlan) => { setPlan(p); setDirty(true); setMessage('') }
  const buildPreparation = (e: FormEvent) => {
    e.preventDefault()
    try {
      const additions = proposePreparation(targetDate, athleteId ? [athleteId] : [], lengths)
      const next = { ...plan, blocks: [...plan.blocks, ...additions] }
      const problem = validateSeason(next)
      if (problem) return setBuilderError(problem)
      change(next); setBuilder(false); setMessage('Préparation ajoutée au brouillon. Vérifie les chevauchements avec les blocs existants, le camp et les vacances avant d’enregistrer.')
    } catch (e) { setBuilderError(errorMessage(e)) }
  }
  const persist = async () => {
    const problem = validateSeason(plan)
    if (problem) return setMessage(problem)
    setBusy(true); setMessage('')
    try {
      const current=await api.getMe()
      if(!current||current.role!=='coach')throw new Error('Le compte coach doit être connecté.')
      if(planVersion(current.settings?.season)!==baseline){setRemotePlan({plan:structuredClone(current.settings?.season??initialSeason()),stamp:planVersion(current.settings?.season)});throw new Error('Le plan partagé a changé depuis l’ouverture de cet écran. Ton brouillon est conservé ; aucune écriture n’a été faite.')}
      await api.saveSettings({ ...current.settings, season: plan })
      setBaseline(planVersion(plan));setRemotePlan(null)
      await refreshMe(); setDirty(false); setMessage('Planification enregistrée et partagée avec les coachs.')
    } catch (e) { setMessage(errorMessage(e)) } finally { setBusy(false) }
  }
  const submitBlock = (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const next = { ...plan, blocks: [...plan.blocks.filter((b) => b.id !== editing.id), editing] }
    const problem = validateSeason(next)
    if (problem) return setMessage(problem)
    change(next); setEditing(null)
  }
  const storeDecision = async () => {
    if (!selected || !decision.trim()) return
    setNoteBusy(true); setNoteMessage('')
    try {
      await save('athlete_notes', { athlete_id: selected.id, text: `Décision de préparation — ${date}\nObjectif : ${selected.goals || 'à compléter'}\n${decision.trim()}\nPoints examinés : ${points.map((p) => p.title).join(' ; ')}` })
      setDecision(''); setNoteMessage('Décision conservée dans les notes privées de cet athlète. Les séances restent inchangées.')
    } catch (e) { setNoteMessage(errorMessage(e)) } finally { setNoteBusy(false) }
  }
  const sequenceIssues = sequenceWarnings(blocks)
  return (
    <div className="season-page">
      <div className="season-heading row between wrap">
        <div><p className="eyebrow">PRÉPARATION · GENÈVE</p><h1>Périodisation et suivi des programmes</h1><p className="muted">Cycles, compétitions et récupération · 2026–2027</p></div>
        <div className="row gap wrap">{(busy||dirty)&&<button className="btn primary" disabled={busy || !dirty} onClick={persist}>{busy ? 'Enregistrement…' : 'Enregistrer le plan'}</button>}</div>
      </div>
      <div className="season-toolbar card">
        <Field label="Parcours"><select value={athleteId} onChange={(e) => { setAthleteId(e.target.value); setDecision(''); setNoteMessage('') }}><option value="">Vue globale du groupe</option>{athletes.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{fullName(a)}</option>)}</select></Field>
        <details className="season-frame-settings"><summary>Cadre annuel et blocs de préparation</summary><div className="grid2"><Field label="Début de saison"><input type="date" value={plan.start} onChange={(e) => { if (validDate(e.target.value)) change({ ...plan, start: e.target.value }) }} required /></Field>
        <Field label="Fin de saison"><input type="date" value={plan.end} onChange={(e) => { if (validDate(e.target.value)) change({ ...plan, end: e.target.value }) }} required /></Field>
        <button className="btn" onClick={() => setEditing({ id: uid(), title: '', start: plan.start, end: plan.start, phase: 'extensive', athleteIds: athleteId ? [athleteId] : [], notes: '', provisional: true })}>+ Ajouter un bloc</button></div></details>
      </div>
      {message && <p role="status" className="alert info">{message}</p>}{remotePlan&&<button className="btn" onClick={()=>{setPlan(structuredClone(remotePlan.plan));setBaseline(remotePlan.stamp);setRemotePlan(null);setDirty(false);setMessage('Plan partagé chargé. Le précédent brouillon a été remplacé.')}}>Charger le plan partagé — remplace ce brouillon</button>}
      {dirty && <p className="small warn-text" role="status">Modifications non enregistrées.</p>}
      {selected && <div className="card season-profile"><div><b>{fullName(selected)}</b><p>{selected.events || 'Disciplines à renseigner'}</p></div><div><span className="eyebrow">OBJECTIF PERSONNEL</span><p>{selected.goals || 'À compléter dans la fiche athlète'}</p></div><Link className="btn small" to={`/athletes/${selected.id}`}>Ouvrir le suivi</Link></div>}
      <ProgramPeriodization plan={plan} athleteId={athleteId} calendarConfirmed={!!me?.settings?.season}/><details className="season-scenarios"><summary>Plan du coach et scénarios de préparation</summary>{!me?.settings?.season&&<p className="small muted">Aucun plan annuel enregistré. La trame de scénario ci-dessous reste à valider et n’alimente pas les périodes observées au-dessus.</p>}<div className="row gap wrap"><button className="btn" onClick={() => { setBuilderError(''); setBuilder(true) }}>Construire une préparation depuis une compétition</button><span className="small muted">Phases proposées, durées et récupération à valider</span></div><ProgramCycleReview plan={plan} athleteId={athleteId} onChange={change} onEdit={setEditing}/><details className="season-counts"><summary>Vue de toute la saison · séances, durées et charges déclarées</summary><SeasonHistogram plan={plan} athleteId={athleteId} onWeek={setWeekEdit} /></details><CycleDevelopment plan={plan} athleteId={athleteId} onChange={change} initialProjectionId={params.get('projection')??undefined}/></details>
      {sequenceIssues.length>0&&<details className="alert warn small"><summary>{sequenceIssues.length} point(s) à vérifier dans les séquences</summary><ul>{sequenceIssues.map((s,i)=><li key={i}>{s}</li>)}</ul></details>}
      <p className="tiny muted">Ordre de référence choisi : extensif → intensif → explosif, avec récupérations ajustables. Les durées sont des propositions à valider. <a href={HOLIDAY_SOURCE} target="_blank" rel="noreferrer">Vacances officielles Genève</a>.</p>
      <details className="cycle-board card"><summary><b>Tableau des cycles · {blocks.length} blocs</b></summary><div className="board-scroll"><table className="table"><thead><tr><th>Préparation</th><th>Phase</th><th>Dates</th><th>Statut</th><th></th></tr></thead><tbody>{blocks.map(b=><tr key={b.id}><td><b>{b.title}</b><p className="tiny muted">{b.athleteIds.length?`${b.athleteIds.length} athlète(s)`:'Socle commun'}</p></td><td><span className="board-status" style={{background:PHASES[b.phase].color}}>{PHASES[b.phase].label}</span></td><td className="small">{period(b.start,b.end)}</td><td><span className={`pill ${b.provisional?'':'ok'}`}>{b.provisional?'À valider':'Confirmé'}</span></td><td><button className="btn small" onClick={()=>setEditing(structuredClone(b))}>Modifier</button></td></tr>)}</tbody></table></div></details>
      <section className="card season-review">
        <div className="row between wrap"><div><p className="eyebrow">AIDE À LA DÉCISION · TRAITEMENT DANS LE NAVIGATEUR</p><h2>Préparer et adapter</h2></div><Field label="Date à examiner"><input type="date" value={date} onChange={(e) => { setDate(e.target.value); setNoteMessage('') }} /></Field></div>
        {!selected ? <p className="muted">Choisis un athlète dans « Parcours » pour rapprocher ses objectifs, son cycle et les réponses disponibles.</p> : <>
          <p className="small muted">Règles de revue explicites, sans IA générative ni transmission à une IA externe. Aucune séance n’est modifiée automatiquement.</p>
          <div className="review-points">{points.map((p, i) => <article key={i} className={p.attention ? 'review-point attention' : 'review-point'}><b>{p.title}</b><p>{p.detail}</p>{SOURCES.find((s) => s.id === p.source) && <a className="small" href={SOURCES.find((s) => s.id === p.source)!.url} target="_blank" rel="noreferrer">Référence de contexte · vérifier son applicabilité →</a>}</article>)}</div>
          <Field label="Ta décision de coach"><textarea rows={3} value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="Maintenir, adapter ou reporter ; préciser le changement et sa raison…" /></Field>
          <div className="row gap wrap"><button className="btn primary" disabled={noteBusy || !decision.trim()} onClick={storeDecision}>{noteBusy ? 'Enregistrement…' : 'Enregistrer la décision privée'}</button><Link className="btn" to={`/planning?date=${date}`}>Ajuster les séances du jour</Link></div>
          {noteMessage && <p role="status" className="small">{noteMessage}</p>}
        </>}
      </section>
      <section><h2>Compétitions renseignées</h2>{competitions.filter((c) => c.date >= plan.start && c.date <= plan.end && (!selected || !c.athlete_ids.length || c.athlete_ids.includes(selected.id))).map((c) => <Link className="card link-card" key={c.id} to="/competitions"><b>{c.name}</b><span className="muted"> · {period(c.date, c.end_date || c.date)} · priorité {selected?c.athlete_priorities?.[selected.id]??c.level:c.level}</span></Link>)}<Link to="/competitions">Renseigner les dates exactes et les priorités individuelles →</Link></section>
      <details className="card"><summary><b>Références et limites des propositions</b></summary><p className="small muted">Bibliothèque documentaire initiale vérifiée le 26 octobre 2026. Aucune veille automatique n’est activée. Les durées de la trame sont des choix de planification à valider, pas des résultats scientifiques.</p>{SOURCES.map((s) => <p key={s.id} className="small"><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a><br />{s.scope}</p>)}</details>
      {weekEdit && <Modal title={`Semaine du ${formatDate(weekEdit,{day:'numeric',month:'long'})}`} onClose={()=>setWeekEdit(null)}>
       <p className="small muted">{selected?fullName(selected):'Socle commun du groupe'} · les cibles sont choisies par le coach.</p>
       <div className="form">{(['minutes','rpe'] as const).map(key=><Field key={key} label={key==='minutes'?'Durée cible de la semaine · minutes':'Effort cible global · 1 à 10'}><input type="number" min={key==='minutes'?0:1} max={key==='minutes'?3000:10} value={plan.weekTargets?.[`${weekEdit}|${athleteId||'group'}`]?.[key]??''} onChange={e=>{const k=`${weekEdit}|${athleteId||'group'}`;change({...plan,weekTargets:{...plan.weekTargets,[k]:{minutes:null,rpe:null,note:'',...plan.weekTargets?.[k],[key]:e.target.value===''?null:Number(e.target.value)}}})}}/></Field>)}
       <p className="tiny muted">Charge cible = durée cible × effort cible. Cette approximation est une intention du coach, distincte de la charge réellement déclarée par séance.</p>
       <Link className="btn primary" to={`/planning?date=${weekEdit}`}>Ouvrir les séances de la semaine</Link>
       <h3>Blocs concernés</h3>{blocks.filter(b=>b.start<=addDays(weekEdit,6)&&b.end>=weekEdit).map(b=><button className="btn" key={b.id} onClick={()=>{setEditing(structuredClone(b));setWeekEdit(null)}}>{b.title} · modifier</button>)}
       <button className="btn" onClick={()=>setWeekEdit(null)}>Fermer — conserver dans le brouillon</button></div>
      </Modal>}
      {builder && <Modal title="Construire une préparation" onClose={() => setBuilder(false)}><form className="form" onSubmit={buildPreparation}>
        <p className="small muted">Pour {selected ? fullName(selected) : 'le socle commun du groupe'}. Construction à rebours depuis une compétition, sans créer de séances ni prescrire de charges.</p>
        <Field label="Compétition de référence"><select value={targetDate} onChange={(e) => setTargetDate(e.target.value)}><option value="">Choisir ou saisir la date ci-dessous</option>{competitions.filter((c) => !selected || !c.athlete_ids.length || c.athlete_ids.includes(selected.id)).map((c) => <option key={c.id} value={c.date}>{c.name} · {c.date}</option>)}</select></Field>
        <Field label="Date de l’échéance"><input required type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
        <div className="grid2">{(['extensive', 'intensive', 'explosive', 'recovery'] as const).map((phase) => <Field key={phase} label={`${PHASES[phase].label} · semaines${phase === 'recovery' ? ' entre les phases' : ''}`}><input required type="number" min={phase === 'recovery' ? 0 : 1} max={phase === 'recovery' ? 2 : 12} value={lengths[phase]} onChange={(e) => setLengths({ ...lengths, [phase]: Number(e.target.value) })} /></Field>)}</div>
        <p className="small muted">Egger décrit des mésocycles de 4 semaines en extensif et de 3 semaines en intensif / explosif, récupération comprise. Ce ne sont pas des durées obligatoires de phase. La récupération proposée entre phases est un réglage de travail du coach, pas une règle attribuée à Egger. Les dates, l’affûtage et l’applicabilité aux jeunes restent à valider.</p>
        <p className="small muted">Les blocs existants sont conservés ; leur articulation doit être revue. Les compétitions de janvier, mai–juin et septembre n’ont pas encore de date exacte confirmée.</p>
        {builderError && <p role="alert" className="warn-text">{builderError}</p>}<button className="btn primary" type="submit">Ajouter la proposition au brouillon</button>
      </form></Modal>}
      {editing && <Modal title="Organiser un bloc" onClose={() => setEditing(null)}><form className="form" onSubmit={submitBlock}>
        <Field label="Titre"><input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
        <Field label="Nom du cycle"><input value={editing.cycle??''} onChange={e=>setEditing({...editing,cycle:e.target.value})} placeholder="Hiver, printemps, septembre…"/></Field>
        <Field label="Phase"><select value={editing.phase} onChange={(e) => setEditing({ ...editing, phase: e.target.value as Phase })}>{Object.entries(PHASES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <div className="grid2"><Field label="Début"><input type="date" required value={editing.start} onChange={(e) => setEditing({ ...editing, start: e.target.value })} /></Field><Field label="Fin incluse"><input type="date" required min={editing.start} value={editing.end} onChange={(e) => setEditing({ ...editing, end: e.target.value })} /></Field></div>
        <Field label="Objectif, récupération et adaptations"><textarea rows={4} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Objectifs de discipline, organisation pendant les vacances, récupération après camp…" /></Field>
        <label><input type="checkbox" checked={editing.provisional} onChange={(e) => setEditing({ ...editing, provisional: e.target.checked })} /> Proposition à valider</label>
        <fieldset><legend>Athlètes concernés</legend><p className="small muted">Aucune sélection = socle commun du groupe. Pour un athlète sans saison hivernale, ajoute un bloc individuel et précise son articulation avec les compétitions.</p><div className="season-roster">{athletes.filter((a) => a.active).map((a) => <label key={a.id}><input type="checkbox" checked={editing.athleteIds.includes(a.id)} onChange={(e) => setEditing({ ...editing, athleteIds: e.target.checked ? [...editing.athleteIds, a.id] : editing.athleteIds.filter((id) => id !== a.id) })} />{fullName(a)}</label>)}</div></fieldset>
        {message && <p role="alert">{message}</p>}
        <div className="row gap wrap"><button className="btn primary" type="submit">Appliquer au brouillon</button><button className="btn" type="button" onClick={() => { change({ ...plan, blocks: plan.blocks.filter((b) => b.id !== editing.id) }); setEditing(null) }}>Retirer du plan</button></div>
      </form></Modal>}
      <p className="tiny muted">Lundi, mercredi, jeudi et vendredi · 18 h–20 h · heure de Genève. La planification des cycles ne crée ni ne remplace les séances importées.</p>
    </div>
  )
}
