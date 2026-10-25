import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { EXERCISES, liftMark, parseLift } from '../lib/muscu'
import type { PersonalRecord } from '../types'
import { errorMessage, todayISO } from '../lib/utils'
import { Field, Modal } from './ui'

/** Ajout / modification d'une charge maximale */
export function MuscuForm({ initial, athleteId, onClose }: { initial: Partial<PersonalRecord>; athleteId: string; onClose: () => void }) {
  const { save } = useData()
  const lift = parseLift(initial.mark ?? '')
  const [event, setEvent] = useState(initial.event ?? '')
  const [kg, setKg] = useState(lift ? String(lift.kg) : '')
  const [reps, setReps] = useState(lift?.reps ? String(lift.reps) : '')
  const [date, setDate] = useState(initial.date ?? todayISO())
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = Number(kg.replace(',', '.'))
    if (!(v > 0)) return alert('Charge invalide')
    try {
      await save('records', { id: initial.id, athlete_id: athleteId, kind: 'muscu', event: event.trim(), mark: liftMark(v, Number(reps) || null), date, competition: '' })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title={initial.id ? 'Modifier la charge' : 'Nouvelle charge max'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Exercice">
          <input list="muscu-exercises" value={event} onChange={(e) => setEvent(e.target.value)} placeholder="Ex. Squat" required autoFocus />
          <datalist id="muscu-exercises">{EXERCISES.map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
        <div className="grid2">
          <Field label="Charge (kg)"><input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} required /></Field>
          <Field label="Répétitions (facultatif)"><input type="number" inputMode="numeric" min={1} value={reps} onChange={(e) => setReps(e.target.value)} placeholder="1" /></Field>
        </div>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}
