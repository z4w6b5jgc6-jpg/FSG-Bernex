import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { Empty, Field, Modal } from '../components/ui'
import { CATEGORIES, DEFAULT_EXERCISES } from '../data/defaults'
import type { Exercise } from '../types'
import { errorMessage } from '../lib/utils'

export function Exercises() {
  const { exercises, saveMany, remove } = useData()
  const [edit, setEdit] = useState<Partial<Exercise> | null>(null)
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState(false)

  const importDefaults = async () => {
    setImporting(true)
    try {
      const existing = new Set(exercises.map((e) => e.name.toLowerCase()))
      await saveMany('exercises', DEFAULT_EXERCISES.filter((e) => !existing.has(e.name.toLowerCase())))
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setImporting(false)
    }
  }

  const filtered = exercises.filter((e) => (e.name + e.description).toLowerCase().includes(q.toLowerCase()))
  const cats = [...CATEGORIES, ...new Set(exercises.map((e) => e.category).filter((c) => !CATEGORIES.includes(c)))]

  return (
    <div>
      <div className="row between">
        <h1>Exercices</h1>
        <button className="btn primary" onClick={() => setEdit({ category: CATEGORIES[0] })}>+ Exercice</button>
      </div>
      <p className="muted small">Ta bibliothèque d’exercices, réutilisable dans toutes les séances.</p>
      {exercises.length === 0 ? (
        <Empty>
          La bibliothèque est vide.<br />
          <button className="btn primary" onClick={importDefaults} disabled={importing}>
            Importer {DEFAULT_EXERCISES.length} exercices d’athlétisme de base
          </button>
        </Empty>
      ) : (
        <>
          <input className="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          {cats.map((c) => {
            const list = filtered.filter((e) => e.category === c).sort((a, b) => a.name.localeCompare(b.name))
            if (list.length === 0) return null
            return (
              <section key={c}>
                <h2>{c}</h2>
                <div className="card">
                  <ul className="plain rows">
                    {list.map((e) => (
                      <li key={e.id} className="row between">
                        <button className="link left" onClick={() => setEdit(e)}>
                          <strong>{e.name}</strong>
                          {e.description && <div className="muted small">{e.description}</div>}
                        </button>
                        <button className="btn ghost icon small danger" title="Supprimer"
                          onClick={() => confirm(`Supprimer « ${e.name} » ?`) && remove('exercises', e.id)}>✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )
          })}
        </>
      )}
      {edit && <ExerciseForm initial={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function ExerciseForm({ initial, onClose }: { initial: Partial<Exercise>; onClose: () => void }) {
  const { save } = useData()
  const [e, setE] = useState(initial)
  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      await save('exercises', { id: e.id, name: e.name, category: e.category, description: e.description ?? '' })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title={e.id ? 'Modifier l’exercice' : 'Nouvel exercice'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nom"><input value={e.name ?? ''} onChange={(x) => setE({ ...e, name: x.target.value })} required autoFocus /></Field>
        <Field label="Catégorie">
          <select value={e.category} onChange={(x) => setE({ ...e, category: x.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Description / consignes"><textarea rows={3} value={e.description ?? ''} onChange={(x) => setE({ ...e, description: x.target.value })} /></Field>
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}
