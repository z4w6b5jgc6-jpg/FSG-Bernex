import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { parseValue } from '../lib/tests'
import { errorMessage, todayISO } from '../lib/utils'
import { Field, Modal } from './ui'

/** Saisie d'un résultat de test (par le coach ou par l'athlète lui-même) */
export function ResultForm({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const { tests, save } = useData()
  const [testId, setTestId] = useState(tests[0]?.id ?? '')
  const [date, setDate] = useState(todayISO())
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const test = tests.find((t) => t.id === testId)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = parseValue(value)
    if (v == null) return alert('Résultat invalide')
    try {
      await save('test_results', { athlete_id: athleteId, test_id: testId, date, value: v, notes })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title="Nouveau résultat de test" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Test"><select value={testId} onChange={(e) => setTestId(e.target.value)}>{tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <div className="grid2">
          <Field label={`Résultat${test?.unit ? ` (${test.unit})` : ''}`}><input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required autoFocus /></Field>
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
        </div>
        <Field label="Note (facultatif)"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. vent de face, chrono manuel" /></Field>
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}
