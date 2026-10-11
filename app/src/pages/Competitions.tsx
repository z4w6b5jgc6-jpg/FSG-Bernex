import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useData, useMyAthlete } from '../lib/data'
import { Empty, Field, Modal } from '../components/ui'
import type { Competition } from '../types'
import { errorMessage, formatDate, fullName, parseISODate, todayISO, whatsappUrl } from '../lib/utils'

const LEVELS: Record<Competition['level'], { label: string; hint: string }> = {
  A: { label: 'A', hint: 'Objectif principal de la saison' },
  B: { label: 'B', hint: 'Compétition importante' },
  C: { label: 'C', hint: 'Préparation / test' },
}

// Disciplines proposées dans le formulaire (la saisie reste libre)
const EVENTS = ['60 m', '80 m', '100 m', 'Longueur', '200 m', '400 m', '800 m', '60 m haies', '80 m haies', '100 m haies', '110 m haies', 'Triple saut', 'Hauteur',
  'Poids', 'Javelot', 'Disque', 'Marteau', 'Perche', '300 m', '600 m', '1000 m', '1500 m', '300 m haies', 'Relais 4×100 m', 'Relais 5×80 m']

const daysUntil = (iso: string) => Math.round((parseISODate(iso).getTime() - parseISODate(todayISO()).getTime()) / 86400000)
const lastDay = (c: Competition) => c.end_date || c.date

