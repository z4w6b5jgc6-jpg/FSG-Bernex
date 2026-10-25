import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { isMuscu, maxLifts } from '../lib/muscu'
import { summarize } from '../lib/tests'
import type { Athlete, PersonalRecord } from '../types'
import { formatShort, todayISO } from '../lib/utils'
import { Icon } from './Icon'
import { MuscuForm } from './MuscuForm'
import { RecordForm } from './RecordForm'
import { ResultForm } from './ResultForm'
import { TestResults } from './TestResults'

type Tab = 'tests' | 'records' | 'muscu'

/** Profil athlète : trois tuiles Tests / Records / Musculation, complétables par l'athlète et par le coach */
export function ProfileTiles({ athlete, coach }: { athlete: Athlete; coach: boolean }) {
  const { tests, test_results, records, remove } = useData()
  const [tab, setTab] = useState<Tab>('tests')
  const [addResult, setAddResult] = useState(false)
  const [editRecord, setEditRecord] = useState<Partial<PersonalRecord> | null>(null)
  const [editLift, setEditLift] = useState<Partial<PersonalRecord> | null>(null)

  const results = test_results.filter((r) => r.athlete_id === athlete.id)
  const mine = records.filter((r) => r.athlete_id === athlete.id)
  const perfs = mine.filter((r) => !isMuscu(r))
  const lifts = maxLifts(mine)
  const events = [...new Set(perfs.map((r) => r.event))]
  const summaries = tests.map((t) => summarize(t, results)).filter((s) => s != null)
  const topLift = lifts[0]

  const tiles: { id: Tab; icon: string; label: string; info: string }[] = [
    { id: 'tests', icon: 'chart', label: 'Tests', info: summaries.length ? `${summaries.length} test${summaries.length > 1 ? 's' : ''}` : 'Aucun' },
    { id: 'records', icon: 'trophy', label: 'Records', info: events.length ? `${events.length} épreuve${events.length > 1 ? 's' : ''}` : 'Aucun' },
    { id: 'muscu', icon: 'medal', label: 'Max muscu', info: topLift ? `${lifts.length} exercice${lifts.length > 1 ? 's' : ''}` : 'Aucune' },
  ]

  return (
    <section>
      <div className="ptiles" role="tablist">
        {tiles.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`ptile ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={20} />
            <b>{t.label}</b>
            <span>{t.info}</span>
          </button>
        ))}
      </div>

      {tab === 'tests' && (
        <div className="ppanel">
          <div className="row between"><h2>Tests</h2>{tests.length > 0 && <button className="btn small primary" onClick={() => setAddResult(true)}>+ Résultat</button>}</div>
          {tests.length === 0 ? (
            <p className="muted small">{coach ? <>Définis d’abord les tests dans <Link to="/tests">Tests physiques</Link>.</> : 'Ton coach n’a pas encore défini de tests.'}</p>
          ) : (
            <TestResults tests={tests} results={results} onDelete={(id) => confirm('Supprimer ce résultat ?') && remove('test_results', id)} />
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="ppanel">
          <div className="row between"><h2>Records</h2><button className="btn small primary" onClick={() => setEditRecord({ date: todayISO(), event: athlete.events.split(',')[0]?.trim() ?? '' })}>+ Record</button></div>
          {events.length === 0 ? <p className="muted small">Ajoute les meilleures perfs (chrono, distance, hauteur).</p> : (
            <ul className="plain rows">
              {events.map((ev) => {
                const list = perfs.filter((r) => r.event === ev).sort((a, b) => b.date.localeCompare(a.date))
                return (
                  <li key={ev}>
                    <div className="row between"><b>{ev}</b><span className="record-mark">{list[0].mark}</span></div>
                    {list.map((r) => (
                      <div key={r.id} className="row between tiny muted">
                        <button className="link left" onClick={() => setEditRecord(r)}>{r.mark} · {formatShort(r.date)}{r.competition && ` · ${r.competition}`}</button>
                        <button className="btn ghost icon small danger" aria-label="Supprimer" onClick={() => confirm('Supprimer ce record ?') && remove('records', r.id)}>✕</button>
                      </div>
                    ))}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'muscu' && (
        <div className="ppanel">
          <div className="row between"><h2>Max muscu</h2><button className="btn small primary" onClick={() => setEditLift({})}>+ Charge</button></div>
          {lifts.length === 0 ? <p className="muted small">Ajoute les charges maximales (squat, développé couché…).</p> : (
            <>
              <div className="lift-grid">
                {lifts.map((l) => (
                  <button key={l.event} className="lift" onClick={() => setEditLift(l.best)}>
                    <span className="tiny muted">{l.event}</span>
                    <b>{l.best.mark}</b>
                    <span className="tiny muted">{formatShort(l.best.date)}</span>
                  </button>
                ))}
              </div>
              <details className="fold">
                <summary className="small">Historique</summary>
                <ul className="plain rows small">
                  {lifts.flatMap((l) => l.all).sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                    <li key={r.id} className="row between">
                      <button className="link left" onClick={() => setEditLift(r)}>{r.event} · <b>{r.mark}</b> <span className="muted">· {formatShort(r.date)}</span></button>
                      <button className="btn ghost icon small danger" aria-label="Supprimer" onClick={() => confirm('Supprimer cette charge ?') && remove('records', r.id)}>✕</button>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>
      )}

      {addResult && <ResultForm athleteId={athlete.id} onClose={() => setAddResult(false)} />}
      {editRecord && <RecordForm initial={editRecord} athleteId={athlete.id} onClose={() => setEditRecord(null)} />}
      {editLift && <MuscuForm initial={editLift} athleteId={athlete.id} onClose={() => setEditLift(null)} />}
    </section>
  )
}

