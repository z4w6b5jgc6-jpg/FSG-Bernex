import { Avatar } from '../components/Avatar'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { InviteCard } from '../components/InviteCard'
import { Empty, Field, Modal } from '../components/ui'
import type { Athlete, Group } from '../types'
import { api } from '../api'
import { addDays, errorMessage, fullName, todayISO } from '../lib/utils'
import { ImportRoster } from '../components/ImportRoster'
import { CoachesCard } from '../components/CoachesCard'
import { SubgroupSelect } from '../components/SubgroupSelect'

const COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#64748b']

export function Athletes() {
 const {athletes,groups,wellness,feedback}=useData()
 const [editAthlete,setEditAthlete]=useState<Partial<Athlete>|null>(null),[editGroup,setEditGroup]=useState<Partial<Group>|null>(null)
 const [importing,setImporting]=useState(false),[showInactive,setShowInactive]=useState(false),[q,setQ]=useState('')
 const visible=athletes.filter(a=>(showInactive||a.active)&&fullName(a).toLowerCase().includes(q.toLowerCase()))
 const sections=[...groups.map(group=>({group,list:visible.filter(a=>a.group_id===group.id)})),{group:null,list:visible.filter(a=>!a.group_id||!groups.some(g=>g.id===a.group_id))}]
 return <div><div className="row between"><h1>Athlètes</h1><button className="btn primary" onClick={()=>setEditAthlete({})}>+ Athlète</button></div>
  <PendingSignups/>
  <input aria-label="Rechercher un athlète" placeholder="Rechercher un athlète…" value={q} onChange={e=>setQ(e.target.value)}/>
  {sections.filter(s=>s.list.length).map(({group,list})=><section key={group?.id??'none'}><div className="row between"><h2 className="section-title"><span className="group-dot" style={{background:group?.color??'var(--muted)'}}/>{group?.name??'Sans groupe'} <span className="count">{list.length}</span></h2>{group&&<button className="btn ghost small" onClick={()=>setEditGroup(group)}>Gérer</button>}</div><div className="rows">{list.map(a=>{
const w=wellness.filter(w=>w.athlete_id===a.id).sort((a,b)=>b.date.localeCompare(a.date))[0]
const recent=w&&w.date>=addDays(todayISO(),-3)
const pain=feedback.some(f=>f.athlete_id===a.id&&f.pain?.trim()&&f.updated_at.slice(0,10)>=addDays(todayISO(),-3))
return <Link key={a.id} to={`/athletes/${a.id}`} className="row-item"><Avatar a={a} size="sm"/><span className="row-main">{fullName(a)}<small>{a.events||'Disciplines à préciser'}</small></span><span className="row-tags">
{!a.active?<span className="status grey">Inactif</span>:!a.user_id&&<span className="status grey">Pas inscrit·e</span>}
{pain&&<span className="status red">Douleur</span>}
{recent&&(w.energy??5)<=2&&<span className="status orange">Fatigue</span>}
{recent&&(w.soreness??0)>=4&&<span className="status orange">Courbatures</span>}
</span><span className="chev" aria-hidden>›</span></Link>})}</div></section>)}
  {!visible.length&&<Empty>Aucun athlète pour ce filtre.</Empty>}
  <details className="card"><summary><b>Invitations et gestion du groupe</b></summary><InviteCard/><CoachesCard/><div className="row gap wrap"><button className="btn" onClick={()=>setImporting(true)}>Importer ma liste</button><Link className="btn" to="/athletes/questionnaire">Importer les profils</Link><button className="btn" onClick={()=>setEditGroup({})}>+ Groupe</button></div></details>
  <label className="check"><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/>Afficher les athlètes inactifs</label>
  {editAthlete&&<AthleteForm initial={editAthlete} onClose={()=>setEditAthlete(null)}/>}{editGroup&&<GroupForm initial={editGroup} onClose={()=>setEditGroup(null)}/>}{importing&&<ImportRoster onClose={()=>setImporting(false)}/>}
 </div>
}

