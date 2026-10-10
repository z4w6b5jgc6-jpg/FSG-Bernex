import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { InviteCard } from '../components/InviteCard'
import { Empty, Field, GroupBadge, Modal } from '../components/ui'
import type { Athlete, Group } from '../types'
import { errorMessage, fullName, todayISO, whatsappUrl } from '../lib/utils'

const COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#64748b']

export function Athletes() {
  const { athletes, groups, feedback, wellness } = useData()
  const [editAthlete, setEditAthlete] = useState<Partial<Athlete> | null>(null)
  const [editGroup, setEditGroup] = useState<Partial<Group> | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const visible = athletes.filter((a) => showInactive || a.active)
  const sections: { group: Group | null; list: Athlete[] }[] = [
    ...groups.map((g) => ({ group: g, list: visible.filter((a) => a.group_id === g.id) })),
    { group: null, list: visible.filter((a) => !a.group_id || !groups.some((g) => g.id === a.group_id)) },
  ]
  const lastFeedback = (id: string) =>
    feedback.filter((f) => f.athlete_id === id).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]

  return (
    <div>
      <div className="row between">
        <h1>Athlètes</h1>
        <div className="row gap">
          <button className="btn" onClick={() => setEditGroup({ color: COLORS[groups.length % COLORS.length] })}>+ Groupe</button>
        </div>
      </div>
      <InviteCard />
      {groups.length === 0 && (
        <Empty>Crée d’abord tes groupes (ex. U18, Sprint, Demi-fond…) : les athlètes choisiront le leur en s’inscrivant.</Empty>
      )}
      {athletes.length === 0 && groups.length > 0 && (
        <Empty>Aucun athlète inscrit pour l’instant. Partage le lien d’inscription ci-dessus 👆</Empty>
      )}
      {sections.map(({ group, list }) => {
        if (!group && list.length === 0) return null
        return (
          <section key={group?.id ?? 'none'}>
            <div className="row between">
              <h2 className="row gap">
                {group ? <GroupBadge name={group.name} color={group.color} /> : 'Sans groupe'}
                <span className="muted small">{list.length}</span>
              </h2>
              {group && <button className="btn ghost small" onClick={() => setEditGroup(group)}>Modifier</button>}
            </div>
            {list.length === 0 ? <p className="muted small">Aucun athlète dans ce groupe.</p> : (
              <div className="cards">
                {list.map((a) => {
                  const fb = lastFeedback(a.id)
                  const checkin = wellness.some((w) => w.athlete_id === a.id && w.date === todayISO())
                  return (
                    <div key={a.id} className={`card ${a.active ? '' : 'inactive'}`}>
                      <div className="row between">
                        <Link to={`/athletes/${a.id}`} className="row gap"><span className="avatar-sm">{a.avatar}</span><strong>{fullName(a)}</strong></Link>
                        <span className="muted small">{a.birth_year}{checkin && ' · 🌙'}</span>
                      </div>
                      {a.events && <div className="muted small">{a.events}</div>}
                      <div className="muted small">
                        {fb ? `Dernier retour : ${new Date(fb.updated_at).toLocaleDateString('fr-CH')}` : 'Aucun retour'}
                      </div>
                      <div className="row gap wrap">
                        <Link className="btn small" to={`/athletes/${a.id}`}>Voir le suivi</Link>
                        {a.phone && <a className="btn small whatsapp" href={whatsappUrl(`Salut ${a.first_name} !`, a.phone)} target="_blank" rel="noreferrer">📲</a>}
                        <button className="btn small ghost" onClick={() => setEditAthlete(a)}>Modifier</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
      {athletes.some((a) => !a.active) && (
        <label className="check"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Afficher les athlètes inactifs</label>
      )}
      {editAthlete && <AthleteForm initial={editAthlete} onClose={() => setEditAthlete(null)} />}
      {editGroup && <GroupForm initial={editGroup} onClose={() => setEditGroup(null)} />}
    </div>
  )
}

export function AthleteForm({ initial, onClose }: { initial: Partial<Athlete>; onClose: () => void }) {
  const { groups, save } = useData()
  const [a, setA] = useState(initial)
  const set = (p: Partial<Athlete>) => setA({ ...a, ...p })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save('athletes', {
        id: a.id, first_name: a.first_name, last_name: a.last_name ?? '', group_id: a.group_id || null,
        birth_year: a.birth_year ?? null, events: a.events ?? '', phone: a.phone ?? '', active: a.active ?? true,
      })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title="Modifier l’athlète" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="grid2">
          <Field label="Prénom"><input value={a.first_name ?? ''} onChange={(e) => set({ first_name: e.target.value })} required autoFocus /></Field>
          <Field label="Nom"><input value={a.last_name ?? ''} onChange={(e) => set({ last_name: e.target.value })} /></Field>
        </div>
        <div className="grid2">
          <Field label="Groupe">
            <select value={a.group_id ?? ''} onChange={(e) => set({ group_id: e.target.value || null })}>
              <option value="">— Aucun —</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Année de naissance">
            <input type="number" min={1990} max={2030} value={a.birth_year ?? ''} onChange={(e) => set({ birth_year: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        </div>
        <Field label="Disciplines"><input value={a.events ?? ''} onChange={(e) => set({ events: e.target.value })} placeholder="Ex. 60 m, longueur" /></Field>
        <Field label="Téléphone WhatsApp" hint="De l’athlète ou d’un parent">
          <input type="tel" inputMode="tel" autoComplete="tel" value={a.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} placeholder="079 123 45 67" />
        </Field>

        {a.id && (
          <label className="check"><input type="checkbox" checked={a.active ?? true} onChange={(e) => set({ active: e.target.checked })} /> Actif (décocher bloque l’accès de l’athlète à l’app)</label>
        )}
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}

function GroupForm({ initial, onClose }: { initial: Partial<Group>; onClose: () => void }) {
  const { save, remove } = useData()
  const [g, setG] = useState(initial)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save('groups', { id: g.id, name: g.name, color: g.color })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  const del = async () => {
    if (!g.id || !confirm('Supprimer ce groupe ? Les athlètes seront conservés (sans groupe), les séances planifiées pour ce groupe seront supprimées.')) return
    await remove('groups', g.id)
    onClose()
  }
  return (
    <Modal title={g.id ? 'Modifier le groupe' : 'Nouveau groupe'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nom"><input value={g.name ?? ''} onChange={(e) => setG({ ...g, name: e.target.value })} required autoFocus placeholder="Ex. U16" /></Field>
        <Field label="Couleur">
          <div className="row gap wrap">
            {COLORS.map((c) => (
              <button type="button" key={c} className={`swatch ${g.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setG({ ...g, color: c })} aria-label={c} />
            ))}
          </div>
        </Field>
        <div className="row gap end">
          {g.id && <button type="button" className="btn ghost danger" onClick={del}>Supprimer</button>}
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}
