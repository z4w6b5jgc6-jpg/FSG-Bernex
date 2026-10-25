import type { PersonalRecord, TestDef, TestResult } from '../types'
import { formatSprint, sprintReference, timeAt } from '../lib/sprint'
import { formatShort } from '../lib/utils'

const SHOWN = [30, 40, 50, 60, 80, 100, 120, 150, 200, 300]

/** Temps probables de 30 à 300 m d'après le meilleur résultat avec départ (tableau d'équivalences) */
export function SprintEquivalence({ tests, results, records, title = 'Équivalences sprint' }: { tests: TestDef[]; results: TestResult[]; records: PersonalRecord[]; title?: string }) {
  const ref = sprintReference(tests, results, records)
  if (!ref) return null
  const lvl = ref.level.toLocaleString('fr-CH', { maximumFractionDigits: 1 })
  return (
    <section>
      <h2>{title}</h2>
      <div className="card form">
        <div className="small">
          D’après <b>{ref.source}</b> en <b>{formatSprint(ref.seconds)}</b> <span className="muted">({formatShort(ref.date)})</span> · niveau <b>{lvl}</b>
          {ref.level > 25 && <span className="muted"> (au-delà du tableau, estimation prolongée)</span>}
        </div>
        <div className="eq-grid">
          {SHOWN.map((d) => (
            <div key={d} className={`eq-cell ${d === ref.meters ? 'ref' : ''}`}>
              <span className="tiny muted">{d} m</span>
              <b>{d === ref.meters ? formatSprint(ref.seconds) : formatSprint(timeAt(ref.level, d)!, 1)}</b>
            </div>
          ))}
        </div>
        <p className="tiny muted">Temps probables avec départ, selon le tableau d’équivalences « Sprint » (S. Charlet). Une estimation, pas une prédiction : la technique et l’endurance de vitesse comptent sur les distances longues.</p>
      </div>
    </section>
  )
}
