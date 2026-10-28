import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { TRAINING_KNOWLEDGE } from '../data/trainingKnowledge'
import { useData } from '../lib/data'
import { MAX_LIBRARY } from '../lib/aiLibrary'
import { RESEARCH_TOPICS, type ResearchPaper, type ResearchResult, type ResearchTopic } from '../lib/research'
import { SOURCES } from '../lib/season'
import { errorMessage } from '../lib/utils'
import { Field, Modal } from '../components/ui'

/** Sources de l'IA : les publications que le coach retient servent de références à l'Assistant et à « Améliorer » */
export function Research() {
  const [currentYear] = useState(() => new Date().getFullYear())
  const { evidence_library, save, remove } = useData()
  const [topic, setTopic] = useState<ResearchTopic>('periodization'), [fromYear, setFromYear] = useState(2020)
  const [result, setResult] = useState<ResearchResult | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [adding, setAdding] = useState<ResearchPaper | null>(null), [note, setNote] = useState('')
  const lib = [...evidence_library].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  const inLib = (p: ResearchPaper) => evidence_library.some((r) => r.paper.id === p.id)

  const search = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try { setResult(await api.research({ topic, fromYear, ai: false })) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const store = async (e: FormEvent) => {
    e.preventDefault(); if (!adding) return
    setBusy(true)
    try { await save('evidence_library', { paper: adding, review_note: note.trim(), reviewed: true }); setAdding(null) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <div>
      <h1>Sources de l’IA</h1>
      <p className="small muted">L’Assistant et « Améliorer une séance » s’appuient sur ces références (les {MAX_LIBRARY} plus récentes de ta bibliothèque, plus les fiches de base).</p>

      <h2 className="section-title">Ma bibliothèque <span className="count">{lib.length}</span></h2>
      <div className="rows">
        {!lib.length && <div className="row-item muted">Aucune publication pour l’instant. Ajoute-en ci-dessous.</div>}
        {lib.map((r, i) => (
          <div key={r.id} className="row-item">
            <a className="row-main" href={r.paper.url} target="_blank" rel="noreferrer">{r.paper.title}<small>{[r.paper.journal, r.paper.year, r.review_note].filter(Boolean).join(' · ')}</small></a>
            <span className={`status ${i < MAX_LIBRARY ? 'green' : 'grey'}`}>{i < MAX_LIBRARY ? 'Utilisée' : 'En réserve'}</span>
            <button className="btn ghost small icon" aria-label="Retirer" onClick={() => confirm('Retirer cette publication ?') && remove('evidence_library', r.id).catch((err) => setError(errorMessage(err)))}>✕</button>
          </div>
        ))}
      </div>

      <h2 className="section-title">Ajouter des publications</h2>
      <form className="card form" onSubmit={search}>
        <div className="grid2">
          <Field label="Thème"><select value={topic} onChange={(e) => setTopic(e.target.value as ResearchTopic)}>{Object.entries(RESEARCH_TOPICS).map(([k, v]) => <option value={k} key={k}>{v}</option>)}</select></Field>
          <Field label="Depuis"><input type="number" min="2000" max={currentYear} value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))} /></Field>
        </div>
        <button className="btn primary" disabled={busy}>{busy ? 'Recherche…' : 'Chercher des revues scientifiques'}</button>
        <p className="tiny muted">Recherche publique sur PubMed (Europe PMC) : seuls le thème et l’année sont envoyés.</p>
      </form>
      {error && <p role="alert" className="alert warn">{error}</p>}
      {result && (
        <div className="rows">
          {!result.papers.length && <div className="row-item muted">Aucun résultat : essaie une période plus large.</div>}
          {result.papers.map((p) => (
            <div key={p.id} className="row-item">
              <a className="row-main" href={p.url} target="_blank" rel="noreferrer">{p.title}<small>{[p.journal, p.year].filter(Boolean).join(' · ')}</small></a>
              {inLib(p) ? <span className="status green">Ajoutée</span> : <button className="btn small" onClick={() => { setAdding(p); setNote('') }}>+ Ajouter</button>}
            </div>
          ))}
        </div>
      )}

      <details className="section-fold">
        <summary>Fiches de base <span className="muted small">({TRAINING_KNOWLEDGE.length}, toujours utilisées)</span></summary>
        <div className="rows">
          {TRAINING_KNOWLEDGE.map((k) => (
            <a key={k.id} className="row-item" href={SOURCES.find((s) => s.id === k.sourceId)?.url} target="_blank" rel="noreferrer">
              <span className="row-main">{k.title}<small>{k.locator}</small></span>
            </a>
          ))}
        </div>
      </details>

      {adding && (
        <Modal title="Ajouter à ma bibliothèque" onClose={() => setAdding(null)}>
          <form className="form" onSubmit={store}>
            <b>{adding.title}</b>
            <p className="small muted">{[adding.journal, adding.year].filter(Boolean).join(' · ')}</p>
            <Field label="Pourquoi c’est utile pour ton groupe (facultatif, transmis à l’IA)">
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. adolescents 14-18 ans, sprint, utile pour doser les récupérations" />
            </Field>
            <div className="row gap end">
              <button type="button" className="btn ghost" onClick={() => setAdding(null)}>Annuler</button>
              <button className="btn primary" disabled={busy}>Ajouter</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
