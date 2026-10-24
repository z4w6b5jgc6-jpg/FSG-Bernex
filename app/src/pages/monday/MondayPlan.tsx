import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { TargetTable } from '../../components/TargetTable'
import { Empty, Field } from '../../components/ui'
import { useData } from '../../lib/data'
import { planBlocks, planObjective, subgroupLabel } from '../../lib/mondayPlan'
import { planOf, planSessions, targetLabel } from '../../lib/targets'
import { noteOf, saveNote } from '../../lib/notes'
import type { Session, SessionPlan, Target, TargetBase } from '../../types'
import { errorMessage, formatDate, fullName } from '../../lib/utils'

/** Plan (coachs) : les séances du lundi par cycle */
export function MondayPlan() {
  const { sessions } = useData()
  const plan = useMemo(() => planSessions(sessions), [sessions])
  const dates = [...new Set(plan.map((s) => planOf(s)!.date))]
  const cycles = [...new Set(dates.map((d) => planOf(plan.find((s) => planOf(s)!.date === d)!)!.cycle))]
  return (
    <div>
      <BackLink to="/lundi" label="Séance du lundi" />
      <h1>📋 Plan du lundi</h1>
      {!dates.length && <Empty>Aucun plan importé. <Link to="/lundi/import">Importer le plan</Link></Empty>}
      {cycles.map((c) => (
        <section key={c}>
          <h2>{c || 'Sans cycle'}</h2>
          <div className="list">
            {dates.filter((d) => planOf(plan.find((s) => planOf(s)!.date === d)!)!.cycle === c).map((d) => {
              const day = plan.filter((s) => planOf(s)!.date === d)
              const p = planOf(day[0])!
              return (
                <Link key={d} to={`/lundi/plan/${d}`} className="card link-card">
                  <div className="row between wrap">
                    <b>S{String(dates.indexOf(d) + 1).padStart(2, '0')} · {formatDate(d, { weekday: 'short', day: 'numeric', month: 'long' })}</b>
                    {p.light && <span className="pill">allégée</span>}
                  </div>
                  <div className="small">{p.objective}</div>
                  {day.map((s) => (
                    <div key={s.id} className="tiny muted">
                      {subgroupLabel(planOf(s)!.subgroup)} : {(s.targets ?? []).map(targetLabel).join(' · ') || 'pas de temps cible'}
                    </div>
                  ))}
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

const BASES: { v: TargetBase; label: string }[] = [
  { v: 'VMA', label: '% VMA' },
  { v: 'RVA', label: '% RVA (VMA + % de la réserve)' },
  { v: 'REC', label: '% du record' },
  { v: 'INT', label: 'Intermittent (durée en s → mètres)' },
]

/** Édition d'un lundi : textes communs, contenu et cibles de chaque sous-groupe ; temps recalculés en direct */
export function MondayEdit() {
  const { date } = useParams()
  const { sessions, loading } = useData()
  const day = useMemo(() => planSessions(sessions).filter((s) => planOf(s)!.date === date), [sessions, date])
  if (!day.length) return loading ? <p className="muted">Chargement…</p> : <Empty>Séance introuvable. <Link to="/lundi/plan">Retour au plan</Link></Empty>
  return <EditDay key={date} date={date!} day={day} />
}

function EditDay({ date, day }: { date: string; day: Session[] }) {
  const { athletes, session_notes, save } = useData()
  const nav = useNavigate()
  const [common, setCommon] = useState<SessionPlan>({ ...planOf(day[0])! })
  // Remarques : notes réservées aux coachs (table à part), communes aux séances du jour
  const [remarks, setRemarks] = useState(noteOf(session_notes, day[0].id)?.text || planOf(day[0])!.remarks || '')
  const [parts, setParts] = useState<Record<string, { content: string; targets: Target[] }>>(
    () => Object.fromEntries(day.map((s) => [s.id, { content: planOf(s)!.content, targets: [...(s.targets ?? [])] }])),
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const setC = (patch: Partial<SessionPlan>) => setCommon({ ...common, ...patch })
  const setP = (id: string, patch: Partial<{ content: string; targets: Target[] }>) => setParts((x) => ({ ...x, [id]: { ...x[id], ...patch } }))
  const setT = (id: string, k: number, patch: Partial<Target>) => setP(id, { targets: parts[id].targets.map((t, i) => (i === k ? { ...t, ...patch } : t)) })

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      for (const s of day) {
        const p: SessionPlan = { ...common, remarks: '', subgroup: planOf(s)!.subgroup, content: parts[s.id].content }
        const targets = parts[s.id].targets.filter((t) => t.d > 0 && t.pct > 0).map((t, i) => ({ ...t, ordre: i + 1 }))
        await save('sessions', { id: s.id, plan: p, objective: planObjective(p), blocks: planBlocks(p), targets } as Partial<Session> & { id: string })
        await saveNote(save, session_notes, s.id, remarks)
      }
      nav(`/lundi?date=${date}`)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <BackLink to="/lundi/plan" label="Plan" />
      <h1>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h1>
      <section className="card form">
        <div className="grid2">
          <Field label="Cycle"><input value={common.cycle} onChange={(e) => setC({ cycle: e.target.value })} /></Field>
          <Field label="Objectif"><input value={common.objective} onChange={(e) => setC({ objective: e.target.value })} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={common.light} onChange={(e) => setC({ light: e.target.checked })} /> <span>Semaine allégée</span></label>
        <Field label="Échauffement"><textarea rows={2} value={common.warmup} onChange={(e) => setC({ warmup: e.target.value })} /></Field>
        <Field label="Bloc vitesse (commun)"><textarea rows={2} value={common.speed} onChange={(e) => setC({ speed: e.target.value })} /></Field>
        <Field label="Retour au calme / prévention"><textarea rows={2} value={common.cooldown} onChange={(e) => setC({ cooldown: e.target.value })} /></Field>
        <Field label="🔒 Remarques (visibles seulement par les coachs)"><textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      </section>

      {day.map((s) => {
        const sg = planOf(s)!.subgroup
        const part = parts[s.id]
        const members = athletes.filter((a) => a.active && a.subgroup === sg).sort((a, b) => fullName(a).localeCompare(fullName(b)))
        return (
          <section key={s.id} className="card form">
            <h2>{subgroupLabel(sg)}</h2>
            <Field label="Contenu"><textarea rows={3} value={part.content} onChange={(e) => setP(s.id, { content: e.target.value })} /></Field>
            <b className="small">Répétitions chronométrées</b>
            {part.targets.map((t, k) => (
              <div key={k} className="target-row">
                <Field label={t.base === 'INT' ? 'Durée (s)' : 'Distance (m)'}>
                  <input type="number" inputMode="decimal" min={1} value={t.d || ''} onChange={(e) => setT(s.id, k, { d: Number(e.target.value) })} />
                </Field>
                <Field label="Base">
                  <select value={t.base} onChange={(e) => setT(s.id, k, { base: e.target.value as TargetBase })}>
                    {BASES.map((b) => <option key={b.v} value={b.v}>{b.label}</option>)}
                  </select>
                </Field>
                <Field label="%">
                  <input type="number" inputMode="decimal" min={1} step={1} value={t.pct ? Math.round(t.pct * 1000) / 10 : ''} onChange={(e) => setT(s.id, k, { pct: Number(e.target.value) / 100 })} />
                </Field>
                <button type="button" className="btn ghost icon small danger" aria-label="Retirer" onClick={() => setP(s.id, { targets: part.targets.filter((_, i) => i !== k) })}>✕</button>
              </div>
            ))}
            {part.targets.length < 3 && (
              <button type="button" className="btn small" onClick={() => setP(s.id, { targets: [...part.targets, { ordre: part.targets.length + 1, d: 100, base: 'VMA', pct: 1 }] })}>+ Cible</button>
            )}
            <TargetTable targets={part.targets.filter((t) => t.d > 0 && t.pct > 0)} athletes={members} />
          </section>
        )
      })}
      {err && <div className="alert warn">{err}</div>}
      <div className="sticky-actions">
        <button className="btn primary block" disabled={busy} onClick={run}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  )
}
