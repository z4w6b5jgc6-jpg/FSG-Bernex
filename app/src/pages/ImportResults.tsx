import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import { DEFAULT_TESTS, EXTRA_TESTS } from '../data/defaults'
import type { Athlete } from '../types'
import {
  availableTests, cellText, findDate, matchAthlete, normText, parseSheet, personOf, pickSheets, toNumber,
  type Cell, type ColRole, type ParsedSheet, type RowPerson, type SheetIn,
} from '../lib/importResults'
import { formatValue } from '../lib/tests'
import { errorMessage, fullName, todayISO } from '../lib/utils'

const roleKey = (r: ColRole) => (r.kind === 'test' ? `test:${r.test}` : r.kind === 'report' ? `report:${r.field}` : r.kind)
const keyRole = (k: string): ColRole => {
  if (k.startsWith('test:')) return { kind: 'test', test: k.slice(5) }
  if (k.startsWith('report:')) return { kind: 'report', field: k.slice(7) as 'message' }
  return { kind: k } as ColRole
}
const BASE_ROLES: [string, string][] = [
  ['ignore', '— Ignorer —'], ['name', 'Athlète (prénom nom)'], ['first', 'Prénom'], ['last', 'Nom'],
  ['age', 'Âge'], ['year', 'Année de naissance'], ['events', 'Spécialité'], ['sex', 'Sexe (non importé)'],
]
const REPORT_ROLES: [string, string][] = [
  ['report:strengths', 'Bilan · points forts'], ['report:priority', 'Bilan · axe prioritaire'],
  ['report:training', 'Bilan · type d’entraînement'], ['report:message', 'Bilan · message à l’athlète'],
  ['report:private', 'Note privée (positionnement, vigilance)'],
]
const EMPTY = /^[-–—]?$/

