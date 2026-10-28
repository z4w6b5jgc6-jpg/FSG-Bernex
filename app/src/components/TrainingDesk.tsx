import {LocalAssistant} from './LocalAssistant'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { SOURCES, initialSeason, reviewAthlete } from '../lib/season'
import { contentDiff, reduceRepetitions, sessionContent, type SessionContent } from '../lib/adaptation'
import { athletesFor, errorMessage, fullName, uid } from '../lib/utils'
import type { Assignment, Athlete, Session, SessionItem } from '../types'
import { Field, Modal } from './ui'

const STATUS = { present: 'Présent', absent: 'Absent', excused: 'Excusé' } as const
export function TrainingDesk({ assignment, session }: { assignment: Assignment; session: Session }) {
  const { athletes, attendance, session_adjustments, availability, save } = useData()
  const [edit, setEdit] = useState<Athlete | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const members = athletesFor(assignment, athletes)
  const mark = async (athlete: Athlete, status: keyof typeof STATUS) => {
    setBusy(athlete.id); setError('')
    try { await save('attendance', { id: attendance.find((r) => r.assignment_id === assignment.id && r.athlete_id === athlete.id)?.id, assignment_id: assignment.id, athlete_id: athlete.id, status }) }
    catch (e) { setError(errorMessage(e)) } finally { setBusy(null) }
  }
  return <section className="card training-desk">
    <div className="row between wrap"><div><p className="eyebrow">AU BORD DE LA PISTE</p><h2>Présences et programmes individuels</h2></div><span className="pill">{members.filter((a) => attendance.some((r) => r.assignment_id === assignment.id && r.athlete_id === a.id && r.status === 'present')).length}/{members.length} présents</span></div>
    <p className="small muted">Une présence est indépendante du retour après séance. Les adaptations concernent une seule personne et une seule séance.</p>
    {error && <p role="alert" className="alert warn">{error}</p>}
    <div className="desk-roster">{members.map((a) => {
      const current = attendance.find((r) => r.assignment_id === assignment.id && r.athlete_id === a.id)
      const adjustment = session_adjustments.find((r) => r.assignment_id === assignment.id && r.athlete_id === a.id)
      const absence = availability.find((r) => r.athlete_id === a.id && r.status === 'away' && r.start_date <= assignment.date && r.end_date >= assignment.date)
      return <div className="desk-athlete" key={a.id}><div><Link to={`/athletes/${a.id}`}><b>{fullName(a)}</b></Link><p className="tiny muted">{a.events || 'Disciplines à préciser'}</p>{absence && <span className="pill warn">Absence annoncée</span>}{adjustment && <span className="pill ok">Programme adapté</span>}</div><div className="row gap wrap"><select aria-label={`Présence ${fullName(a)}`} value={current?.status ?? ''} disabled={busy === a.id} onChange={(e) => mark(a, e.target.value as keyof typeof STATUS)}><option value="" disabled>À relever</option>{Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select><button className="btn small" onClick={() => setEdit(a)}>{adjustment ? 'Revoir l’adaptation' : 'Adapter la séance'}</button></div></div>
    })}</div>
    {edit && <AdjustmentEditor key={edit.id} athlete={edit} assignment={assignment} session={session} onClose={() => setEdit(null)} />}
  </section>
}

function AdjustmentEditor({ athlete, assignment, session, onClose }: { athlete: Athlete; assignment: Assignment; session: Session; onClose: () => void }) {
  const { me, wellness, feedback, assignments, session_adjustments, evidence_library, tests, test_results, records, athlete_notes, availability, competitions, save, remove } = useData()
  const existing = session_adjustments.find((r) => r.assignment_id === assignment.id && r.athlete_id === athlete.id)
  const original = sessionContent(session)
  const [content, setContent] = useState<SessionContent>(() => structuredClone(existing?.content ?? original))
  const [rationale, setRationale] = useState(existing?.rationale ?? '')
  const [sources, setSources] = useState(existing?.source_ids ?? [])
  const [percent, setPercent] = useState(20)
  const [conditions, setConditions] = useState('normal')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const points = reviewAthlete(athlete, assignment.date, wellness, feedback, assignments, me?.settings?.season?.blocks ?? initialSeason().blocks)
  const latestTests=test_results.filter(r=>r.athlete_id===athlete.id&&r.date<=assignment.date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(r=>({test:tests.find(t=>t.id===r.test_id)?.name??'Test',unit:tests.find(t=>t.id===r.test_id)?.unit??'',value:r.value,date:r.date}))
  const recentRecords=records.filter(r=>r.athlete_id===athlete.id&&r.date<=assignment.date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)
  const privateNotes=athlete_notes.filter(n=>n.athlete_id===athlete.id&&n.created_at.slice(0,10)<=assignment.date).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,3)
  const nextCompetitions=competitions.filter(c=>c.date>=assignment.date&&(!c.athlete_ids.length||c.athlete_ids.includes(athlete.id))).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5).map(c=>({date:c.date,name:c.name,priority:c.athlete_priorities?.[athlete.id]??c.level,events:c.entries[athlete.id]??athlete.events}))
  const availabilityForDate=availability.filter(a=>a.athlete_id===athlete.id&&a.start_date<=assignment.date&&a.end_date>=assignment.date)
  const diff = contentDiff(original, content)
  const itemPatch = (bid: string, iid: string, patch: Partial<SessionItem>) => setContent((s) => ({ ...s, blocks: s.blocks.map((b) => b.id === bid ? { ...b, items: b.items.map((i) => i.id === iid ? { ...i, ...patch } : i) } : b) }))
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMessage('')
    if (!rationale.trim()) return setMessage('Explique la décision avant de la partager avec l’athlète.')
    if (!content.blocks.some((b) => b.items.length)) return setMessage('La séance doit contenir au moins un exercice.')
    setBusy(true)
    try {
      await save('session_adjustments', { id: existing?.id, assignment_id: assignment.id, athlete_id: athlete.id, content: {...content,targets:diff.length?[]:content.targets}, rationale: rationale.trim(), source_ids: sources })
      onClose()
    } catch (e) { setMessage(errorMessage(e)) } finally { setBusy(false) }
  }
  const reset = async () => {
    if (!existing || !confirm('Retirer cette adaptation et revenir au programme commun pour cet athlète ?')) return
    setBusy(true)
    try { await remove('session_adjustments', existing.id); onClose() } catch (e) { setMessage(errorMessage(e)); setBusy(false) }
  }
  return <Modal title={`Adapter pour ${athlete.first_name}`} onClose={onClose}><form className="form adjustment-editor" onSubmit={submit}>
    <p><b>{athlete.events}</b> · {athlete.goals || 'Objectif à préciser'}</p>
    <details><summary>Éléments à examiner avant de décider</summary>{points.map((p, i) => <p className="small" key={i}><b>{p.title}</b> — {p.detail}</p>)}</details>
    <details><summary>Tests, objectifs de compétition et notes disponibles</summary>{latestTests.map((r,i)=><p className="small" key={i}>{r.date} · {r.test} : {r.value} {r.unit}</p>)}{!latestTests.length&&<p className="small muted">Pas de test disponible avant cette séance.</p>}{nextCompetitions.map((c,i)=><p className="small" key={i}>{c.date} · {c.name} · priorité {c.priority} · {c.events}</p>)}{privateNotes.map(n=><p className="small" key={n.id}>{n.text}</p>)}</details>
    <LocalAssistant context={{tests:latestTests,records:recentRecords,coachNotes:privateNotes.map(n=>n.text),competitions:nextCompetitions,availability:availabilityForDate,discipline:athlete.events,goal:athlete.goals,session:content,points:points.map(p=>({title:p.title,detail:p.detail})),conditions}} onChoose={(text,source)=>{setRationale(r=>[r,text].filter(Boolean).join('\n'));setSources(s=>s.includes(source)?s:[...s,source])}} />
    <Field label="Conditions de la séance"><select value={conditions} onChange={(e) => setConditions(e.target.value)}><option value="normal">Conditions habituelles</option><option value="wet">Piste humide / glissante</option><option value="indoor">Repli en salle</option><option value="limited">Matériel ou temps limité</option></select></Field>
    {conditions !== 'normal' && <p className="alert info small">Vérifier le lieu, les appuis, le matériel et les exercices possibles. Cette contrainte ne justifie pas automatiquement une dose différente. Précise ton choix ci-dessous.</p>}
    <Field label="Objectif de cette variante"><textarea rows={2} value={content.objective} onChange={(e) => setContent({ ...content, objective: e.target.value })} /></Field>
    <Field label="Durée prévue (minutes)"><input type="number" min="1" max="600" value={content.duration_min ?? ''} onChange={(e) => setContent({ ...content, duration_min: e.target.value ? Number(e.target.value) : null })} /></Field>
    <details><summary>Préparer une hypothèse de réduction du volume</summary><p className="small muted">Réglage choisi par toi, sans prétention de dose optimale : réduire une seule dimension entière par exercice, sans toucher à l’échauffement, l’intensité ou la récupération. Les textes complexes restent à modifier manuellement.</p><Field label="Réduction demandée (%)"><input type="number" min="0" max="50" value={percent} onChange={(e) => setPercent(Number(e.target.value))} /></Field><button type="button" className="btn" onClick={() => { try { const r = reduceRepetitions(content.blocks, percent); setContent({ ...content, blocks: r.blocks }); setMessage(`${r.changed} exercice(s) modifié(s) dans le brouillon. Vérifie chaque valeur avant validation.`) } catch (e) { setMessage(errorMessage(e)) } }}>Calculer le brouillon</button></details>
    {content.blocks.map((b) => <fieldset key={b.id}><legend>{b.title}</legend>{b.items.map((item) => <div className="adjustment-item" key={item.id}>
      <Field label="Exercice"><input required value={item.name} onChange={(e) => itemPatch(b.id,item.id,{name:e.target.value})} /></Field>
      <div className="grid2">{([['sets','Séries'],['reps','Répétitions'],['distance','Distance'],['duration','Durée'],['recovery','Récupération'],['intensity','Intensité'],['load_kg','Charge externe totale · kg']] as const).map(([key,label]) => <Field key={key} label={label}><input value={item[key]??''} onChange={(e) => itemPatch(b.id,item.id,{[key]:e.target.value})} /></Field>)}</div>
      <Field label="Consignes"><textarea rows={2} value={item.notes} onChange={(e) => itemPatch(b.id,item.id,{notes:e.target.value})} /></Field><button className="btn ghost small" type="button" onClick={() => setContent({ ...content, blocks: content.blocks.map((block) => block.id === b.id ? { ...block, items: block.items.filter((i) => i.id !== item.id) } : block) })}>Retirer cet exercice du brouillon</button>
    </div>)}<button className="btn small" type="button" onClick={() => setContent({ ...content, blocks: content.blocks.map((block) => block.id === b.id ? { ...block, items:[...block.items,{ id:uid(), name:'',sets:'',reps:'',distance:'',duration:'',recovery:'',intensity:'',notes:'' }] } : block) })}>+ Exercice</button></fieldset>)}
    {diff.length>0&&<p className="small muted">Les anciennes cibles chronométrées du fichier seront masquées pour cette variante. Vérifie les distances et intensités ; les allures VMA explicitement renseignées restent calculables par exercice.</p>}
    <details open><summary>Comparaison au programme commun · {diff.length} changement(s)</summary>{diff.length ? <ul>{diff.map((d,i) => <li className="small" key={i}>{d}</li>)}</ul> : <p className="small muted">Contenu identique ; tu peux ajouter une consigne individuelle motivée.</p>}</details>
    <Field label="Décision et justification — visibles seulement par cet athlète et les coachs"><textarea required rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} /></Field>
    <details><summary>Références de contexte à joindre</summary><p className="tiny muted">Joindre une référence n’en fait pas la preuve d’un pourcentage de réduction : vérifie son applicabilité.</p>{SOURCES.map((s) => <label className="check small" key={s.id}><input type="checkbox" checked={sources.includes(s.id)} onChange={(e) => setSources(e.target.checked ? [...sources,s.id] : sources.filter((id) => id!==s.id))} />{s.title}</label>)}{evidence_library.filter(r=>r.reviewed).map(r=><label className="check small" key={r.id}><input type="checkbox" checked={sources.includes(`pmid:${r.paper.id}`)} onChange={e=>setSources(e.target.checked?[...sources,`pmid:${r.paper.id}`]:sources.filter(id=>id!==`pmid:${r.paper.id}`))}/>{r.paper.title} · bibliothèque du coach</label>)}</details>
    {message && <p role="status" className="alert info">{message}</p>}
    <div className="row gap wrap"><button className="btn primary" disabled={busy} type="submit">Valider l’adaptation individuelle</button><button className="btn" type="button" onClick={() => setContent(original)}>Repartir du programme commun</button>{existing && <button className="btn ghost" type="button" disabled={busy} onClick={reset}>Retirer l’adaptation enregistrée</button>}</div>
    <p className="tiny muted">Visible à l’heure d’ouverture de la séance. Le programme commun et les autres athlètes restent inchangés.</p>
  </form></Modal>
}
