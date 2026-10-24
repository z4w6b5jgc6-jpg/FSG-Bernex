import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { Field } from '../../components/ui'
import { DEFAULT_TESTS } from '../../data/defaults'
import { useData } from '../../lib/data'
import { matchAthlete, normText } from '../../lib/importResults'
import { defaultLocation } from '../../lib/importSessions'
import { markOf, planDrafts, readPlanFile, subgroupLabel, type PlanAthleteIn, type PlanFile } from '../../lib/mondayPlan'
import { isFlyTest, isVmaTest, planOf, recordsByDistance } from '../../lib/targets'
import type { Athlete, TestDef } from '../../types'
import { errorMessage, fullName, todayISO } from '../../lib/utils'

const is40 = (t: TestDef) => /\b40\s*m\b/i.test(t.name) && /arret|depart/.test(normText(t.name)) && !/lance/.test(normText(t.name))
// Tests du fichier → test de l'app (nom de la batterie par défaut si on doit le créer)
const TESTS: { key: 'vma_kmh' | 'lance_20m_s' | 'lance_30m_s' | 'depart_40m_s'; pick: (t: TestDef) => boolean; name: string }[] = [
  { key: 'vma_kmh', pick: isVmaTest, name: 'Test VMA' },
  { key: 'lance_20m_s', pick: isFlyTest(20), name: '20 m lancé' },
  { key: 'lance_30m_s', pick: isFlyTest(30), name: '30 m lancé' },
  { key: 'depart_40m_s', pick: is40, name: '40 m départ arrêté' },
]

interface Row { a: PlanAthleteIn; target: string /* id | 'new' | 'skip' */; fuzzy: boolean }

