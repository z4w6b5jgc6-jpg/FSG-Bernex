import type { TestDef, TestResult } from '../types'
import { formatValue, summarize, trendLabel } from '../lib/tests'
import { formatShort } from '../lib/utils'

/** Résultats de tests d'un athlète : dernier résultat, progression, meilleur, historique */
export function TestResults({ tests, results, onDelete }: { tests: TestDef[]; results: TestResult[]; onDelete?: (id: string) => void }) {
  const summaries = tests.map((t) => summarize(t, results)).filter((s) => s != null)
  if (summaries.length === 0) return <p className="muted small">Pas encore de résultat de test.</p>
  return (
    <div className="list">
      {summaries.map((s) => (
        <details key={s.test.id} className="card test-card">
          <summary>
            <div className="row between">
              <div>
                <strong>{s.test.name}</strong>
                <div className="tiny muted">{formatShort(s.last.date)} · meilleur : {formatValue(s.best.value, s.test.unit)}</div>
              </div>
              <div className="test-value">
                <b>{formatValue(s.last.value, s.test.unit)}</b>
                {s.previous && <span className={s.trend > 0 ? 'up' : s.trend < 0 ? 'down' : 'muted'}>{trendLabel(s)}</span>}
              </div>
            </div>
          </summary>
          <ul className="plain rows small">
            {[...s.results].reverse().map((r) => (
              <li key={r.id} className="row between">
                <span>{formatShort(r.date)}{r.notes && <span className="muted"> · {r.notes}</span>}</span>
                <span className="row gap">
                  <b>{formatValue(r.value, s.test.unit)}</b>
                  {onDelete && <button className="btn ghost icon small danger" onClick={() => confirm('Supprimer ce résultat ?') && onDelete(r.id)}>✕</button>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