/** Nouvelles inscriptions à vérifier : reliées automatiquement à la liste, ou nouveaux profils */
function PendingSignups() {
  const { athletes, groups, save, reload } = useData()
  const nav = useNavigate()
  const [target, setTarget] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const pending = athletes.filter((a) => a.user_id && !a.signup_reviewed)
  if (pending.length === 0) return null
  const roster = athletes.filter((a) => !a.user_id).sort((x, y) => fullName(x).localeCompare(fullName(y)))
  const wasInRoster = (a: Athlete) =>
    !!(a.created_at && a.linked_at && new Date(a.linked_at).getTime() - new Date(a.created_at).getTime() > 1000)
  const gname = (id: string | null) => groups.find((g) => g.id === id)?.name

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn() } catch (e) { alert(errorMessage(e)) } finally { setBusy(false) }
  }
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
  // même prénom + nom (et même année si renseignée des deux côtés) : simple proposition, le coach confirme
  const sameName = (a: Athlete) => roster.filter((r) => norm(r.first_name) === norm(a.first_name) && norm(r.last_name) === norm(a.last_name)
    && (!r.birth_year || !a.birth_year || r.birth_year === a.birth_year))
  const merge = (a: Athlete, intoId = target[a.id]) => run(async () => {
    const into = roster.find((r) => r.id === intoId)
    if (!into || !confirm(`Relier le compte de ${fullName(a)} au profil « ${fullName(into)} » ? Ses données seront regroupées dans ce profil.`)) return
    await api.mergeAthletes(a.id, into.id)
    await reload()
  })

  return (
    <div className="card pending">
      <strong>Nouvelles inscriptions ({pending.length})</strong>
      {pending.map((a) => {
        const linked = wasInRoster(a)
        const similar = roster.filter((r) => r.last_name && a.last_name && r.last_name.toLowerCase()[0] === a.last_name.toLowerCase()[0])
        const match = linked ? [] : sameName(a)
        return (
          <div key={a.id} className="pending-row">
            <div>
              <b>{fullName(a)}</b> <span className="muted small">{a.birth_year} · {gname(a.group_id) ?? 'sans groupe'}{a.email && ` · ${a.email}`}</span>
              <div className="small">{linked ? 'Relié·e automatiquement à sa fiche de ta liste (même email)' : match.length === 1 ? `Même nom que la fiche « ${fullName(match[0])} » de ta liste : vérifie que c’est bien la même personne.` : 'Profil créé à l’inscription (pas trouvé dans ta liste)'}</div>
            </div>
            <div className="row gap wrap">
              {linked ? (
                <button className="btn small primary" disabled={busy} onClick={() => run(() => save('athletes', { id: a.id, signup_reviewed: true }))}>✓ C’est bon</button>
              ) : match.length === 1 ? (
                <button className="btn small primary" disabled={busy} onClick={() => merge(a, match[0].id)}>✓ Relier à sa fiche</button>
              ) : (
                // nouvel athlète : on confirme puis on choisit ses séances sur sa fiche
                <button className="btn small primary" disabled={busy} onClick={() => run(async () => { await save('athletes', { id: a.id, signup_reviewed: true }); nav(`/athletes/${a.id}#seances`) })}>✓ Confirmer et choisir ses séances</button>
              )}
              {linked ? (
                <button className="btn small ghost danger" disabled={busy}
                  onClick={() => confirm(`Ce n’est pas ${fullName(a)} ? Le compte sera délié de ce profil.`) && run(() => save('athletes', { id: a.id, user_id: null, signup_reviewed: true }))}>
                  Ce n’est pas lui/elle
                </button>
              ) : roster.length > 0 && (
                <>
                  <select value={target[a.id] ?? ''} onChange={(e) => setTarget({ ...target, [a.id]: e.target.value })} aria-label="Profil de ma liste">
                    <option value="">Relier à un profil de ma liste…</option>
                    {[...similar, ...roster.filter((r) => !similar.includes(r))].map((r) => (
                      <option key={r.id} value={r.id}>{fullName(r)}{r.birth_year ? ` (${r.birth_year})` : ''}</option>
                    ))}
                  </select>
                  <button className="btn small" disabled={busy || !target[a.id]} onClick={() => merge(a)}>Relier</button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AthleteForm({ initial, onClose }: { initial: Partial<Athlete>; onClose: () => void }) {
  const { groups, athletes, save } = useData()
  const [a, setA] = useState(initial)
  const set = (p: Partial<Athlete>) => setA({ ...a, ...p })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save('athletes', {
        id: a.id, first_name: a.first_name, last_name: a.last_name ?? '', group_id: a.group_id || null,
        birth_year: a.birth_year ?? null, events: a.events ?? '', phone: a.phone ?? '', email: (a.email ?? '').trim().toLowerCase(),
        active: a.active ?? true, goals: a.goals ?? '',
      })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title={a.id ? 'Modifier l’athlète' : 'Nouvel athlète'} onClose={onClose}>
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
        <Field label="Objectif personnel"><textarea rows={2} value={a.goals??''} onChange={e=>set({goals:e.target.value})}/></Field>
        <Field label="Téléphone WhatsApp" hint="De l’athlète ou d’un parent">
          <input type="tel" inputMode="tel" autoComplete="tel" value={a.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} placeholder="079 123 45 67" />
        </Field>

        <Field label="Email" hint="Facultatif. S’il s’inscrit avec cet email, son compte est relié automatiquement à cette fiche (sinon par prénom + nom + année).">
          <input type="email" inputMode="email" value={a.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        {a.id && (
          <div className="small">
            {a.user_id ? (
              <span className="row gap wrap">
                <span className="pill ok">✓ Compte relié</span>
                <button type="button" className="link small" onClick={async () => {
                  if (!confirm('Délier le compte de cette fiche ? L’athlète n’aura plus accès à ce profil (ses données restent sur la fiche).')) return
                  try { await save('athletes', { id: a.id, user_id: null }); onClose() } catch (err) { alert(errorMessage(err)) }
                }}>Délier le compte</button>
              </span>
            ) : <span className="pill">Pas encore inscrit·e</span>}
          </div>
        )}
        {initial.id && athletes.find((x) => x.id === initial.id) && <SubgroupSelect athlete={athletes.find((x) => x.id === initial.id)!} />}
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
