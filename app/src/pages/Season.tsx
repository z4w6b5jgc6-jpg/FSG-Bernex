import { useState } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import { api } from '../api'
import { useData } from '../lib/data'
import { parseMacro, phaseTone, weekOf, type MacroWeek } from '../lib/macro'
import type { Cell } from '../lib/importResults'
import { errorMessage, formatDate, todayISO } from '../lib/utils'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const dots = (n: number | null) => n == null ? '—' : '●'.repeat(Math.round(n)) + '○'.repeat(Math.max(0, 5 - Math.round(n)))

/** Saison : la macro-planification du coach, semaine par semaine (phase, charge, vacances, compétitions) */
export function Season() {
  const { me, refreshMe } = useData()
  const plan = me?.settings?.macro
  const today = todayISO()
  const current = weekOf(plan, today)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null)

  const onFile = async (file: File) => {
    setBusy(true); setErr(null)
    try {
      const sheets = (await readXlsxFile(file)).map((s) => ({ name: s.sheet, rows: s.data as Cell[][] }))
      const parsed = parseMacro(sheets, file.name)
      if (!parsed) throw new Error('Format non reconnu : il faut une feuille avec les colonnes « Sem. », « Lundi » et « Phase ».')
      await api.saveSettings({ ...me?.settings, macro: parsed })
      await refreshMe()
    } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }

  const upload = (
    <label className="btn small">
      {busy ? 'Import…' : plan ? 'Remplacer' : 'Importer la macro (Excel)'}
      <input type="file" accept=".xlsx" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </label>
  )
  if (!plan) return (
    <div>
      <h1>Saison</h1>
      <div className="card form">
        <p>Importe ta macro-planification : une ligne par semaine avec « Sem. », « Lundi », « Phase », « Charge », et si tu veux « Volume », « Intensité », vacances, compétitions et ajustements.</p>
        {upload}
        {err && <div className="alert warn small">{err}</div>}
      </div>
    </div>
  )

  // blocs consécutifs de même phase (style tableau Monday)
  const groups: { phase: string; weeks: MacroWeek[] }[] = []
  for (const w of plan.weeks) {
    const last = groups[groups.length - 1]
    if (last && last.phase.split(/\s[–-]\s|\s\(/)[0] === w.phase.split(/\s[–-]\s|\s\(/)[0]) last.weeks.push(w)
    else groups.push({ phase: w.phase, weeks: [w] })
  }
  const W = (w: MacroWeek) => (
    <div key={w.monday}>
      <button type="button" className={`row-item ${w === current ? 'is-current' : ''}`} onClick={() => setOpen(open === w.monday ? null : w.monday)} aria-expanded={open === w.monday}>
        <span className="day-chip"><b>S{w.week}</b><small>{formatDate(w.monday, { day: 'numeric', month: 'short' })}</small></span>
        <span className="row-main">{w.phase}
          {(w.holiday || w.competition) && <span className="row-tags">{w.competition && <span className="status red">{w.competition.split(/\s[–-]\s/)[0]}</span>}{w.holiday && <span className="status grey">{w.holiday}</span>}</span>}
        </span>
        <span className="charge-cell"><b>{w.charge ?? '—'}</b><i style={{ width: `${w.charge ?? 0}%` }} className={phaseTone(w.phase)} /></span>
      </button>
      {open === w.monday && (
        <div className="row-item week-detail">
          <p className="small">Volume <b>{dots(w.volume)}</b> · Intensité <b>{dots(w.intensity)}</b></p>
          {w.mondayNote && <p className="small"><b>Lundi :</b> {w.mondayNote}</p>}
          {w.wednesdayNote && <p className="small"><b>Mercredi :</b> {w.wednesdayNote}</p>}
          {w.note && <p className="small muted">{w.note}</p>}
          {w.competition && <p className="small"><b>Compétition :</b> {w.competition}</p>}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="row between"><h1>Saison</h1>{upload}</div>
      {err && <div className="alert warn small">{err}</div>}

      {current && (
        <div className="session-hero season-hero">
          <span className={`status ${phaseTone(current.phase)}`}>Semaine {current.week}</span>
          <h2>{current.phase}</h2>
          <div className="hero-stats">
            <span><b>{current.charge ?? '—'}</b> charge</span>
            <span><b>{current.volume ?? '—'}/5</b> volume</span>
            <span><b>{current.intensity ?? '—'}/5</b> intensité</span>
          </div>
          {(current.mondayNote || current.wednesdayNote) && <p className="tiny">{[current.mondayNote && `Lundi : ${current.mondayNote}`, current.wednesdayNote && `Mercredi : ${current.wednesdayNote}`].filter(Boolean).join(' · ')}</p>}
        </div>
      )}

      <div className="charge-chart" role="img" aria-label="Charge par semaine">
        {plan.weeks.map((w) => (
          <button key={w.monday} type="button" title={`S${w.week} · ${w.phase} · ${w.charge ?? '—'}`} onClick={() => setOpen(w.monday)}
            className={`${w === current ? 'is-current' : ''} ${w.holiday ? 'is-holiday' : ''}`}>
            {w.competition && <em>▲</em>}
            <i className={phaseTone(w.phase)} style={{ height: `${Math.max(4, w.charge ?? 0)}%` }} />
            <small>{w.week}</small>
          </button>
        ))}
      </div>
      <p className="tiny muted center">Charge par semaine · ▲ compétition · fond clair = vacances</p>

      {groups.map((g, i) => (
        <section key={i}>
          <h2 className="section-title"><span className={`group-dot ${phaseTone(g.phase)}`} />{g.phase.split(/\s[–-]\s|\s\(/)[0]} <span className="count">{g.weeks.length} sem.</span></h2>
          <div className="rows">{g.weeks.map(W)}</div>
        </section>
      ))}

      {plan.micro.length > 0 && (
        <details className="section-fold">
          <summary>Semaines types</summary>
          {plan.micro.map((m) => (
            <div key={m.phase} className="card">
              <b>{m.phase}</b>
              <ul className="plain micro-days">{m.days.map((d, i) => d && <li key={i}><span className="muted">{DAYS[i]}</span> {d}</li>)}</ul>
            </div>
          ))}
        </details>
      )}
      <p className="tiny muted">Importé le {formatDate(plan.imported, { day: 'numeric', month: 'long' })} · {plan.source}</p>
    </div>
  )
}