function dateRange(c: Competition): string {
  if (!c.end_date || c.end_date === c.date) return formatDate(c.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  const sameMonth = c.date.slice(0, 7) === c.end_date.slice(0, 7)
  return `${formatDate(c.date, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })} – ${formatDate(c.end_date, { day: 'numeric', month: 'long', year: 'numeric' })}`
}

function countdown(c: Competition): string {
  const n = daysUntil(c.date)
  if (n > 1) return `dans ${n} jours`
  if (n === 1) return 'demain'
  if (n === 0 || daysUntil(lastDay(c)) >= 0) return 'aujourd’hui'
  return ''
}

/** « https:// » ajouté si on a collé une adresse sans */
const normUrl = (u: string) => {
  const t = u.trim()
  return !t || /^https?:\/\//i.test(t) ? t : `https://${t}`
}

/** Carte d'une compétition (entraîneur ou athlète) */
export function CompetitionCard({ c, onEdit }: { c: Competition; onEdit?: () => void }) {
  const { athletes } = useData()
  const me = useMyAthlete()
  const past = daysUntil(lastDay(c)) < 0
  const deadline = c.registration_deadline ? daysUntil(c.registration_deadline) : null
  const who = athletes.filter((a) => c.athlete_ids.includes(a.id))
  const entries = c.entries ?? {}
  const share =
    `🏆 ${c.name}\n📅 ${dateRange(c)}${c.location ? `\n📍 ${c.location}` : ''}` +
    (c.registration_deadline ? `\n✍️ Inscription jusqu’au ${formatDate(c.registration_deadline, { day: 'numeric', month: 'long' })}` : '') +
    (c.program_url ? `\n📄 Programme : ${c.program_url}` : '') + (c.registration_url ? `\n🔗 Inscriptions : ${c.registration_url}` : '') +
    (who.length ? `\n\n👥 Participants :\n${who.map((a) => `• ${a.first_name}${entries[a.id] ? ` : ${entries[a.id]}` : ''}`).join('\n')}` : '')
  return (
    <div className={`card competition level-${c.level} ${past ? 'past' : ''}`}>
      <div className="row between">
        <span className={`level-badge level-${c.level}`} title={LEVELS[c.level].hint}>{c.level}</span>
        {!past && <span className="small muted">{countdown(c)}</span>}
      </div>
      <h3>{c.name}</h3>
      <div className="small">📅 {dateRange(c)}{c.location && <> · 📍 {c.location}</>}</div>
      {deadline !== null && !past && (
        <div className={`small ${deadline >= 0 && deadline <= 7 ? 'deadline-soon' : 'muted'}`}>
          ✍️ Inscription jusqu’au {formatDate(c.registration_deadline!, { day: 'numeric', month: 'long' })}
          {deadline >= 0 ? (deadline <= 7 ? ` — plus que ${deadline} j !` : '') : ' — clôturée'}
        </div>
      )}
      {(c.program_url || c.registration_url || c.results_url) && (
        <div className="row gap wrap">
          {c.program_url && <a className="btn small" href={c.program_url} target="_blank" rel="noreferrer">📄 Programme</a>}
          {c.registration_url && <a className="btn small" href={c.registration_url} target="_blank" rel="noreferrer">✍️ Inscriptions</a>}
          {c.results_url && <a className="btn small" href={c.results_url} target="_blank" rel="noreferrer">📊 Résultats</a>}
        </div>
      )}
      {c.notes && <p className="small">{c.notes}</p>}
      {onEdit && who.length > 0 && (
        <ul className="plain entries">
          {who.map((a) => (
            <li key={a.id} className="small"><b>{a.first_name}</b>{entries[a.id] ? <span className="muted"> · {entries[a.id]}</span> : <span className="tiny muted"> · disciplines à préciser</span>}</li>
          ))}
        </ul>
      )}
      {onEdit ? (
        <div className="row between wrap">
          <span className="tiny muted">{who.length ? `👥 ${who.length} participant(s)` : '👥 Tout le club'}</span>
          <span className="row gap">
            <a className="btn ghost small" href={whatsappUrl(share)} target="_blank" rel="noreferrer" aria-label="Partager sur WhatsApp">📲</a>
            <button className="btn ghost small" onClick={onEdit}>Modifier</button>
          </span>
        </div>
      ) : (
        me && c.athlete_ids.includes(me.id) && (
          <span className="tiny tt-record">✅ Tu es sélectionné·e{entries[me.id] && <> · <b>{entries[me.id]}</b></>}</span>
        )
      )}
    </div>
  )
}

function CompetitionForm({ initial, onClose }: { initial: Partial<Competition>; onClose: () => void }) {
  const { groups, athletes, save, remove } = useData()
  const [c, setC] = useState<Partial<Competition>>({ level: 'B', athlete_ids: [], entries: {}, ...initial })
  const [some, setSome] = useState((initial.athlete_ids ?? []).length > 0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = (patch: Partial<Competition>) => setC((x) => ({ ...x, ...patch }))
  const ids = c.athlete_ids ?? []
  const toggle = (id: string) => set({ athlete_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] })
  const active = athletes.filter((a) => a.active)
  const entries = c.entries ?? {}
  const setEntry = (id: string, v: string) => set({ entries: { ...entries, [id]: v } })
  const addEvent = (id: string, ev: string) => {
    const cur = (entries[id] ?? '').split(',').map((x) => x.trim()).filter(Boolean)
    setEntry(id, (cur.includes(ev) ? cur.filter((x) => x !== ev) : [...cur, ev]).join(', '))
  }
  // Disciplines habituelles de l'athlète (fiche), puis les plus courantes
  const suggestions = (id: string) => {
    const own = (athletes.find((a) => a.id === id)?.events ?? '').split(/[,;/]/).map((x) => x.trim()).filter(Boolean)
    return [...new Set([...own, ...EVENTS.filter((e) => !own.some((o) => o.toLowerCase() === e.toLowerCase()))])].slice(0, 10)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (c.end_date && c.date && c.end_date < c.date) return setErr('La date de fin est avant la date de début.')
    setBusy(true)
    try {
      await save('competitions', {
        id: c.id, name: c.name?.trim(), date: c.date, end_date: c.end_date || null, location: c.location?.trim() ?? '',
        level: c.level, program_url: normUrl(c.program_url ?? ''), registration_url: normUrl(c.registration_url ?? ''),
        results_url: normUrl(c.results_url ?? ''), registration_deadline: c.registration_deadline || null,
        notes: c.notes?.trim() ?? '', athlete_ids: some ? ids : [],
        entries: some ? Object.fromEntries(ids.map((id) => [id, (entries[id] ?? '').trim()]).filter(([, v]) => v)) : {},
      })
      onClose()
    } catch (e2) {
      setErr(errorMessage(e2))
    } finally {
      setBusy(false)
    }
  }
  const del = async () => {
    if (!c.id || !confirm('Supprimer cette compétition ?')) return
    await remove('competitions', c.id)
    onClose()
  }

  return (
    <Modal title={c.id ? 'Modifier la compétition' : 'Nouvelle compétition'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nom"><input value={c.name ?? ''} onChange={(e) => set({ name: e.target.value })} placeholder="Ex. Championnats genevois en salle" required /></Field>
        <div className="grid2">
          <Field label="Date"><input type="date" value={c.date ?? ''} onChange={(e) => set({ date: e.target.value })} required /></Field>
          <Field label="Fin (si plusieurs jours)"><input type="date" value={c.end_date ?? ''} min={c.date} onChange={(e) => set({ end_date: e.target.value || null })} /></Field>
        </div>
        <Field label="Lieu"><input value={c.location ?? ''} onChange={(e) => set({ location: e.target.value })} placeholder="Stade, ville" /></Field>
        <Field label="Importance">
          <div className="level-pick">
            {(Object.keys(LEVELS) as Competition['level'][]).map((l) => (
              <button type="button" key={l} className={`level-badge level-${l} ${c.level === l ? 'on' : ''}`} onClick={() => set({ level: l })}>{l}</button>
            ))}
            <span className="small muted">{LEVELS[c.level ?? 'B'].hint}</span>
          </div>
        </Field>
        <Field label="Lien du programme / de l’horaire"><input type="text" inputMode="url" autoCapitalize="none" value={c.program_url ?? ''} onChange={(e) => set({ program_url: e.target.value })} placeholder="https://…" /></Field>
        <div className="grid2">
          <Field label="Lien des inscriptions"><input type="text" inputMode="url" autoCapitalize="none" value={c.registration_url ?? ''} onChange={(e) => set({ registration_url: e.target.value })} placeholder="https://…" /></Field>
          <Field label="Délai d’inscription"><input type="date" value={c.registration_deadline ?? ''} onChange={(e) => set({ registration_deadline: e.target.value || null })} /></Field>
        </div>
        <Field label="Lien des résultats (après la compétition)"><input type="text" inputMode="url" autoCapitalize="none" value={c.results_url ?? ''} onChange={(e) => set({ results_url: e.target.value })} placeholder="https://…" /></Field>
        <Field label="Qui participe ?">
          <div className="form">
            <label className="check"><input type="radio" checked={!some} onChange={() => setSome(false)} /> <span>Tout le club (visible par tous les athlètes)</span></label>
            <label className="check"><input type="radio" checked={some} onChange={() => setSome(true)} /> <span>Certains athlètes (visible seulement par eux)</span></label>
            {some && groups.map((g) => {
              const list = active.filter((a) => a.group_id === g.id)
              if (!list.length) return null
              return (
                <div key={g.id}>
                  <div className="tiny muted">{g.name}</div>
                  <div className="pick-list">
                    {list.map((a) => (
                      <label key={a.id} className={`pick ${ids.includes(a.id) ? '' : 'off'}`}>
                        <input type="checkbox" checked={ids.includes(a.id)} onChange={() => toggle(a.id)} /> {fullName(a)}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Field>
        {some && ids.length > 0 && (
          <Field label="Disciplines de chacun">
            <div className="form">
              {active.filter((a) => ids.includes(a.id)).map((a) => {
                const cur = (entries[a.id] ?? '').split(',').map((x) => x.trim().toLowerCase())
                return (
                  <div key={a.id} className="entry-row">
                    <b className="small">{fullName(a)}</b>
                    <input list="events" value={entries[a.id] ?? ''} onChange={(e) => setEntry(a.id, e.target.value)} placeholder="Ex. 60 m, longueur" />
                    <div className="chips-wrap">
                      {suggestions(a.id).map((ev) => (
                        <button type="button" key={ev} className={`mini-chip ${cur.includes(ev.toLowerCase()) ? 'on' : ''}`} onClick={() => addEvent(a.id, ev)}>{ev}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
              <datalist id="events">{EVENTS.map((e) => <option key={e} value={e} />)}</datalist>
            </div>
          </Field>
        )}
        <Field label="Notes"><textarea rows={2} value={c.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Disciplines, transport, rendez-vous…" /></Field>
        {err && <div className="alert warn">{err}</div>}
        <div className="row between">
          {c.id ? <button type="button" className="btn ghost danger" onClick={del}>Supprimer</button> : <span />}
          <button className="btn primary" disabled={busy}>{busy ? '…' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  )
}

/** Compétitions à venir et passées */
export function Competitions() {
  const { competitions, me } = useData()
  const coach = me?.role === 'coach'
  const [form, setForm] = useState<Partial<Competition> | null>(null)
  const [showPast, setShowPast] = useState(false)
  const sorted = [...competitions].sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = sorted.filter((c) => daysUntil(lastDay(c)) >= 0)
  const past = sorted.filter((c) => daysUntil(lastDay(c)) < 0).reverse()
  const months = [...new Set(upcoming.map((c) => c.date.slice(0, 7)))]

  return (
    <div>
      {!coach && <Link to="/" className="muted small">← Accueil</Link>}
      <div className="row between">
        <h1>🏆 Compétitions</h1>
        {coach && <button className="btn primary" onClick={() => setForm({ date: todayISO() })}>+ Compétition</button>}
      </div>
      {coach && <p className="small muted">A = objectif principal · B = importante · C = préparation. Les compétitions apparaissent aussi dans le planning et chez les athlètes concernés.</p>}
      {upcoming.length === 0 ? (
        <Empty>{coach ? 'Aucune compétition à venir. Ajoute les compétitions visées dès que tu as le calendrier.' : 'Pas de compétition prévue pour le moment.'}</Empty>
      ) : months.map((m) => (
        <section key={m}>
          <h2 className="month-title">{formatDate(`${m}-01`, { month: 'long', year: 'numeric' })}</h2>
          <div className="cards">
            {upcoming.filter((c) => c.date.startsWith(m)).map((c) => <CompetitionCard key={c.id} c={c} onEdit={coach ? () => setForm(c) : undefined} />)}
          </div>
        </section>
      ))}
      {past.length > 0 && (
        <section>
          <button className="btn ghost small" onClick={() => setShowPast(!showPast)}>{showPast ? '▾' : '▸'} Compétitions passées ({past.length})</button>
          {showPast && <div className="cards">{past.map((c) => <CompetitionCard key={c.id} c={c} onEdit={coach ? () => setForm(c) : undefined} />)}</div>}
        </section>
      )}
      {form && <CompetitionForm initial={form} onClose={() => setForm(null)} />}
    </div>
  )
}
