import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { Field, Modal } from './ui'
import type { PersonalRecord } from '../types'
import { errorMessage } from '../lib/utils'

/** Ajout / modification d'un record ou d'un résultat de compétition */
export function RecordForm({ initial, athleteId, onClose }: { initial: Partial<PersonalRecord>; athleteId: string; onClose: () => void }) {
  const { save } = useData()
  const [r, setR] = useState(initial)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save('records', { id: r.id, athlete_id: athleteId, event: r.event?.trim(), mark: r.mark?.trim(), date: r.date, competition: r.competition ?? '' })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title={r.id ? 'Modifier la performance' : 'Nouvelle performance 🎉'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Discipline"><input value={r.event ?? ''} onChange={(e) => setR({ ...r, event: e.target.value })} placeholder="Ex. 100 m, longueur, poids 4 kg" required /></Field>
        <Field label="Performance"><input value={r.mark ?? ''} onChange={(e) => setR({ ...r, mark: e.target.value })} placeholder={'Ex. 12"85 ou 5,40 m'} required /></Field>
        <Field label="Date"><input type="date" value={r.date ?? ''} onChange={(e) => setR({ ...r, date: e.target.value })} required /></Field>
        <Field label="Compétition / lieu (facultatif)"><input value={r.competition ?? ''} onChange={(e) => setR({ ...r, competition: e.target.value })} /></Field>
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}
