import { useMemo, useState } from 'react'
import { BackLink } from '../components/BackLink'
import { useData } from '../lib/data'
import { Empty, Field } from '../components/ui'
import type { Athlete } from '../types'
import { errorMessage, formatDate, fullName, todayISO } from '../lib/utils'
import { buildSeries, countIn as countSeries, DAYS, seriesChanges, seriesLabel, type Series } from '../lib/series'

/** Qui fait quoi : athlètes de chaque série de séances à venir, à retirer ou ajouter d'un coup */
export function WhoDoesWhat() {
  const { assignments, sessions, athletes, save } = useData()
  const [tab, setTab] = useState<'series' | 'athlete'>('series')
  const [who, setWho] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const today = todayISO()
  const active = useMemo(() => athletes.filter((a) => a.active).sort((a, b) => fullName(a).localeCompare(fullName(b))), [athletes])

  // Séances à venir regroupées par série (nom sans le numéro) et par jour de la semaine
  const series = useMemo(() => buildSeries(assignments, sessions, today), [assignments, sessions, today])
  const countIn = (x: Series, id: string) => countSeries(x, id, athletes)
  const membersOf = (s: Series) => active.filter((a) => countIn(s, a.id) > 0)
  const label = seriesLabel

  /** Retire ou ajoute un athlète dans toutes les séances à venir de la série */
  const apply = async (s: Series, a: Athlete, add: boolean) => {
    const n = add ? s.list.length - countIn(s, a.id) : countIn(s, a.id)
    if (!confirm(`${add ? 'Ajouter' : 'Retirer'} ${fullName(a)} ${add ? 'aux' : 'des'} ${n} prochaine(s) séance(s) « ${label(s)} » ?`)) return
    setBusy(s.key)
    setErr(null)
    try {
      await Promise.all(seriesChanges(s, a.id, add, athletes).map((x) => save('assignments', x)))
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy('')
    }
  }

  const person = active.find((a) => a.id === who)
  return (
    <div>
      <BackLink to="/planning" label="Planning" />
      <h1>Qui fait quoi</h1>
      <p className="small muted">Les séances à venir, regroupées par série et par jour. Retirer ou ajouter un athlète s’applique à toutes les prochaines séances de la série (les séances passées ne changent pas).</p>
      <div className="row gap day-filter">
        <button className={`chip ${tab === 'series' ? 'on' : ''}`} onClick={() => setTab('series')}>Par séance</button>
        <button className={`chip ${tab === 'athlete' ? 'on' : ''}`} onClick={() => setTab('athlete')}>Par athlète</button>
      </div>
      {err && <div className="alert warn">{err}</div>}
      {!series.length && <Empty>Aucune séance planifiée à venir.</Empty>}

      {tab === 'series' && series.map((s) => {
        const members = membersOf(s)
        const others = active.filter((a) => !members.includes(a))
        return (
          <section key={s.key} className="card form">
            <div className="row between wrap">
              <b>{s.name}</b>
              <span className="tiny muted">{DAYS[s.day]} · {s.list.length} séance(s) dès le {formatDate(s.list[0].date, { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="who-chips">
              {members.map((a) => {
                const k = countIn(s, a.id)
                return (
                  <span key={a.id} className="who-chip">
                    {fullName(a)}{k < s.list.length && <span className="tiny muted"> {k}/{s.list.length}</span>}
                    <button type="button" aria-label={`Retirer ${fullName(a)}`} disabled={!!busy} onClick={() => apply(s, a, false)}>✕</button>
                  </span>
                )
              })}
              {!members.length && <span className="muted small">Personne</span>}
            </div>
            {others.length > 0 && (
              <select value="" disabled={!!busy} onChange={(e) => { const a = active.find((x) => x.id === e.target.value); if (a) apply(s, a, true) }}>
                <option value="">{busy === s.key ? 'Enregistrement…' : '+ Ajouter un athlète'}</option>
                {others.map((a) => <option key={a.id} value={a.id}>{fullName(a)}</option>)}
              </select>
            )}
          </section>
        )
      })}

      {tab === 'athlete' && (
        <>
          <Field label="Athlète">
            <select value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">— Choisir —</option>
              {active.map((a) => <option key={a.id} value={a.id}>{fullName(a)}</option>)}
            </select>
          </Field>
          {person && (
            <>
              <h2>Ses séances à venir</h2>
              {series.filter((s) => countIn(s, person.id) > 0).map((s) => (
                <div key={s.key} className="card row between wrap">
                  <span><b>{s.name}</b> <span className="tiny muted">· {DAYS[s.day]} · {countIn(s, person.id)}/{s.list.length} séance(s)</span></span>
                  <button className="btn small danger ghost" disabled={!!busy} onClick={() => apply(s, person, false)}>{busy === s.key ? '…' : 'Retirer'}</button>
                </div>
              ))}
              {!series.some((s) => countIn(s, person.id) > 0) && <p className="muted small">Aucune séance à venir.</p>}
              {series.some((s) => countIn(s, person.id) < s.list.length) && (
                <Field label="L’ajouter à une série">
                  <select value="" disabled={!!busy} onChange={(e) => { const s = series.find((x) => x.key === e.target.value); if (s) apply(s, person, true) }}>
                    <option value="">+ Choisir une série</option>
                    {series.filter((s) => countIn(s, person.id) < s.list.length).map((s) => <option key={s.key} value={s.key}>{label(s)}</option>)}
                  </select>
                </Field>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
