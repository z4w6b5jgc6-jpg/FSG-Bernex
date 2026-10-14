import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/data'
import { Empty, Field, GroupBadge, Modal } from '../components/ui'
import { DEFAULT_TESTS, EXTRA_TESTS, type TestTemplate } from '../data/defaults'
import type { TestDef } from '../types'
import { formatValue, parseValue, summarize, trendLabel } from '../lib/tests'
import { errorMessage, formatShort, fullName, todayISO } from '../lib/utils'

const CATS = ['Vitesse', 'Bondissement', 'Endurance', 'Lancers', 'Explosivité', 'Force', 'Mobilité', 'Technique', 'Autre']

/** Catalogue des tests physiques */
export function Tests() {
  const { tests, test_results, saveMany } = useData()
  const [edit, setEdit] = useState<Partial<TestDef> | null>(null)
  const [busy, setBusy] = useState(false)

  const has = (t: TestTemplate) => tests.some((x) => x.name.toLowerCase() === t.name.toLowerCase())
  const add = async (list: TestTemplate[]) => {
    setBusy(true)
    try {
      await saveMany('tests', list.filter((t) => !has(t)))
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Link to="/athletes" className="muted small">← Athlètes</Link>
      <div className="row between">
        <h1>Tests physiques</h1>
        <button className="btn" onClick={() => setEdit({ category: 'Vitesse', higher_is_better: true })}>+ Test</button>
      </div>
      {tests.length === 0 ? (
        <Empty>
          Ta batterie de tests : 20 m lancé, 30 m lancé, 40 m départ arrêté, monobond, triple bond, pentabond, décabond et VMA.<br />
          <button className="btn primary" onClick={() => add(DEFAULT_TESTS)} disabled={busy}>Ajouter ces {DEFAULT_TESTS.length} tests</button>
          <div className="small" style={{ marginTop: '0.8rem' }}>ou <Link to="/tests/import">📥 importer directement ton classeur Excel</Link></div>
        </Empty>
      ) : (
        <>
          <div className="row gap wrap">
            <Link className="btn primary" to="/tests/saisie">✏️ Saisir des résultats</Link>
            <Link className="btn" to="/tests/tableau">📊 Tableau du groupe</Link>
            <Link className="btn" to="/tests/allures-sprint">⚡ Allures sprint</Link>
            <Link className="btn" to="/tests/import">📥 Importer (Excel)</Link>
          </div>
          {CATS.map((c) => {
            const list = tests.filter((t) => t.category === c)
            if (list.length === 0) return null
            return (
              <section key={c}>
                <h2>{c}</h2>
                <div className="list">
                  {list.map((t) => {
                    const n = new Set(test_results.filter((r) => r.test_id === t.id).map((r) => r.athlete_id)).size
                    return (
                      <div key={t.id} className="card row between">
                        <Link to={`/tests/${t.id}`} className="left">
                          <strong>{t.name}</strong>
                          <div className="tiny muted">{t.unit} · {t.higher_is_better ? 'plus = mieux' : 'moins = mieux'} · {n} athlète(s) testé(s)</div>
                        </Link>
                        <button className="btn ghost small" onClick={() => setEdit(t)}>Modifier</button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
          {DEFAULT_TESTS.some((d) => !has(d)) && (
            <button className="btn ghost small" onClick={() => add(DEFAULT_TESTS)} disabled={busy}>+ Ajouter les tests de la batterie manquants</button>
          )}
          {EXTRA_TESTS.some((d) => !has(d)) && (
            <section>
              <h2>Tests complémentaires</h2>
              <p className="muted small">Pour les lanceurs et les demi-fondeurs, si tu veux les suivre en plus.</p>
              <div className="row gap wrap">
                {EXTRA_TESTS.filter((t) => !has(t)).map((t) => (
                  <button key={t.name} className="btn small" onClick={() => add([t])} disabled={busy}>+ {t.name}</button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {edit && <TestForm initial={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function TestForm({ initial, onClose }: { initial: Partial<TestDef>; onClose: () => void }) {
  const { save, remove } = useData()
  const [t, setT] = useState(initial)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save('tests', { id: t.id, name: t.name, unit: t.unit ?? '', higher_is_better: t.higher_is_better ?? true, category: t.category, description: t.description ?? '' })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title={t.id ? 'Modifier le test' : 'Nouveau test'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Nom"><input value={t.name ?? ''} onChange={(e) => setT({ ...t, name: e.target.value })} required placeholder="Ex. 30 m départ debout" /></Field>
        <div className="grid2">
          <Field label="Unité"><input value={t.unit ?? ''} onChange={(e) => setT({ ...t, unit: e.target.value })} placeholder="s, m, cm, km/h…" /></Field>
          <Field label="Catégorie">
            <select value={t.category} onChange={(e) => setT({ ...t, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
        </div>
        <Field label="Meilleur résultat">
          <select value={t.higher_is_better ? 'high' : 'low'} onChange={(e) => setT({ ...t, higher_is_better: e.target.value === 'high' })}>
            <option value="high">Le plus grand (distance, hauteur, vitesse…)</option>
            <option value="low">Le plus petit (chrono)</option>
          </select>
        </Field>
        <Field label="Protocole / consignes"><textarea rows={2} value={t.description ?? ''} onChange={(e) => setT({ ...t, description: e.target.value })} /></Field>
        <div className="row gap end">
          {t.id && <button type="button" className="btn ghost danger" onClick={async () => { if (confirm('Supprimer ce test et tous ses résultats ?')) { await remove('tests', t.id!); onClose() } }}>Supprimer</button>}
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}

/** Classement d'un test : dernier résultat de chaque athlète */
export function TestDetail() {
  const { id } = useParams()
  const { tests, test_results, athletes, groups } = useData()
  const [group, setGroup] = useState('')
  const test = tests.find((t) => t.id === id)
  if (!test) return <Empty>Test introuvable. <Link to="/tests">Retour</Link></Empty>
  const rows = athletes
    .filter((a) => a.active && (!group || a.group_id === group))
    .map((a) => ({ a, s: summarize(test, test_results.filter((r) => r.athlete_id === a.id)) }))
    .filter((x) => x.s)
    .sort((x, y) => (test.higher_is_better ? y.s!.last.value - x.s!.last.value : x.s!.last.value - y.s!.last.value))
  return (
    <div>
      <Link to="/tests" className="muted small">← Tests</Link>
      <h1>{test.name}</h1>
      {test.description && <p className="muted small">{test.description}</p>}
      <div className="row gap filters">
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Tous les groupes</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <Link className="btn primary" to={`/tests/saisie?test=${test.id}`}>✏️ Saisir</Link>
      </div>
      {rows.length === 0 ? <Empty>Aucun résultat pour ce test.</Empty> : (
        <div className="card">
          <table className="table">
            <tbody>
              {rows.map(({ a, s }, i) => {
                const g = groups.find((x) => x.id === a.group_id)
                return (
                  <tr key={a.id}>
                    <td className="muted">{i + 1}</td>
                    <td><Link to={`/athletes/${a.id}`}>{fullName(a)}</Link> {g && <GroupBadge name={g.name} color={g.color} />}<div className="tiny muted">{formatShort(s!.last.date)}</div></td>
                    <td className="right"><b>{formatValue(s!.last.value, test.unit)}</b><div className={`tiny ${s!.trend > 0 ? 'up' : s!.trend < 0 ? 'down' : 'muted'}`}>{trendLabel(s!)}</div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Saisie rapide des résultats d'un test pour tout un groupe */
export function TestEntry() {
  const { tests, athletes, groups, test_results, saveMany } = useData()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [testId, setTestId] = useState(params.get('test') ?? tests[0]?.id ?? '')
  const [date, setDate] = useState(todayISO())
  const [group, setGroup] = useState(groups[0]?.id ?? '')
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const test = tests.find((t) => t.id === testId)
  const list = athletes.filter((a) => a.active && (!group || a.group_id === group)).sort((a, b) => fullName(a).localeCompare(fullName(b)))
  const filled = list.filter((a) => parseValue(values[a.id] ?? '') != null)

  const submit = async () => {
    if (!test || filled.length === 0) return
    setBusy(true)
    try {
      await saveMany('test_results', filled.map((a) => ({ athlete_id: a.id, test_id: test.id, date, value: parseValue(values[a.id])!, notes: notes[a.id] ?? '' })))
      nav(`/tests/${test.id}`)
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Link to="/tests" className="muted small">← Tests</Link>
      <h1>Saisir des résultats</h1>
      <div className="card form">
        <Field label="Test">
          <select value={testId} onChange={(e) => setTestId(e.target.value)}>{tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </Field>
        <div className="grid2">
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Groupe">
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Tous</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
        </div>
        {test?.description && <p className="tiny muted">{test.description}</p>}
      </div>
      {test && (
        <div className="card entry-list">
          {list.length === 0 && <p className="muted">Aucun athlète dans ce groupe.</p>}
          {list.map((a) => {
            const prev = summarize(test, test_results.filter((r) => r.athlete_id === a.id))
            return (
              <div key={a.id} className="entry-row">
                <div className="entry-name">
                  <strong>{fullName(a)}</strong>
                  {prev && <div className="tiny muted">dernier : {formatValue(prev.last.value, test.unit)}</div>}
                </div>
                <input className="entry-value" inputMode="decimal" enterKeyHint="next" placeholder={test.unit}
                  value={values[a.id] ?? ''} onChange={(e) => setValues({ ...values, [a.id]: e.target.value })} />
                <input className="entry-note" placeholder="note" value={notes[a.id] ?? ''} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} />
              </div>
            )
          })}
        </div>
      )}
      <div className="sticky-actions">
        <button className="btn primary block" onClick={submit} disabled={busy || filled.length === 0}>
          Enregistrer {filled.length > 0 && `${filled.length} résultat(s)`}
        </button>
      </div>
    </div>
  )
}

/** Tableau du groupe : dernier résultat de chaque athlète pour chaque test */
export function TestMatrix() {
  const { tests, test_results, athletes, groups } = useData()
  const [params] = useSearchParams()
  const imported = params.get('import')?.split('-').map(Number)
  const [group, setGroup] = useState(imported ? '' : groups[0]?.id ?? '')
  const ordered = CATS.flatMap((c) => tests.filter((t) => t.category === c))
  const cols = [...ordered, ...tests.filter((t) => !ordered.includes(t))]
  const list = athletes.filter((a) => a.active && (!group || a.group_id === group)).sort((a, b) => fullName(a).localeCompare(fullName(b)))
  const cell = (aid: string, t: TestDef) => summarize(t, test_results.filter((r) => r.athlete_id === aid))
  // Meilleur résultat du groupe par test (dernier résultat de chacun)
  const best = new Map(cols.map((t) => {
    const vals = list.map((a) => cell(a.id, t)?.last.value).filter((v): v is number => v != null)
    return [t.id, vals.length ? (t.higher_is_better ? Math.max(...vals) : Math.min(...vals)) : null]
  }))

  return (
    <div>
      <Link to="/tests" className="muted small">← Tests</Link>
      <h1>Tableau du groupe</h1>
      {imported && (
        <div className="alert info">
          ✅ Import terminé : {imported[0]} résultat(s) ajouté(s){imported[4] ? ` (en remplacement de ${imported[4]} ancien(s))` : ''}{imported[3] ? `, ${imported[3]} mis à jour` : ''}, {imported[1]} bilan(s), {imported[2]} nouvelle(s) fiche(s).
        </div>
      )}
      <div className="row gap filters">
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Tous les groupes</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      {cols.length === 0 || list.length === 0 ? <Empty>Rien à afficher.</Empty> : (
        <div className="matrix-wrap card">
          <table className="matrix">
            <thead>
              <tr>
                <th>Athlète</th>
                {cols.map((t) => <th key={t.id}><Link to={`/tests/${t.id}`}>{t.name}</Link><div className="tiny muted">{t.unit}</div></th>)}
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <th><Link to={`/athletes/${a.id}`}>{a.first_name} {a.last_name.slice(0, 1)}.</Link><div className="tiny muted">{a.events}</div></th>
                  {cols.map((t) => {
                    const s = cell(a.id, t)
                    if (!s) return <td key={t.id} className="muted">–</td>
                    const top = best.get(t.id) === s.last.value && list.length > 1
                    return (
                      <td key={t.id} className={top ? 'top' : ''} title={formatShort(s.last.date)}>
                        {formatValue(s.last.value, t.unit === 's' && s.last.value >= 60 ? 's' : '') /* unité dans l'en-tête */}
                        {s.trend !== 0 && <span className={s.trend > 0 ? 'up' : 'down'}>{s.trend > 0 ? ' ▲' : ' ▼'}</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="tiny muted">Dernier résultat de chacun · en couleur : meilleur du groupe · ▲▼ progression depuis le test précédent</p>
    </div>
  )
}
