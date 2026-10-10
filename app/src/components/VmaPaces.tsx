import type { TestDef, TestResult } from '../types'
import { ZONES, formatTime, latestVma, paceSeconds } from '../lib/vma'
import { formatShort } from '../lib/utils'

/** Tableau des allures d'entraînement à partir de la dernière VMA */
export function VmaPaces({ tests, results, title = 'Tes allures d’entraînement' }: { tests: TestDef[]; results: TestResult[]; title?: string }) {
  const vma = latestVma(tests, results)
  if (!vma) return null
  const v = vma.value
  return (
    <div className="card paces">
      <div className="row between">
        <strong>🏃 {title}</strong>
        <span className="tiny muted">VMA {v.toLocaleString('fr-CH')} km/h · {formatShort(vma.date)}</span>
      </div>
      <table className="table small">
        <thead>
          <tr><th></th><th className="right">km/h</th><th className="right">200 m</th><th className="right">400 m</th><th className="right">1000 m</th></tr>
        </thead>
        <tbody>
          {ZONES.map((z) => (
            <tr key={z.pct}>
              <td><b>{z.pct} %</b><div className="tiny muted">{z.label}</div></td>
              <td className="right">{((v * z.pct) / 100).toLocaleString('fr-CH', { maximumFractionDigits: 1 })}</td>
              <td className="right">{formatTime(paceSeconds(v, z.pct, 200))}</td>
              <td className="right">{formatTime(paceSeconds(v, z.pct, 400))}</td>
              <td className="right">{formatTime(paceSeconds(v, z.pct, 1000))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