/** Import du plan du lundi (JSON) : remplace les séances du lundi, complète les fiches sans écraser */
export function MondayImport() {
  const { athletes, sessions, assignments, tests, test_results, records, groups, save, saveMany, removeMany, reload } = useData()
  const nav = useNavigate()
  const [file, setFile] = useState<PlanFile | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [time, setTime] = useState('18:00')
  const [groupId, setGroupId] = useState('')
  const [replace, setReplace] = useState(true)
  const active = useMemo(() => athletes.filter((a) => a.active).sort((a, b) => fullName(a).localeCompare(fullName(b))), [athletes])

  const onFile = async (f: File) => {
    setErr(null)
    try {
      const d = readPlanFile(await f.text())
      const taken = new Set<string>()
      setRows(d.athletes.map((a) => {
        const [first, ...last] = a.nom.trim().split(/\s+/)
        const m = matchAthlete({ key: '', first, last: last.join(' '), age: null, year: null, events: '' }, active)
        const id = m && !taken.has(m.athlete.id) ? m.athlete.id : null
        if (id) taken.add(id)
        return { a, target: id ?? 'new', fuzzy: !!m && !m.exact }
      }))
      setFile(d)
    } catch (e) {
      setFile(null)
      setErr(errorMessage(e))
    }
  }

  const drafts = useMemo(() => (file ? planDrafts(file) : []), [file])
  const dates = useMemo(() => new Set(drafts.map((x) => (x.plan as { date: string }).date)), [drafts])
  // Séances actuelles du lundi : planifiées à ces dates, d'un import précédent du plan, ou « Lundi S01 … » non planifiées
  const old = useMemo(() => {
    const onDates = assignments.filter((a) => dates.has(a.date))
    const ids = new Set([...onDates.map((a) => a.session_id), ...sessions.filter((s) => planOf(s) || /^Lundi S\d{2}\b/.test(s.title)).map((s) => s.id)])
    // séance aussi planifiée à d'autres dates : on ne retire que ces planifications
    const sessionIds = [...ids].filter((id) => assignments.every((a) => a.session_id !== id || dates.has(a.date)))
    const assignmentIds = onDates.filter((a) => !sessionIds.includes(a.session_id)).map((a) => a.id)
    return { sessionIds, assignmentIds, planned: onDates.length }
  }, [assignments, sessions, dates])

  const has = (id: string, pick: (t: TestDef) => boolean) => {
    const ids = new Set(tests.filter(pick).map((t) => t.id))
    return test_results.some((r) => r.athlete_id === id && ids.has(r.test_id))
  }
  /** Ce que l'import ajoute à une fiche (rien n'est écrasé) */
  const adds = (r: Row) => {
    const a = athletes.find((x) => x.id === r.target)
    const out: string[] = []
    if (!a || a.subgroup !== r.a.sous_groupe) out.push(`sous-groupe ${subgroupLabel(r.a.sous_groupe, file ?? undefined)}`)
    for (const t of TESTS) if (r.a[t.key] != null && (!a || !has(a.id, t.pick))) out.push(t.name.replace('Test ', ''))
    const recs = a ? recordsByDistance(a.id, records) : {}
    for (const [d, v] of Object.entries(r.a.records_s ?? {})) if (v && !recs[+d]) out.push(`record ${d} m`)
    return out
  }
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)))

  const run = async () => {
    if (!file) return
    setErr(null)
    try {
      // 1. Tests manquants dans l'app
      setBusy('Tests…')
      const testOf = new Map<string, string>()
      for (const t of TESTS) {
        let def = tests.find(t.pick)
        if (!def && rows.some((r) => r.target !== 'skip' && r.a[t.key] != null)) {
          const tpl = DEFAULT_TESTS.find((x) => x.name === t.name)!
          def = await save('tests', { ...tpl })
        }
        if (def) testOf.set(t.key, def.id)
      }
      // 2. Fiches : création ou compléments (sous-groupe, année et disciplines si vides)
      setBusy('Athlètes…')
      const ids = new Map<number, string>()
      const subgroupOf = new Map(athletes.filter((a) => a.active).map((a) => [a.id, a.subgroup ?? '']))
      const toCreate = rows.map((r, i) => [r, i] as const).filter(([r]) => r.target === 'new')
      const created = await saveMany('athletes', toCreate.map(([r]): Partial<Athlete> => {
        const [first, ...last] = r.a.nom.trim().split(/\s+/)
        return {
          first_name: first, last_name: last.join(' '), birth_year: r.a.naissance ? Number(r.a.naissance.slice(0, 4)) : null,
          events: r.a.disciplines ?? '', group_id: groupId || groups[0]?.id || null, subgroup: r.a.sous_groupe,
        }
      }))
      toCreate.forEach(([r, i], k) => { ids.set(i, created[k].id); subgroupOf.set(created[k].id, r.a.sous_groupe) })
      for (const [i, r] of rows.entries()) {
        if (r.target === 'new' || r.target === 'skip') continue
        const a = athletes.find((x) => x.id === r.target)!
        ids.set(i, a.id)
        const patch: Partial<Athlete> = {}
        if (a.subgroup !== r.a.sous_groupe) patch.subgroup = r.a.sous_groupe
        if (!a.birth_year && r.a.naissance) patch.birth_year = Number(r.a.naissance.slice(0, 4))
        if (!a.events && r.a.disciplines) patch.events = r.a.disciplines
        if (Object.keys(patch).length) await save('athletes', { id: a.id, ...patch })
        subgroupOf.set(a.id, r.a.sous_groupe)
      }
      // 3. Tests et records, seulement s'ils manquent
      setBusy('Tests et records…')
      await saveMany('test_results', rows.flatMap((r, i) => {
        const id = ids.get(i)
        if (!id) return []
        return TESTS.flatMap((t) => {
          const v = r.a[t.key]
          return v != null && testOf.has(t.key) && !has(id, t.pick)
            ? [{ athlete_id: id, test_id: testOf.get(t.key)!, date: todayISO(), value: v, trials: [], notes: `Plan du lundi ${file.saison ?? ''}`.trim() }]
            : []
        })
      }))
      await saveMany('records', rows.flatMap((r, i) => {
        const id = ids.get(i)
        if (!id) return []
        const have = recordsByDistance(id, records)
        return Object.entries(r.a.records_s ?? {}).filter(([d, v]) => v && !have[+d])
          .map(([d, v]) => ({ athlete_id: id, event: `${d} m`, mark: markOf(v), date: todayISO(), competition: '' }))
      }))
      // 4. Anciennes séances du lundi
      if (replace) {
        setBusy('Remplacement des anciennes séances…')
        if (old.assignmentIds.length) await removeMany('assignments', old.assignmentIds)
        if (old.sessionIds.length) await removeMany('sessions', old.sessionIds)
      }
      // 5. Nouvelles séances, planifiées pour les athlètes de chaque sous-groupe
      setBusy('Séances…')
      const made = await saveMany('sessions', drafts)
      const athleteIds = (sg: string) => [...subgroupOf].filter(([, g]) => g === sg).map(([id]) => id)
      await saveMany('assignments', made.map((s) => {
        const p = planOf(s)!
        return { session_id: s.id, date: p.date, time, location: defaultLocation(p.date), group_id: null, athlete_ids: athleteIds(p.subgroup), note: '' }
      }))
      await reload()
      nav('/lundi')
    } catch (e) {
      const msg = errorMessage(e)
      setErr(/subgroup|plan|targets|schema cache|column/i.test(msg)
        ? `${msg} — La base n’a pas encore les nouveaux champs : ouvre « Mettre à jour la base » (adresse de l’app suivie de #/base), lance le script, puis réessaie.`
        : msg)
    } finally {
      setBusy('')
    }
  }

  const kept = rows.filter((r) => r.target !== 'skip')
  return (
    <div>
      <BackLink to="/lundi" label="Lundi" />
      <h1>Importer le plan du lundi</h1>
      <div className="card form">
        <p className="small">
          Choisis le fichier <b>seances_lundi_2026-2027.json</b>. Les séances du lundi actuelles sont remplacées. Les fiches des athlètes
          sont <b>complétées sans rien écraser</b> : sous-groupe, et tests ou records seulement s’ils manquent.
        </p>
        <input type="file" accept=".json,application/json" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {err && <div className="alert warn">{err}</div>}
      </div>

      {file && (
        <>
          <section className="card form">
            <h2>Séances</h2>
            <p className="small">
              <b>{dates.size}</b> lundis, <b>{drafts.length}</b> séances (une par sous-groupe), {drafts.reduce((n, d) => n + (d.targets?.length ?? 0), 0)} temps cibles.
            </p>
            <label className="check">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              <span>Remplacer les séances du lundi actuelles : <b>{old.sessionIds.length}</b> séance(s), {old.planned} planification(s) à ces dates et leurs retours</span>
            </label>
            <div className="grid2">
              <Field label="Heure"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
              {kept.some((r) => r.target === 'new') && (
                <Field label="Groupe des nouvelles fiches">
                  <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    <option value="">— Sans groupe —</option>
                  </select>
                </Field>
              )}
            </div>
          </section>

          <h2>{rows.length} athlète(s) du plan</h2>
          <div className="import-sessions">
            {rows.map((r, i) => {
              const add = r.target === 'skip' ? [] : adds(r)
              return (
                <div key={r.a.nom} className={`card form ${r.target === 'skip' ? 'muted' : ''} ${r.fuzzy || r.target === 'new' ? 'to-check' : ''}`}>
                  <div className="row between wrap">
                    <b>{r.a.nom} <span className="tiny muted">· {subgroupLabel(r.a.sous_groupe, file)}</span></b>
                    <select value={r.target} onChange={(e) => set(i, { target: e.target.value, fuzzy: false })}>
                      {active.map((x) => <option key={x.id} value={x.id}>Fiche : {fullName(x)}</option>)}
                      <option value="new">➕ Nouvelle fiche</option>
                      <option value="skip">Ignorer</option>
                    </select>
                  </div>
                  {r.fuzzy && <div className="tiny muted">Nom proche : vérifie que c’est bien la même personne.</div>}
                  {r.target !== 'skip' && <div className="tiny muted">{add.length ? `Ajouté : ${add.join(', ')}` : 'Fiche déjà complète'}</div>}
                </div>
              )
            })}
          </div>
          <div className="sticky-actions">
            <button className="btn primary block" disabled={!!busy} onClick={run}>
              {busy || `Importer ${drafts.length} séances${replace && old.sessionIds.length ? ` (remplace ${old.sessionIds.length})` : ''} et compléter ${kept.length} fiche(s)`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
