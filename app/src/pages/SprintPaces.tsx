import { useState } from 'react'
import { BackLink } from '../components/BackLink'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { Empty } from '../components/ui'
import { best40, formatSprint, targetTime } from '../lib/sprint'
import { formatShort, fullName } from '../lib/utils'

const PCTS = [100, 90, 80, 70]
const DISTANCES = [80, 90, 100, 110, 120, 150, 200, 250, 300]
const KEY = 'athle-sprint-paces'

/** Tableau des allures sprint du groupe : temps à 100 / 90 / 80 / 70 % d'après le meilleur 40 m départ arrêté */
export function SprintPaces() {
  const { athletes, groups, tests, test_results } = useData()
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as { pct?: number; group?: string } } catch { return {} } })()
  const [pct, setPctState] = useState(saved.pct ?? 100)
  const [group, setGroupState] = useState(saved.group ?? groups[0]?.id ?? '')
  const remember = (p: { pct?: number; group?: string }) => { try { localStorage.setItem(KEY, JSON.stringify({ pct, group, ...p })) } catch { /* ignore */ } }
  const setPct = (v: number) => { setPctState(v); remember({ pct: v }) }
  const setGroup = (v: string) => { setGroupState(v); remember({ group: v }) }

  const rows = athletes
    .filter((a) => a.active && (!group || a.group_id === group))
    .map((a) => ({ a, ref: best40(tests, test_results.filter((r) => r.athlete_id === a.id)) }))
    .sort((x, y) => (x.ref && y.ref ? x.ref.seconds - y.ref.seconds : x.ref ? -1 : y.ref ? 1 : fullName(x.a).localeCompare(fullName(y.a))))
  const withRef = rows.filter((r) => r.ref)

  return (
    <div className="sprint-paces">
      <BackLink to="/tests" label="Tests" />
      <div className="row between wrap">
        <h1>Allures sprint</h1>
        <button className="btn small no-print" onClick={() => window.print()}>Imprimer</button>
      </div>
      <p className="small muted">
        Temps à viser selon le <b>meilleur 40 m départ arrêté</b> de chaque athlète, d’après le tableau d’équivalences « Sprint » (S. Charlet).
        {pct < 100 && <> À {pct} % de la vitesse : temps à 100 % ÷ {(pct / 100).toLocaleString('fr-CH')}.</>}
      </p>
      <div className="row gap wrap filters no-print">
        <div className="seg">
          {PCTS.map((p) => <button key={p} className={p === pct ? 'on' : ''} onClick={() => setPct(p)}>{p} %</button>)}
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Tous les groupes</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <h2 className="print-only">Allures à {pct} % · {groups.find((g) => g.id === group)?.name ?? 'tous les groupes'}</h2>

      {withRef.length === 0 ? (
        <Empty>Aucun 40 m départ arrêté enregistré pour ce groupe. Saisis-le dans Tests → Saisir des résultats.</Empty>
      ) : (
        <div className="card matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th>Athlète<div className="tiny muted">40 m · niveau</div></th>
                {DISTANCES.map((d) => <th key={d}>{d} m</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, ref }) => (
                <tr key={a.id} className={ref ? '' : 'muted'}>
                  <th>
                    <Link to={`/athletes/${a.id}`}>{fullName(a)}</Link>
                    <div className="tiny muted">{ref ? `${formatSprint(ref.seconds)} · niv. ${ref.level.toLocaleString('fr-CH', { maximumFractionDigits: 1 })} · ${formatShort(ref.date)}` : 'pas de 40 m'}</div>
                  </th>
                  {DISTANCES.map((d) => <td key={d}>{ref ? formatSprint(targetTime(ref.level, d, pct)!, 1) : '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="tiny muted">Temps avec départ (debout / accroupi). Sur un départ lancé, l’athlète sera plus rapide. Estimations au dixième, comme le tableau.</p>
    </div>
  )
}
