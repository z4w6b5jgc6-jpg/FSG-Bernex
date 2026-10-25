import { useState, type FormEvent } from 'react'
import { BackLink } from '../components/BackLink'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData, useMyAthlete } from '../lib/data'
import { RichText } from '../components/RichText'
import { Empty, Field, Modal } from '../components/ui'
import { TIP_CATEGORIES } from '../data/tips'
import { allTips } from '../lib/athlete'
import type { Tip } from '../types'
import { errorMessage } from '../lib/utils'


/** Bibliothèque de conseils – vue athlète (favoris) et vue entraîneur (rédaction) */
export function Tips() {
  const { tips, me } = useData()
  const athlete = useMyAthlete()
  const coach = me?.role === 'coach'
  const [cat, setCat] = useState<string>('')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Partial<Tip> | null>(null)
  const list = allTips(tips)
  const favs = athlete?.favorite_tips ?? []
  const filtered = list.filter((t) =>
    (!cat || (cat === 'fav' ? favs.includes(t.id) : cat === 'mine' ? !t.builtin : t.category === cat)) &&
    (t.title + t.summary + t.body).toLowerCase().includes(q.toLowerCase()),
  )
  const cats = TIP_CATEGORIES.filter((c) => list.some((t) => t.category === c.name))

  return (
    <div>
      <div className="row between">
        <h1>Conseils</h1>
        {coach && <button className="btn primary" onClick={() => setEdit({ category: 'Club', published: true })}>+ Conseil</button>}
      </div>
      <p className="muted small">
        {coach
          ? 'Les conseils fournis avec l’app sont visibles par tous tes athlètes. Ajoute les tiens (infos club, menus, rappels…).'
          : 'Nutrition, sommeil, récupération… tout pour progresser en restant en forme.'}
      </p>
      <input className="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        <button className={!cat ? 'active' : ''} onClick={() => setCat('')}>Tout</button>
        {athlete && <button className={cat === 'fav' ? 'active' : ''} onClick={() => setCat('fav')}>Favoris</button>}
        {coach && <button className={cat === 'mine' ? 'active' : ''} onClick={() => setCat('mine')}>Mes conseils</button>}
        {cats.map((c) => (
          <button key={c.name} className={cat === c.name ? 'active' : ''} onClick={() => setCat(c.name)}>{c.name}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Empty>{cat === 'fav' ? 'Ajoute un conseil à tes favoris pour le retrouver ici.' : 'Aucun conseil.'}</Empty>
      ) : (
        <div className="list">
          {filtered.map((t) => (
            <Link key={t.id} to={`/conseils/${t.id}`} className="card link-card tip-card">
              
              <div>
                <strong>{t.title}</strong> {favs.includes(t.id) && <span className="pill">Favori</span>}
                {!t.published && <span className="pill">brouillon</span>}
                <div className="muted small">{t.summary}</div>
                <div className="tiny muted">{t.category}{coach && !t.builtin && ' · rédigé par toi'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {edit && <TipForm initial={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

export function TipDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { tips, me, save, remove } = useData()
  const athlete = useMyAthlete()
  const [edit, setEdit] = useState(false)
  const tip = allTips(tips).find((t) => t.id === id)
  if (!tip) return <Empty>Conseil introuvable. <Link to="/conseils">Retour</Link></Empty>
  const fav = athlete?.favorite_tips.includes(tip.id) ?? false

  const toggleFav = async () => {
    if (!athlete) return
    const next = fav ? athlete.favorite_tips.filter((x) => x !== tip.id) : [...athlete.favorite_tips, tip.id]
    try { await save('athletes', { id: athlete.id, favorite_tips: next }) } catch (e) { alert(errorMessage(e)) }
  }

  return (
    <div className="article">
      <BackLink to="/conseils" label="Conseils" />
      <div className="article-head">
        
        <div className="tiny muted">{tip.category}</div>
        <h1>{tip.title}</h1>
        {tip.summary && <p className="lead">{tip.summary}</p>}
      </div>
      <div className="card"><RichText text={tip.body} /></div>
      <div className="row gap wrap actions">
        {athlete && <button className={`btn ${fav ? 'primary' : ''}`} onClick={toggleFav}>{fav ? 'Dans mes favoris' : 'Ajouter aux favoris'}</button>}
        {me?.role === 'coach' && !tip.builtin && (
          <>
            <button className="btn" onClick={() => setEdit(true)}>Modifier</button>
            <button className="btn ghost danger" onClick={async () => { if (confirm('Supprimer ce conseil ?')) { await remove('tips', tip.id); nav('/conseils') } }}>Supprimer</button>
          </>
        )}
      </div>
      {tip.builtin && <p className="tiny muted">Repères généraux. Pour toute question de santé, parles-en à un médecin ou à un·e diététicien·ne.</p>}
      {edit && <TipForm initial={tip} onClose={() => setEdit(false)} />}
    </div>
  )
}

function TipForm({ initial, onClose }: { initial: Partial<Tip>; onClose: () => void }) {
  const { save } = useData()
  const [t, setT] = useState(initial)
  const set = (p: Partial<Tip>) => setT({ ...t, ...p })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save('tips', { id: t.id, category: t.category, emoji: t.emoji || '', title: t.title, summary: t.summary ?? '', body: t.body ?? '', published: t.published ?? true })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title={t.id ? 'Modifier le conseil' : 'Nouveau conseil'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="grid2">
          <Field label="Catégorie">
            <select value={t.category} onChange={(e) => set({ category: e.target.value })}>
              {TIP_CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Titre"><input value={t.title ?? ''} onChange={(e) => set({ title: e.target.value })} required /></Field>
        <Field label="Résumé (une phrase)"><input value={t.summary ?? ''} onChange={(e) => set({ summary: e.target.value })} /></Field>
        <Field label="Contenu" hint="Astuces : « ## » pour un sous-titre, « - » pour une liste, **texte** pour du gras">
          <textarea rows={10} value={t.body ?? ''} onChange={(e) => set({ body: e.target.value })} />
        </Field>
        <label className="check"><input type="checkbox" checked={t.published ?? true} onChange={(e) => set({ published: e.target.checked })} /> Visible par les athlètes</label>
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}
