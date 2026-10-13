import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { Empty, Field, Modal } from '../components/ui'
import { CATEGORIES, FOCUSES } from '../data/defaults'
import type { Block, Session, SessionItem } from '../types'
import { emptyItem, errorMessage, itemSummary, uid } from '../lib/utils'
import { suggestRecovery } from '../lib/recovery'

const ITEM_FIELDS: { key: keyof SessionItem; label: string; placeholder: string }[] = [
  { key: 'sets', label: 'Séries', placeholder: 'ex. 3' },
  { key: 'reps', label: 'Répét.', placeholder: 'ex. 4' },
  { key: 'distance', label: 'Distance', placeholder: '60 m' },
  { key: 'duration', label: 'Durée', placeholder: '10 min' },
  { key: 'recovery', label: 'Récup', placeholder: "2'" },
  { key: 'intensity', label: 'Intensité', placeholder: '90%' },
]

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function SessionEditor() {
  const { id } = useParams()
  const { sessions, exercises, save, loading } = useData()
  const original = sessions.find((s) => s.id === id)
  const [draft, setDraft] = useState<Session | null>(original ?? null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState<string | null>(null) // id du bloc
  const [openItems, setOpenItems] = useState<Set<string>>(new Set()) // exercices dépliés
  const toggleItem = (iid: string) =>
    setOpenItems((o) => {
      const n = new Set(o)
      if (n.has(iid)) n.delete(iid)
      else n.add(iid)
      return n
    })
  const addItems = (bid: string, names: string[]) => {
    const blk = draft?.blocks.find((x) => x.id === bid)
    if (!blk) return
    const items = names.map((n) => emptyItem(n))
    updBlock(bid, { items: [...blk.items, ...items] })
    setOpenItems((o) => new Set([...o, ...items.map((i) => i.id)]))
  }

  useEffect(() => {
    if (original && (!draft || draft.id !== original.id)) {
      setDraft(original)
      setDirty(false)
    }
  }, [original, draft])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!draft) return loading ? <p className="muted">Chargement…</p> : <Empty>Séance introuvable. <Link to="/seances">Retour</Link></Empty>

  const update = (patch: Partial<Session>) => { setDraft({ ...draft, ...patch }); setDirty(true) }
  const setBlocks = (blocks: Block[]) => update({ blocks })
  const updBlock = (bid: string, patch: Partial<Block>) => setBlocks(draft.blocks.map((b) => (b.id === bid ? { ...b, ...patch } : b)))
  const updItem = (bid: string, iid: string, patch: Partial<SessionItem>) =>
    setBlocks(draft.blocks.map((b) => (b.id === bid ? { ...b, items: b.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)) } : b)))

  const persist = async () => {
    setSaving(true)
    try {
      await save('sessions', { id: draft.id, title: draft.title, objective: draft.objective, focus: draft.focus, duration_min: draft.duration_min, blocks: draft.blocks })
      setDirty(false)
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="editor">
      <div className="row between sticky-bar">
        <Link to="/seances" className="muted small">← Séances</Link>
        <div className="row gap">
          <Link className="btn small" to={`/planning?seance=${draft.id}`}>📅 Planifier</Link>
          <button className="btn primary" onClick={persist} disabled={!dirty || saving}>
            {saving ? 'Enregistrement…' : dirty ? 'Enregistrer' : '✓ Enregistré'}
          </button>
        </div>
      </div>

      <div className="card form">
        <Field label="Titre"><input value={draft.title} onChange={(e) => update({ title: e.target.value })} /></Field>
        <div className="grid2">
          <Field label="Thème">
            <select value={draft.focus} onChange={(e) => update({ focus: e.target.value })}>
              <option value="">—</option>
              {FOCUSES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Durée (min)">
            <input type="number" min={0} value={draft.duration_min ?? ''} onChange={(e) => update({ duration_min: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        </div>
        <Field label="Objectif"><textarea rows={2} value={draft.objective} onChange={(e) => update({ objective: e.target.value })} placeholder="Ce que les athlètes doivent retenir de la séance" /></Field>
      </div>

      <datalist id="exercise-names">
        {exercises.map((e) => <option key={e.id} value={e.name} />)}
      </datalist>

      {draft.blocks.map((b, bi) => (
        <div key={b.id} className="card block-edit">
          <div className="row gap block-head">
            <input className="block-title" value={b.title} onChange={(e) => updBlock(b.id, { title: e.target.value })} />
            <button className="btn ghost icon small" title="Monter" onClick={() => setBlocks(move(draft.blocks, bi, -1))}>↑</button>
            <button className="btn ghost icon small" title="Descendre" onClick={() => setBlocks(move(draft.blocks, bi, 1))}>↓</button>
            <button className="btn ghost icon small danger" title="Supprimer le bloc"
              onClick={() => (b.items.length === 0 || confirm('Supprimer ce bloc ?')) && setBlocks(draft.blocks.filter((x) => x.id !== b.id))}>✕</button>
          </div>
          {b.items.map((it, ii) => {
            const open = openItems.has(it.id)
            return (
              <div key={it.id} className={`item-edit ${open ? 'open' : ''}`}>
                <div className="row gap">
                  {open ? (
                    <input className="item-name" list="exercise-names" placeholder="Exercice" value={it.name} onChange={(e) => updItem(b.id, it.id, { name: e.target.value })} />
                  ) : (
                    <button type="button" className="item-collapsed" onClick={() => toggleItem(it.id)}>
                      <strong>{it.name || 'Exercice sans nom'}</strong>
                      <span className="muted small">{itemSummary(it) || 'Toucher pour compléter'}</span>
                    </button>
                  )}
                  {open && <button className="btn ghost icon small" title="Replier" onClick={() => toggleItem(it.id)}>✓</button>}
                  <button className="btn ghost icon small" title="Monter" onClick={() => updBlock(b.id, { items: move(b.items, ii, -1) })}>↑</button>
                  <button className="btn ghost icon small" title="Descendre" onClick={() => updBlock(b.id, { items: move(b.items, ii, 1) })}>↓</button>
                  <button className="btn ghost icon small danger" title="Retirer" onClick={() => updBlock(b.id, { items: b.items.filter((x) => x.id !== it.id) })}>✕</button>
                </div>
                {open && (
                  <>
                    <div className="item-grid">
                      {ITEM_FIELDS.map((f) => (
                        <label key={f.key}>
                          <span>{f.label}</span>
                          <input value={it[f.key]} placeholder={f.placeholder} enterKeyHint="next" onChange={(e) => updItem(b.id, it.id, { [f.key]: e.target.value })} />
                        </label>
                      ))}
                    </div>
                    {(() => {
                      const hint = suggestRecovery(it, `${draft.focus} ${b.title}`)
                      if (!hint || it.recovery === hint.value) return null
                      return (
                        <div className="recovery-hint">
                          <span className="small">💡 Récup conseillée : <b>{hint.value}</b></span>
                          <span className="tiny muted">{hint.why}</span>
                          <button type="button" className="btn small" onClick={() => updItem(b.id, it.id, { recovery: hint.value })}>{it.recovery ? 'Remplacer' : 'Appliquer'}</button>
                        </div>
                      )
                    })()}
                    <input className="item-notes" placeholder="Consignes (facultatif)" value={it.notes} onChange={(e) => updItem(b.id, it.id, { notes: e.target.value })} />
                  </>
                )}
              </div>
            )
          })}
          <div className="row gap wrap">
            <button className="btn small" onClick={() => addItems(b.id, [''])}>+ Exercice</button>
            <button className="btn small" onClick={() => setPicker(b.id)}>📚 Depuis la bibliothèque</button>
          </div>
        </div>
      ))}
      <button className="btn" onClick={() => setBlocks([...draft.blocks, { id: uid(), title: 'Nouveau bloc', items: [] }])}>+ Ajouter un bloc</button>

      {picker && (
        <ExercisePicker
          onClose={() => setPicker(null)}
          onPick={(names) => {
            addItems(picker, names)
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}

function ExercisePicker({ onClose, onPick }: { onClose: () => void; onPick: (names: string[]) => void }) {
  const { exercises } = useData()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const list = exercises.filter((e) => (!cat || e.category === cat) && e.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal title="Bibliothèque d’exercices" onClose={onClose}>
      <div className="row gap filters">
        <input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Toutes</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="picker-list">
        {list.length === 0 && <p className="muted">Aucun exercice. Ajoute-les dans l’onglet Exercices.</p>}
        {list.map((e) => (
          <label key={e.id} className="check picker-item">
            <input type="checkbox" checked={sel.includes(e.name)}
              onChange={() => setSel(sel.includes(e.name) ? sel.filter((x) => x !== e.name) : [...sel, e.name])} />
            <div>
              <strong>{e.name}</strong> <span className="muted small">{e.category}</span>
              {e.description && <div className="muted small">{e.description}</div>}
            </div>
          </label>
        ))}
      </div>
      <div className="row gap end">
        <button className="btn ghost" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={sel.length === 0} onClick={() => onPick(sel)}>Ajouter {sel.length || ''}</button>
      </div>
    </Modal>
  )
}
