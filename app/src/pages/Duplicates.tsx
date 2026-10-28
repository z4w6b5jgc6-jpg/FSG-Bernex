import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../components/BackLink'
import { Empty } from '../components/ui'
import { useData } from '../lib/data'
import { findDuplicates } from '../lib/duplicates'
import { planOf } from '../lib/targets'
import type { Assignment } from '../types'
import { athletesFor, errorMessage, formatDate } from '../lib/utils'

/** Doublons du planning : même jour, mêmes athlètes ; on choisit la planification à garder par cas */
export function Duplicates() {
  const { assignments, sessions, athletes, feedback, removeMany, remove, save, reload } = useData()
  const groups = useMemo(() => findDuplicates(assignments, sessions, athletes, feedback), [assignments, sessions, athletes, feedback])
  const [choice, setChoice] = useState<Record<string, string>>({}) // date+premier id → id gardé, ou 'all'
  const [cleanLibrary, setCleanLibrary] = useState(true)
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null), [done, setDone] = useState<string | null>(null)
  const key = (g: { date: string; items: Assignment[] }) => g.date + g.items[0].id
  const kept = (g: (typeof groups)[number]) => choice[key(g)] ?? g.keep
  const title = (a: Assignment) => sessions.find((s) => s.id === a.session_id)?.title ?? 'Séance supprimée'
  const fbCount = (a: Assignment) => feedback.filter((f) => f.assignment_id === a.id).length
  const toDelete = groups.flatMap((g) => kept(g) === 'all' ? [] : g.items.filter((a) => a.id !== kept(g)))
  const lostFeedback = toDelete.reduce((n, a) => n + fbCount(a), 0)
  const items = (sid: string) => sessions.find((s) => s.id === sid)?.blocks.reduce((n, b) => n + b.items.length, 0) ?? 0
  // Lundi à temps cibles gardé + copie importée plus détaillée : on reprend son contenu avant de la supprimer
  const merges = groups.flatMap((g) => {
    const k = g.items.find((a) => a.id === kept(g)), ks = k && sessions.find((s) => s.id === k.session_id)
    if (!ks || !planOf(ks)) return []
    const donor = g.items.filter((a) => a.id !== k.id && !planOf(sessions.find((s) => s.id === a.session_id)!)).sort((x, y) => items(y.session_id) - items(x.session_id))[0]
    return donor && items(donor.session_id) > items(ks.id) ? [{ target: ks, from: sessions.find((s) => s.id === donor.session_id)! }] : []
  })
  const [merge, setMerge] = useState(true)

  const run = async () => {
    if (!toDelete.length) return
    if (!confirm(`Supprimer ${toDelete.length} planification(s) en double${lostFeedback ? ` (dont ${lostFeedback} retour(s) d’athlètes)` : ''} ?`)) return
    setBusy(true); setErr(null)
    try {
      const ids = new Set(toDelete.map((a) => a.id))
      if (merge) for (const m of merges) await save('sessions', { id: m.target.id, blocks: m.from.blocks, plan: { ...planOf(m.target)!, detailed: true } } as Parameters<typeof save>[1])
      await removeMany('assignments', [...ids])
      // séances de la bibliothèque qui ne servent plus nulle part (hors plan à temps cibles)
      let removed = 0
      if (cleanLibrary) {
        const orphan = [...new Set(toDelete.map((a) => a.session_id))].filter((sid) => {
          const s = sessions.find((x) => x.id === sid)
          return s && !planOf(s) && !assignments.some((a) => a.session_id === sid && !ids.has(a.id))
        })
        for (const sid of orphan) await remove('sessions', sid)
        removed = orphan.length
      }
      await reload()
      setDone(`${ids.size} planification(s) supprimée(s)${removed ? `, ${removed} séance(s) inutilisée(s) retirée(s) de la bibliothèque` : ''}.`)
      setChoice({})
    } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <div>
      <BackLink to="/planning" label="Planning" />
      <h1>Doublons</h1>
      {done && <div className="alert info">{done}</div>}
      {err && <div className="alert warn">{err}</div>}
      {groups.length === 0 ? <Empty>Aucun doublon : chaque athlète a au plus une séance par jour.</Empty> : <>
        <p className="small muted">{groups.length} jour(s) où les mêmes athlètes ont plusieurs séances. La planification proposée à garder est cochée : la séance à temps cibles pour les lundis, sinon celle qui a des retours, sinon la plus récente.</p>
        {groups.map((g) => (
          <section key={key(g)}>
            <h2 className="section-title">{formatDate(g.date, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
            <div className="rows">
              {g.items.map((a) => {
                const s = sessions.find((x) => x.id === a.session_id)
                const n = fbCount(a)
                return (
                  <label key={a.id} className="row-item dup-row">
                    <input type="radio" name={key(g)} checked={kept(g) === a.id} onChange={() => setChoice({ ...choice, [key(g)]: a.id })} />
                    <span className="row-main">{title(a)}
                      <small>{[a.time, a.location, `${athletesFor(a, athletes).length} athlètes`].filter(Boolean).join(' · ')}</small>
                      <span className="row-tags">
                        {s && planOf(s) && <span className="status green">Temps cibles</span>}
                        {n > 0 && <span className="status blue">{n} retour(s)</span>}
                        {kept(g) !== a.id && kept(g) !== 'all' && <span className="status red">Sera supprimée</span>}
                      </span>
                    </span>
                    <Link to={`/planning/${a.id}`} className="chev" aria-label="Voir">›</Link>
                  </label>
                )
              })}
              <label className="row-item dup-row muted">
                <input type="radio" name={key(g)} checked={kept(g) === 'all'} onChange={() => setChoice({ ...choice, [key(g)]: 'all' })} />
                <span className="row-main">Ce n’est pas un doublon : tout garder</span>
              </label>
            </div>
          </section>
        ))}
        {merges.length > 0 && <label className="check"><input type="checkbox" checked={merge} onChange={(e) => setMerge(e.target.checked)} /> Reprendre le contenu détaillé des copies dans les {merges.length} lundi(s) à temps cibles gardé(s) (temps cibles et athlètes conservés)</label>}
        <label className="check"><input type="checkbox" checked={cleanLibrary} onChange={(e) => setCleanLibrary(e.target.checked)} /> Retirer aussi de la bibliothèque les séances qui ne servent plus</label>
        <div className="sticky-actions">
          <button className="btn primary block" disabled={busy || !toDelete.length} onClick={run}>{busy ? 'Suppression…' : `Supprimer ${toDelete.length} doublon(s)`}</button>
        </div>
      </>}
    </div>
  )
}
