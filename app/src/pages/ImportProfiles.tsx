import readXlsxFile from 'read-excel-file/browser'
import { useState } from 'react'
import { BackLink } from '../components/BackLink'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import type { Athlete } from '../types'
import type { Cell } from '../lib/importResults'
import { matchProfile, parseProfiles, shortEvents, type ProfileIn } from '../lib/importProfiles'
import { errorMessage, fullName } from '../lib/utils'

interface Row extends ProfileIn {
  target: string // id de la fiche | 'new' | 'skip'
  fuzzy: boolean
  setGoals: boolean
}

const noteOf = (title: string, p: ProfileIn) => [title, ...p.extra.map(([k, v]) => `${k.replace(/\s+$/, '')} : ${v}`)].join('\n')

/** Questionnaire de début de saison → fiches athlètes (nom, année de naissance, disciplines, objectifs) */
export function ImportProfiles() {
  const { athletes, groups, athlete_notes, save, saveMany, reload } = useData()
  const nav = useNavigate()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [title, setTitle] = useState('Questionnaire de début de saison')
  const [setEvents, setSetEvents] = useState(true)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const group = groupId ?? groups[0]?.id ?? ''
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs && rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const byId = (id: string) => athletes.find((a) => a.id === id)

  const onFile = async (file: File) => {
    setErr(null)
    try {
      const sheets = await readXlsxFile(file)
      const found = parseProfiles(sheets.map((s) => ({ name: s.sheet, rows: s.data as Cell[][] })))
      if (!found?.length) return setErr('Je n’ai pas trouvé de colonnes « Nom / Prénom » et « Objectifs » ou « Disciplines ».')
      const taken = new Set<string>()
      setRows(found.map((p) => {
        const { match, first, last } = matchProfile(p, athletes)
        const id = match && !taken.has(match.athlete.id) ? match.athlete.id : null
        if (id) taken.add(id)
        const cur = id ? byId(id)?.goals ?? '' : ''
        return { ...p, first, last, events: shortEvents(p.events), target: id ?? 'new', fuzzy: !!match && !match.exact, setGoals: !cur || cur === p.goals }
      }))
    } catch (e) {
      setErr('Impossible de lire ce fichier : ' + errorMessage(e))
    }
  }

  const chosen = rows?.filter((r) => r.target !== 'skip') ?? []
  const newCount = chosen.filter((r) => r.target === 'new').length

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      const created = await saveMany('athletes', chosen.filter((r) => r.target === 'new').map((r): Partial<Athlete> => ({
        first_name: r.first, last_name: r.last, birth_year: r.birthYear, events: r.events, goals: r.goals, group_id: group || null,
      })))
      let k = 0
      const ids = new Map<string, string>()
      for (const r of chosen) {
        if (r.target === 'new') { ids.set(r.key, created[k++].id); continue }
        const a = byId(r.target)
        if (!a) continue
        ids.set(r.key, a.id)
        const patch: Partial<Athlete> = {}
        // Nom complété (fiche avec prénom seul ou initiale) ; prénom corrigé si l'orthographe était proche
        if (r.last && (!a.last_name || (a.last_name.length <= 2 && r.last.toLowerCase().startsWith(a.last_name.toLowerCase().replace('.', ''))))) patch.last_name = r.last
        if (r.fuzzy) patch.first_name = r.first
        if (r.birthYear && r.birthYear !== a.birth_year) patch.birth_year = r.birthYear
        if (setEvents && r.events && r.events !== a.events) patch.events = r.events
        if (r.setGoals && r.goals && r.goals !== a.goals) patch.goals = r.goals
        if (Object.keys(patch).length) await save('athletes', { id: a.id, ...patch })
      }
      // Autres réponses → note privée (une seule fois)
      await saveMany('athlete_notes', chosen.flatMap((r) => {
        const athlete_id = ids.get(r.key)
        const text = noteOf(title, r)
        return athlete_id && r.extra.length && !athlete_notes.some((n) => n.athlete_id === athlete_id && n.text === text) ? [{ athlete_id, text }] : []
      }))
      await reload()
      nav('/athletes')
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <BackLink to="/athletes" label="Athlètes" />
      <h1>Importer un questionnaire</h1>
      <div className="card form">
        <p className="small">
          Choisis le fichier Excel des réponses (Google Forms ou autre) : une ligne par athlète avec Nom / Prénom, Date de naissance,
          Disciplines et Objectifs. Les objectifs s’affichent sur l’accueil de l’athlète (« Mon objectif »).
          Les autres réponses (disponibilités, musculation…) vont dans tes <b>notes privées</b>.
        </p>
        <input type="file" accept=".xlsx" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {err && <div className="alert warn">{err}</div>}
      </div>

      {rows && (
        <>
          <section className="card form">
            <label className="check"><input type="checkbox" checked={setEvents} onChange={(e) => setSetEvents(e.target.checked)} /> <span>Remplacer les <b>disciplines</b> des fiches par celles du questionnaire</span></label>
            {chosen.some((r) => r.extra.length) && <Field label="Titre de la note privée"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>}
            {newCount > 0 && (
              <Field label={`Groupe des ${newCount} nouvelle(s) fiche(s)`}>
                <select value={group} onChange={(e) => setGroupId(e.target.value)}>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  <option value="">— Sans groupe —</option>
                </select>
              </Field>
            )}
          </section>

          <h2>{rows.length} réponse(s)</h2>
          <div className="import-sessions">
            {rows.map((r) => {
              const a = byId(r.target)
              return (
                <div key={r.key} className={`card form ${r.target === 'skip' ? 'muted' : ''} ${r.fuzzy || r.target === 'new' ? 'to-check' : ''}`}>
                  <div className="row between wrap">
                    <b>{r.first} {r.last}{r.birthYear && <span className="muted small"> · {r.birthYear}</span>}</b>
                    <select value={r.target} onChange={(e) => set(r.key, { target: e.target.value, fuzzy: false, setGoals: !byId(e.target.value)?.goals })}>
                      {athletes.map((x) => <option key={x.id} value={x.id}>Fiche : {fullName(x)}</option>)}
                      <option value="new">Nouvelle fiche</option>
                      <option value="skip">Ignorer</option>
                    </select>
                  </div>
                  {r.fuzzy && <div className="tiny muted">Nom proche de la fiche « {a && fullName(a)} » : vérifie que c’est bien la même personne.</div>}
                  {r.target === 'new' && (
                    <div className="grid2">
                      <Field label="Prénom"><input value={r.first} onChange={(e) => set(r.key, { first: e.target.value })} /></Field>
                      <Field label="Nom"><input value={r.last} onChange={(e) => set(r.key, { last: e.target.value })} /></Field>
                      {r.last && <button type="button" className="btn ghost small" onClick={() => set(r.key, { first: r.last, last: r.first })}>⇄ Inverser prénom / nom</button>}
                    </div>
                  )}
                  {r.events && <div className="small">{r.events}</div>}
                  <Field label="Objectifs">
                    <textarea rows={2} value={r.goals} onChange={(e) => set(r.key, { goals: e.target.value, setGoals: true })} />
                  </Field>
                  {a?.goals && a.goals !== r.goals && (
                    <label className="check small"><input type="checkbox" checked={r.setGoals} onChange={(e) => set(r.key, { setGoals: e.target.checked })} /> <span>Remplacer l’objectif actuel : « {a.goals} »</span></label>
                  )}
                </div>
              )
            })}
          </div>
          <div className="sticky-actions">
            <button className="btn primary block" disabled={busy || chosen.length === 0} onClick={run}>
              {busy ? 'Import…' : `Mettre à jour ${chosen.length - newCount} fiche(s)${newCount ? ` et en créer ${newCount}` : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
