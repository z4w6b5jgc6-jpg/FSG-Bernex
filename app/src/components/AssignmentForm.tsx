import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import type { Assignment } from '../types'
import { errorMessage, fullName } from '../lib/utils'
import { Field, Modal } from './ui'
import { venues } from '../lib/settings'

export function AssignmentForm({
  initial, onClose, onSaved,
}: {
  initial: Partial<Assignment>
  onClose: () => void
  onSaved?: (a: Assignment) => void
}) {
  const { sessions, groups, athletes, save } = useData()
  const [a, setA] = useState<Partial<Assignment>>({ time: '', location: '', note: '', athlete_ids: [], group_id: null, ...initial })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (patch: Partial<Assignment>) => setA((x) => ({ ...x, ...patch }))
  const ids = a.athlete_ids ?? []
  const toggle = (id: string) => set({ athlete_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!a.session_id) return setErr('Choisis une séance.')
    if (!a.group_id && ids.length === 0) return setErr('Choisis un groupe ou au moins un athlète.')
    setBusy(true)
    try {
      const saved = await save('assignments', {
        id: a.id, session_id: a.session_id, date: a.date, time: a.time, location: a.location,
        group_id: a.group_id || null, athlete_ids: ids, note: a.note,
      })
      onSaved?.(saved)
      onClose()
    } catch (e2) {
      setErr(errorMessage(e2))
    } finally {
      setBusy(false)
    }
  }

  const others = athletes.filter((x) => x.active && x.group_id !== a.group_id).sort((x, y) => fullName(x).localeCompare(fullName(y)))

  return (
    <Modal title={a.id ? 'Modifier la planification' : 'Planifier une séance'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="Séance">
          <select value={a.session_id ?? ''} onChange={(e) => set({ session_id: e.target.value })} required>
            <option value="">— Choisir —</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
        <div className="grid2">
          <Field label="Date"><input type="date" value={a.date ?? ''} onChange={(e) => set({ date: e.target.value })} required /></Field>
          <Field label="Heure"><input type="time" value={a.time ?? ''} onChange={(e) => set({ time: e.target.value })} /></Field>
        </div>
        <Field label="Lieu">
          <input list="venues" value={a.location ?? ''} onChange={(e) => set({ location: e.target.value })} placeholder="Stade, salle…" />
          <datalist id="venues">{venues().map((v) => <option key={v} value={v} />)}</datalist>
        </Field>
        <Field label="Groupe">
          <select value={a.group_id ?? ''} onChange={(e) => set({ group_id: e.target.value || null })}>
            <option value="">— Aucun groupe —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        {a.group_id && (
          <p className="small muted">
            ✅ Tout le groupe <b>{groups.find((g) => g.id === a.group_id)?.name}</b> reçoit la séance
            ({athletes.filter((x) => x.active && x.group_id === a.group_id).length} athlètes, et les futurs inscrits du groupe).
          </p>
        )}
        {others.length > 0 && (
          <Field label={a.group_id ? 'Ajouter d’autres athlètes' : 'Athlètes'}>
            <div className="row gap wrap select-all">
              <button type="button" className="btn small" onClick={() => set({ athlete_ids: [...new Set([...ids, ...others.map((x) => x.id)])] })}>✓ Tout sélectionner</button>
              {!a.group_id && groups.filter((g) => others.some((x) => x.group_id === g.id)).map((g) => (
                <button key={g.id} type="button" className="btn small ghost" onClick={() => set({ athlete_ids: [...new Set([...ids, ...others.filter((x) => x.group_id === g.id).map((x) => x.id)])] })}>+ {g.name}</button>
              ))}
              {ids.length > 0 && <button type="button" className="btn small ghost" onClick={() => set({ athlete_ids: [] })}>✕ Tout désélectionner</button>}
              <span className="tiny muted">{ids.length} sélectionné(s)</span>
            </div>
            <div className="checklist">
              {others.map((x) => (
                <label key={x.id} className="check">
                  <input type="checkbox" checked={ids.includes(x.id)} onChange={() => toggle(x.id)} />
                  {fullName(x)}
                </label>
              ))}
            </div>
          </Field>
        )}
        <Field label="Message pour les athlètes"><textarea rows={2} value={a.note ?? ''} onChange={(e) => set({ note: e.target.value })} placeholder="Ex. Prendre les pointes" /></Field>
        {err && <div className="alert warn">{err}</div>}
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" disabled={busy}>Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}
