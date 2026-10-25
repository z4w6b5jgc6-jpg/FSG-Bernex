import { useState } from 'react'
import type { TestDef, TestResult } from '../types'
import { formatValue, summarize, type TestSummary } from '../lib/tests'
import { formatShort } from '../lib/utils'
import { Modal } from './ui'

const FAMILIES: { name: string }[] = [
  { name: 'Vitesse' },
  { name: 'Bondissement' },
  { name: 'Endurance' },
  { name: 'Lancers' },
  { name: 'Explosivité' },
  { name: 'Force' },
  { name: 'Mobilité' },
  { name: 'Technique' },
  { name: 'Autre' },
]

/** Valeur seule (sans unité), unité affichée à part en plus petit */
function valueParts(v: number, unit: string): [string, string] {
  const full = formatValue(v, unit)
  return unit && full.endsWith(` ${unit}`) ? [full.slice(0, -unit.length - 1), unit] : [full, '']
}

function trend(s: TestSummary): { text: string; good: boolean } | null {
  if (!s.previous || s.previous.value === s.last.value) return null
  const diff = Math.abs(s.last.value - s.previous.value).toLocaleString('fr-CH', { maximumFractionDigits: 2 })
  return { text: `${diff}${s.test.unit ? ` ${s.test.unit}` : ''}`, good: s.trend > 0 }
}

/** Points de la courbe, orientés pour que « mieux » soit toujours vers le haut */
function points(s: TestSummary, w: number, h: number, pad: number) {
  const vals = s.results.map((r) => r.value)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  return s.results.map((r, i) => {
    const x = s.results.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (s.results.length - 1)
    const norm = (r.value - min) / span
    const up = s.test.higher_is_better ? norm : 1 - norm
    const y = max === min ? h / 2 : h - pad - up * (h - 2 * pad)
    return { x, y, r }
  })
}

function Sparkline({ s }: { s: TestSummary }) {
  if (s.results.length < 2) return null
  const pts = points(s, 140, 32, 5)
  const last = pts[pts.length - 1]
  return (
    <svg className="spark" viewBox="0 0 140 32" aria-hidden>
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="4" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  )
}

/** Graphique d'évolution (dans la fenêtre d'historique) */
function HistoryChart({ s }: { s: TestSummary }) {
  const W = 320, H = 150, P = 26
  const pts = points(s, W, H, P)
  const [active, setActive] = useState<number | null>(null)
  // Étiquettes sélectives : premier, dernier et meilleur résultat
  const labelled = new Set([0, pts.length - 1, s.results.indexOf(s.best)])
  return (
    <svg className="history-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Évolution ${s.test.name}`}>
      <line x1={P / 2} x2={W - P / 2} y1={H - 12} y2={H - 12} stroke="var(--border)" strokeWidth="1" />
      {pts.length > 1 && (
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {pts.map((p, i) => (
        <g key={p.r.id} onClick={() => setActive(active === i ? null : i)} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} style={{ cursor: 'pointer' }}>
          <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
          <circle cx={p.x} cy={p.y} r={p.r === s.best ? 6 : 4.5} fill={p.r === s.best ? 'var(--club-yellow)' : 'var(--primary)'} stroke="var(--surface)" strokeWidth="2" />
          {(labelled.has(i) || active === i) && (
            <text x={p.x} y={p.y - 11} textAnchor="middle" className="hc-value">{formatValue(p.r.value, '')}</text>
          )}
          <text x={p.x} y={H - 1} textAnchor="middle" className="hc-date">{formatShort(p.r.date).split(' ').slice(1).join(' ')}</text>
        </g>
      ))}
    </svg>
  )
}

/** Résultats de tests d'un athlète : une tuile par test (meilleur essai, progression, record, évolution) */
export function TestResults({ tests, results, onDelete }: { tests: TestDef[]; results: TestResult[]; onDelete?: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const summaries = tests.map((t) => summarize(t, results)).filter((s): s is TestSummary => s != null)
  if (summaries.length === 0) return <p className="muted small">Pas encore de résultat de test.</p>
  const families = [...FAMILIES, ...[...new Set(summaries.map((s) => s.test.category))].filter((c) => !FAMILIES.some((f) => f.name === c)).map((name) => ({ name }))]
  const current = summaries.find((s) => s.test.id === open)

  return (
    <div className="test-families">
      {families.map((f) => {
        const list = summaries.filter((s) => s.test.category === f.name)
        if (list.length === 0) return null
        return (
          <div key={f.name}>
            <div className="family-title">{f.name}</div>
            <div className="test-tiles">
              {list.map((s) => {
                const [v, unit] = valueParts(s.last.value, s.test.unit)
                const t = trend(s)
                const record = s.results.length > 1 && s.last === s.best
                return (
                  <button key={s.test.id} className={`test-tile ${record ? 'record' : ''}`} onClick={() => setOpen(s.test.id)}>
                    <span className="tt-name">{s.test.name}</span>
                    <span className="tt-value">{v}<small>{unit}</small></span>
                    <span className="tt-meta">
                      {t ? <span className={`tt-trend ${t.good ? 'good' : 'bad'}`}>{t.good ? '▲' : '▼'} {t.text}</span> : <span className="muted">{formatShort(s.last.date)}</span>}
                      {s.results.length === 1 && <span className="muted">· 1er test</span>}
                      {record && <span className="tt-record">Record</span>}
                    </span>
                    <Sparkline s={s} />
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {current && (
        <Modal title={current.test.name} onClose={() => setOpen(null)}>
          <div className="history">
            <div className="history-head">
              <div><span className="tiny muted">Dernier</span><b>{formatValue(current.last.value, current.test.unit)}</b></div>
              <div><span className="tiny muted">Meilleur</span><b>{formatValue(current.best.value, current.test.unit)}</b></div>
              <div><span className="tiny muted">Tests</span><b>{current.results.length}</b></div>
            </div>
            <HistoryChart s={current} />
            <p className="tiny muted center">{current.test.higher_is_better ? 'Plus haut = plus loin / plus vite' : 'Plus haut = plus rapide'} · point jaune = meilleur résultat</p>
            <ul className="plain rows">
              {[...current.results].reverse().map((r) => (
                <li key={r.id} className="row between">
                  <span>{formatShort(r.date)}{r.notes && <span className="muted small"> · {r.notes}</span>}</span>
                  <span className="row gap">
                    <b>{formatValue(r.value, current.test.unit)}</b>{r === current.best && ''}
                    {onDelete && (
                      <button className="btn ghost icon small danger" aria-label="Supprimer" onClick={() => { if (confirm('Supprimer ce résultat ?')) { onDelete(r.id); if (current.results.length === 1) setOpen(null) } }}>✕</button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {current.test.description && <p className="tiny muted">{current.test.description}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