/** Import d'un classeur de résultats de tests (Excel ou CSV), avec bilans individuels */
export function ImportResults() {
  const data = useData()
  const { tests, athletes, groups, test_results, test_reports, athlete_notes, save, saveMany, reload } = data
  const nav = useNavigate()
  const [raw, setRaw] = useState<SheetIn[] | null>(null)
  const [parsed, setParsed] = useState<ParsedSheet[]>([])
  const [resIdx, setResIdx] = useState(-1)
  const [repIdx, setRepIdx] = useState(-1)
  const [date, setDate] = useState(todayISO())
  const [choice, setChoice] = useState<Record<string, string>>({}) // clé personne → id athlète | 'new' | 'skip'
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [paste, setPaste] = useState('')
  const [dateFound, setDateFound] = useState(true)
  // Si la séance a déjà été importée : le nouveau fichier fait foi (remplace) ou la complète
  const [mode, setMode] = useState<'replace' | 'merge'>('replace')
  // Groupe attribué aux fiches créées par l'import ('' = sans groupe, '+' = nouveau groupe)
  const [newGroup, setNewGroup] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('U18')
  const groupChoice = newGroup ?? (groups[0]?.id ?? '+')

  const known = useMemo(() => availableTests(tests, [...DEFAULT_TESTS, ...EXTRA_TESTS]), [tests])

  const load = (sheets: SheetIn[]) => {
    const p = sheets.map((s) => parseSheet(s, known))
    const pick = pickSheets(p)
    setRaw(sheets)
    setParsed(p)
    setResIdx(pick.results)
    setRepIdx(pick.reports)
    const found = findDate(sheets)
    setDate(found ?? todayISO())
    setDateFound(!!found)
    setChoice({})
    setErr(pick.results < 0 && pick.reports < 0 ? 'Je n’ai pas trouvé de tableau avec une colonne « Athlète » (ou « Prénom »). Vérifie les colonnes ci-dessous.' : null)
  }

  const onFile = async (file: File) => {
    setErr(null)
    try {
      if (/\.(csv|tsv|txt)$/i.test(file.name)) return loadText(await file.text(), file.name)
      const { default: readXlsxFile } = await import('read-excel-file/browser')
      const sheets = await readXlsxFile(file)
      load(sheets.map((s) => ({ name: s.sheet, rows: s.data as Cell[][] })))
    } catch (e) {
      setErr('Impossible de lire ce fichier : ' + errorMessage(e))
    }
  }
  const loadText = (text: string, name = 'Collage') => {
    const lines = text.split(/\r?\n/)
    const sep = lines[0]?.includes('\t') ? '\t' : lines[0]?.includes(';') ? ';' : ','
    load([{ name, rows: lines.map((l) => l.split(sep).map((c) => c.trim() || null)) }])
  }

  const setRole = (sheet: number, col: number, key: string) =>
    setParsed((ps) => ps.map((p, i) => (i === sheet ? { ...p, roles: p.roles.map((r, j) => (j === col ? keyRole(key) : r)) } : p)))

  // Personnes trouvées dans les feuilles retenues
  const people = useMemo(() => {
    const map = new Map<string, RowPerson>()
    for (const i of [resIdx, repIdx]) {
      const s = parsed[i]
      if (!s) continue
      for (const row of s.rows) {
        const p = personOf(row, s.roles)
        if (!p.first) continue
        const prev = map.get(p.key)
        map.set(p.key, prev ? { ...prev, age: prev.age ?? p.age, year: prev.year ?? p.year, events: prev.events || p.events } : p)
      }
    }
    return [...map.values()]
  }, [parsed, resIdx, repIdx])

  // Résultats à importer
  const plan = useMemo(() => {
    const s = parsed[resIdx]
    const results: { key: string; test: string; values: number[] }[] = []
    if (s) {
      for (const row of s.rows) {
        const p = personOf(row, s.roles)
        const byTest = new Map<string, number[]>()
        s.roles.forEach((r, i) => {
          if (r.kind !== 'test') return
          const v = toNumber(row[i])
          if (v != null && v > 0) byTest.set(r.test, [...(byTest.get(r.test) ?? []), v])
        })
        for (const [test, values] of byTest) results.push({ key: p.key, test, values })
      }
    }
    const reports: { key: string; fields: Record<string, string> }[] = []
    const r = parsed[repIdx]
    if (r) {
      for (const row of r.rows) {
        const p = personOf(row, r.roles)
        const fields: Record<string, string> = {}
        r.roles.forEach((role, i) => {
          if (role.kind !== 'report') return
          const v = cellText(row[i])
          if (EMPTY.test(v)) return
          const label = r.headers[i]
          fields[role.field] = role.field === 'private' ? [fields.private, `${label} : ${v}`].filter(Boolean).join('\n') : [fields[role.field], v].filter(Boolean).join(' ')
        })
        if (Object.keys(fields).length) reports.push({ key: p.key, fields })
      }
    }
    return { results, reports, testNames: [...new Set(results.map((x) => x.test))] }
  }, [parsed, resIdx, repIdx])

  // Par défaut : fiche reconnue, sinon nouvelle fiche… sauf si la ligne est vide (aucun résultat ni bilan)
  const hasData = (p: RowPerson) => plan.results.some((x) => x.key === p.key) || plan.reports.some((x) => x.key === p.key)
  const resolved = (p: RowPerson): string => choice[p.key] ?? matchAthlete(p, athletes)?.athlete.id ?? (hasData(p) ? 'new' : 'skip')
  const toCheck = (p: RowPerson) => !choice[p.key] && matchAthlete(p, athletes)?.exact === false

  const existingSameDay = test_results.filter((r) => r.date === date && people.some((p) => {
    const id = resolved(p)
    return id === r.athlete_id && plan.results.some((x) => x.key === p.key)
  })).length
  const included = people.filter((p) => resolved(p) !== 'skip')
  const newCount = included.filter((p) => resolved(p) === 'new').length
  const missingTests = plan.testNames.filter((n) => !tests.some((t) => t.name === n))

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      // 1. Tests manquants (créés depuis la batterie si possible)
      const testIds = new Map(tests.map((t) => [t.name, t]))
      for (const name of missingTests) {
        const tpl = [...DEFAULT_TESTS, ...EXTRA_TESTS].find((t) => normText(t.name) === normText(name))
        const t = await save('tests', tpl ?? { name, unit: '', higher_is_better: true, category: 'Autre', description: '' })
        testIds.set(t.name, t)
      }
      // 2. Nouvelles fiches (dans le groupe choisi, créé si besoin)
      let groupId: string | null = groupChoice || null
      if (groupChoice === '+' && newGroupName.trim() && included.some((p) => resolved(p) === 'new')) {
        groupId = (await save('groups', { name: newGroupName.trim(), color: '#2563eb' })).id
      } else if (groupChoice === '+') groupId = null
      const year = Number(date.slice(0, 4))
      const ids = new Map<string, string>()
      const toCreate = included.filter((p) => resolved(p) === 'new')
      const created = await saveMany('athletes', toCreate.map((p): Partial<Athlete> => ({
        first_name: p.first, last_name: p.last, events: p.events, group_id: groupId,
        birth_year: p.year ?? (p.age ? year - p.age : null),
      })))
      toCreate.forEach((p, i) => ids.set(p.key, created[i].id))
      for (const p of included) if (resolved(p) !== 'new') ids.set(p.key, resolved(p))

      // 3. Résultats
      //    - remplacer : le fichier fait foi pour cette date, les anciens résultats de ces athlètes ce jour-là sont supprimés
      //    - compléter : un même test le même jour est mis à jour (ex. 2e essai ajouté), jamais dupliqué
      let updated = 0
      let removed = 0
      const inFile = new Set(plan.results.map((x) => ids.get(x.key)).filter(Boolean))
      const reportsInFile = new Set(plan.reports.map((x) => ids.get(x.key)).filter(Boolean))
      const current = { results: [...test_results], reports: [...test_reports] }
      if (mode === 'replace') {
        for (const r of current.results.filter((x) => x.date === date && inFile.has(x.athlete_id))) {
          await api.remove('test_results', r.id)
          removed++
        }
        current.results = current.results.filter((x) => !(x.date === date && inFile.has(x.athlete_id)))
        for (const r of current.reports.filter((x) => x.date === date && reportsInFile.has(x.athlete_id))) await api.remove('test_reports', r.id)
        current.reports = current.reports.filter((x) => !(x.date === date && reportsInFile.has(x.athlete_id)))
      }
      const rows = []
      for (const { key, test, values } of plan.results) {
        const athlete_id = ids.get(key)
        const t = testIds.get(test)
        if (!athlete_id || !t) continue
        const best = t.higher_is_better ? Math.max(...values) : Math.min(...values)
        const trials = values.length > 1 ? values : []
        const existing = current.results.find((r) => r.athlete_id === athlete_id && r.test_id === t.id && r.date === date)
        if (existing) {
          if (existing.value !== best || existing.trials.join() !== trials.join()) {
            await save('test_results', { id: existing.id, value: best, trials })
            updated++
          }
        } else rows.push({ athlete_id, test_id: t.id, date, value: best, trials, notes: '' })
      }
      await saveMany('test_results', rows)

      // 4. Bilans (message visible par l'athlète) et notes privées
      const title = `Bilan des tests du ${new Date(date).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' })}`
      const reports = plan.reports.flatMap(({ key, fields }) => {
        const athlete_id = ids.get(key)
        if (!athlete_id || current.reports.some((r) => r.athlete_id === athlete_id && r.date === date)) return []
        const { private: _priv, ...pub } = fields
        void _priv
        return Object.keys(pub).length ? [{ athlete_id, date, title, ...pub }] : []
      })
      await saveMany('test_reports', reports)
      const notes = plan.reports.flatMap(({ key, fields }) => {
        const athlete_id = ids.get(key)
        const text = `${title}\n${fields.private}`
        return athlete_id && fields.private && !athlete_notes.some((n) => n.athlete_id === athlete_id && n.text === text) ? [{ athlete_id, text }] : []
      })
      await saveMany('athlete_notes', notes)
      await reload()
      nav(`/tests/tableau?import=${rows.length}-${reports.length}-${created.length}-${updated}-${removed}`)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const testOptions = known.map((t) => [`test:${t.name}`, `Test · ${t.name}${t.exists ? '' : ' (sera créé)'}`] as [string, string])
  const res = parsed[resIdx]

  return (
    <div>
      <Link to="/tests" className="muted small">← Tests</Link>
      <h1>Importer des résultats</h1>
      <div className="card form">
        <p className="small">
          Choisis ton classeur Excel (.xlsx) ou un fichier CSV. Une ligne par athlète, une colonne par test.
          Plusieurs colonnes pour un même test (« essai 1 », « essai 2 ») sont gardées comme <b>essais</b>, le meilleur est retenu.
          Une feuille avec les colonnes « Points forts », « Axe prioritaire » ou « Feedback » devient le <b>bilan</b> de chaque athlète.
        </p>
        <input type="file" accept=".xlsx,.csv,.tsv,.txt" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {!raw && (
          <details>
            <summary className="small">…ou coller un tableau</summary>
            <textarea rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Athlète\tMono (m)\tTriple (m)\t20 m essai 1 (s)\nSara\t2,00\t5,40\t2,60'} />
            <button className="btn small" disabled={!paste.trim()} onClick={() => loadText(paste)}>Analyser</button>
          </details>
        )}
        {err && <div className="alert warn">{err}</div>}
      </div>

      {raw && (
        <>
          <section className="card form">
            <div className="grid2">
              <Field label="Feuille des résultats">
                <select value={resIdx} onChange={(e) => setResIdx(Number(e.target.value))}>
                  <option value={-1}>Aucune</option>
                  {parsed.map((p, i) => <option key={i} value={i}>{p.name} ({p.rows.length} lignes)</option>)}
                </select>
              </Field>
              <Field label="Feuille des bilans">
                <select value={repIdx} onChange={(e) => setRepIdx(Number(e.target.value))}>
                  <option value={-1}>Aucune</option>
                  {parsed.map((p, i) => <option key={i} value={i}>{p.name} ({p.rows.length} lignes)</option>)}
                </select>
              </Field>
            </div>
            <Field label="Date des tests">
              <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setDateFound(true) }} className={dateFound ? '' : 'attention'} />
            </Field>
            {!dateFound && <div className="alert warn small">📅 Pas de date dans le fichier : indique le jour où le test a été fait (sinon c’est aujourd’hui).</div>}
            {existingSameDay > 0 && (
              <div className="alert info small form">
                <div>🔁 <b>{existingSameDay} résultat(s)</b> de ces athlètes existent déjà pour le {new Date(date).toLocaleDateString('fr-CH')} (import précédent).</div>
                <label className="check"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> <span><b>Ce fichier remplace la séance</b> : les anciens résultats de ce jour sont supprimés et remplacés par ceux du fichier</span></label>
                <label className="check"><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> <span><b>Compléter</b> : garder les anciens résultats et ajouter / mettre à jour ceux du fichier</span></label>
              </div>
            )}
          </section>

          {[resIdx, repIdx].filter((i, k, arr) => i >= 0 && arr.indexOf(i) === k).map((si) => {
            const p = parsed[si]
            return (
              <section key={si}>
                <details className="card">
                  <summary>
                    <b>Colonnes · {p.name}</b>{' '}
                    <span className="muted small">{p.roles.filter((r) => r.kind !== 'ignore').length} reconnue(s) sur {p.headers.filter(Boolean).length} — vérifier</span>
                  </summary>
                  <table className="table small">
                    <tbody>
                      {p.headers.map((h, i) => h && (
                        <tr key={i} className={p.roles[i].kind === 'ignore' ? 'muted' : ''}>
                          <td>{h}<div className="tiny muted">{cellText(p.rows[0]?.[i] ?? null).slice(0, 40)}</div></td>
                          <td>
                            <select value={roleKey(p.roles[i])} onChange={(e) => setRole(si, i, e.target.value)}>
                              {[...BASE_ROLES, ...(si === resIdx ? testOptions : []), ...(si === repIdx ? REPORT_ROLES : [])].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="tiny muted">Les colonnes calculées par ton classeur (meilleur, écart, vitesse, rapports, lectures) sont ignorées : l’app les recalcule.</p>
                </details>
              </section>
            )
          })}

          {people.length > 0 && (
            <section>
              <h2>Athlètes ({people.length})</h2>
              {newCount > 0 && (
                <div className="card form new-group">
                  <Field label={`Groupe des ${newCount} nouvelle(s) fiche(s)`}>
                    <select value={groupChoice} onChange={(e) => setNewGroup(e.target.value)}>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      <option value="+">➕ Nouveau groupe…</option>
                      <option value="">Sans groupe</option>
                    </select>
                  </Field>
                  {groupChoice === '+' && (
                    <Field label="Nom du nouveau groupe"><input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} /></Field>
                  )}
                </div>
              )}
              <div className="card">
                <table className="table small">
                  <tbody>
                    {people.map((p) => {
                      const r = resolved(p)
                      const n = plan.results.filter((x) => x.key === p.key).length
                      const check = toCheck(p)
                      const empty = !hasData(p)
                      return (
                        <tr key={p.key} className={check ? 'to-check' : ''}>
                          <td>
                            <b>{p.first} {p.last}</b>
                            <div className="tiny muted">{[p.age && `${p.age} ans`, p.events, `${n} résultat(s)`].filter(Boolean).join(' · ')}</div>
                            {check && <div className="tiny warn-text">≈ orthographe proche : vérifie que c’est la bonne personne</div>}
                            {empty && <div className="tiny muted">ligne vide (aucun résultat) : ignorée par défaut</div>}
                          </td>
                          <td>
                            <select value={r} onChange={(e) => setChoice({ ...choice, [p.key]: e.target.value })}>
                              <option value="new">➕ Nouvelle fiche</option>
                              <option value="skip">Ignorer</option>
                              {athletes.map((a) => <option key={a.id} value={a.id}>{fullName(a)}{a.birth_year ? ` (${a.birth_year})` : ''}</option>)}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {people.some(toCheck) && (
                  <div className="alert warn small">
                    {people.filter(toCheck).length} prénom(s) écrit(s) un peu différemment de ta liste ont été rapprochés. Vérifie les lignes surlignées avant d’importer.
                  </div>
                )}
                <p className="tiny muted">Les fiches existantes sont reconnues par prénom + nom (ou prénom seul s’il est unique, ou très proche). Une nouvelle fiche se reliera automatiquement au compte de l’athlète quand il s’inscrira.</p>
              </div>
            </section>
          )}

          {res && plan.results.length > 0 && (
            <section>
              <h2>Aperçu</h2>
              <div className="card matrix-wrap">
                <table className="matrix">
                  <thead><tr><th>Athlète</th>{plan.testNames.map((t) => <th key={t}>{t}</th>)}</tr></thead>
                  <tbody>
                    {included.map((p) => (
                      <tr key={p.key}>
                        <th>{p.first} {p.last}</th>
                        {plan.testNames.map((t) => {
                          const x = plan.results.find((y) => y.key === p.key && y.test === t)
                          const def = tests.find((d) => d.name === t) ?? [...DEFAULT_TESTS, ...EXTRA_TESTS].find((d) => d.name === t)
                          return <td key={t}>{x ? x.values.map((v) => formatValue(v, def?.unit === 's' && v >= 60 ? 's' : '')).join(' / ') : '–'}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="sticky-actions">
            <div className="small center">
              {plan.results.filter((x) => included.some((p) => p.key === x.key)).length} résultat(s)
              {plan.reports.length > 0 && ` · ${plan.reports.filter((x) => included.some((p) => p.key === x.key)).length} bilan(s)`}
              {newCount > 0 && ` · ${newCount} nouvelle(s) fiche(s)`}
              {missingTests.length > 0 && ` · test(s) créé(s) : ${missingTests.join(', ')}`}
            </div>
            <button className="btn primary block" disabled={busy || included.length === 0 || (plan.results.length === 0 && plan.reports.length === 0)} onClick={run}>
              {busy ? 'Import…' : 'Importer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
