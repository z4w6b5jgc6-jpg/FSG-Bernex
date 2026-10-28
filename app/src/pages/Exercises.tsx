import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { exerciseLibrary, isCatalogExercise } from '../data/athleticsExercises'
import { useData } from '../lib/data'
import { Empty, Field, Modal } from '../components/ui'
import { CATEGORIES } from '../data/defaults'
import type { Exercise } from '../types'
import { errorMessage } from '../lib/utils'

export function Exercises() {
  const { exercises, saveMany, remove } = useData()
  const [edit, setEdit] = useState<Partial<Exercise> | null>(null)
  const [q, setQ] = useState('')
  const [params, setParams] = useSearchParams()
  const category = params.get('categorie') ?? ''
  const library = exerciseLibrary(exercises)
  const [importing, setImporting] = useState(false)

  const importDefaults = async () => {
    setImporting(true)
    try {
      await saveMany('exercises', filtered.filter(isCatalogExercise).map(({ name, category, description }) => ({ name, category, description })))
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setImporting(false)
    }
  }

  const filtered = library.filter(e => (!category || e.category === category) && (e.name + ' ' + e.description).toLocaleLowerCase('fr').includes(q.toLocaleLowerCase('fr')))
  const cats = [...CATEGORIES, ...new Set(library.map((e) => e.category).filter((c) => !CATEGORIES.includes(c)))]

  return (
    <div>
      <div className="row between">
        <h1>Exercices</h1>
        <button className="btn primary" onClick={() => setEdit({ category: CATEGORIES[0] })}>+ Exercice</button>
      </div>
      <p className="muted">Des exercices de course, sauts, lancers et musculation, disponibles directement dans le créateur de séances.</p>
      <p className="muted small">Fiches descriptives à adapter au niveau et au matériel. Séries, charges, intensités et récupérations sont définies par le coach ; ces fiches ne prescrivent pas un dosage optimal.</p>
      <div className="row gap wrap filters">
        <input className="search" aria-label="Rechercher un exercice" placeholder="Rechercher un exercice ou une consigne…" value={q} onChange={e => setQ(e.target.value)} />
        <select aria-label="Catégorie d’exercice" value={category} onChange={e => setParams(e.target.value ? {categorie:e.target.value} : {})}>
          <option value="">Toutes les catégories</option>{cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className="btn" onClick={importDefaults} disabled={importing || !filtered.some(isCatalogExercise)}>{importing ? 'Ajout…' : 'Ajouter ces fiches à ma bibliothèque'}</button>
      </div>
      <p className="muted small" role="status">{filtered.length} exercices · Les fiches du club sont modifiables. Le catalogue de départ reste disponible sans import.</p>
      {!filtered.length && <Empty>Aucun exercice pour cette recherche.</Empty>}
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
                        <button className="link left" onClick={() => setEdit(isCatalogExercise(e) ? {name:e.name, category:e.category, description:e.description} : e)}>
                          <strong>{e.name}</strong> <span className="badge">{isCatalogExercise(e) ? 'Catalogue' : 'Club'}</span>
                          {e.description && <div className="muted small">{e.description}</div>}
                        </button>
                        {!isCatalogExercise(e) && <button className="btn ghost icon small danger" title="Supprimer"
                          onClick={() => confirm(`Supprimer « ${e.name} » ?`) && remove('exercises', e.id)}>✕</button>}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )
          })}
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
