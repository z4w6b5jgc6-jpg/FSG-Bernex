import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { Field, Modal } from './ui'
import type { TestDef, TestReport, TestResult } from '../types'
import { METHOD, computeIndicators, fmt } from '../lib/indicators'
import { errorMessage, formatDate, todayISO } from '../lib/utils'

/** Indicateurs de lecture (méthode du classeur) : vitesse, essais, rapports de transition */
export function IndicatorsPanel({ tests, results }: { tests: TestDef[]; results: TestResult[] }) {
  const ind = computeIndicators(tests, results)
  if (!ind) return null
  const ratio = (label: string, v: number | null, threshold: number) => (
    <div className="ind-row">
      <span>{label}</span>
      {v == null ? <span className="muted">–</span> : (
        <span className={v < threshold ? 'warn-text' : 'ok-text'}>{fmt(v)} <span className="tiny muted">/ {fmt(threshold)}</span></span>
      )}
    </div>
  )
  return (
    <div className="card indicators">
      <strong>Lecture des tests</strong>
      {ind.sprint ? (
        <div className="ind-row">
          <span>20 m lancé · vitesse</span>
          <span><b>{fmt(ind.sprint.kmh, 1)} km/h</b> <span className="tiny muted">({fmt(ind.sprint.best)} s)</span></span>
        </div>
      ) : <div className="ind-row"><span>20 m lancé</span><span className="warn-text">à mesurer</span></div>}
      {ind.sprint && (
        <div className="ind-row">
          <span>Essais</span>
          <span className={ind.sprint.alert === 'Essais cohérents' ? 'ok-text' : 'warn-text'}>
            {ind.sprint.alert}{ind.sprint.gap != null && ` (${fmt(ind.sprint.gap * 100, 1)} %)`}
          </span>
        </div>
      )}
      {ratio('Transition mono → triple', ind.ratios.monoTriple, METHOD.monoToTriple)}
      {ratio('Maintien triple → penta', ind.ratios.triplePenta, METHOD.tripleToPenta)}
      {ratio('Maintien penta → déca', ind.ratios.pentaDeca, METHOD.pentaToDeca)}
      <div className="ind-reading">
        <div><span className="muted small">Lecture :</span> {ind.bondsReading}</div>
        <div><span className="muted small">Axe suggéré :</span> <b>{ind.focus}</b></div>
      </div>
      <p className="tiny muted">
        Rapports = distance moyenne par contact de la séquence longue ÷ séquence précédente (seuils de ta méthode).
        Repères de lecture, à comparer d’abord à l’athlète lui-même.
      </p>
    </div>
  )
}

/** Bilan de tests : lisible par l'athlète, modifiable par l'entraîneur */
export function ReportCard({ report, editable }: { report: TestReport; editable?: boolean }) {
  const { remove } = useData()
  const [edit, setEdit] = useState(false)
  return (
    <div className="card report">
      <div className="row between">
        <strong>📝 {report.title}</strong>
        <span className="tiny muted">{formatDate(report.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
      {report.message && <p className="report-message">{report.message}</p>}
      {report.strengths && <div className="report-line"><span>💪 Points forts</span>{report.strengths}</div>}
      {report.priority && <div className="report-line"><span>🎯 Axe prioritaire</span>{report.priority}</div>}
      {report.training && <div className="report-line"><span>🏋️ Entraînement</span>{report.training}</div>}
      {editable && (
        <div className="row gap">
          <button className="btn small ghost" onClick={() => setEdit(true)}>Modifier</button>
          <button className="btn small ghost danger" onClick={() => confirm('Supprimer ce bilan ?') && remove('test_reports', report.id)}>Supprimer</button>
        </div>
      )}
      {edit && <ReportForm initial={report} athleteId={report.athlete_id} onClose={() => setEdit(false)} />}
    </div>
  )
}

export function ReportForm({ initial, athleteId, onClose }: { initial: Partial<TestReport>; athleteId: string; onClose: () => void }) {
  const { save } = useData()
  const [r, setR] = useState<Partial<TestReport>>({ title: 'Bilan des tests', date: todayISO(), ...initial })
  const set = (p: Partial<TestReport>) => setR({ ...r, ...p })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await save('test_reports', {
        id: r.id, athlete_id: athleteId, date: r.date, title: r.title, strengths: r.strengths ?? '',
        priority: r.priority ?? '', training: r.training ?? '', message: r.message ?? '',
      })
      onClose()
    } catch (err) {
      alert(errorMessage(err))
    }
  }
  return (
    <Modal title={r.id ? 'Modifier le bilan' : 'Nouveau bilan de tests'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="grid2">
          <Field label="Titre"><input value={r.title ?? ''} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Date"><input type="date" value={r.date ?? ''} onChange={(e) => set({ date: e.target.value })} /></Field>
        </div>
        <Field label="Message à l’athlète"><textarea rows={4} value={r.message ?? ''} onChange={(e) => set({ message: e.target.value })} placeholder="Tu… (visible par l’athlète)" /></Field>
        <Field label="Points forts"><input value={r.strengths ?? ''} onChange={(e) => set({ strengths: e.target.value })} /></Field>
        <Field label="Axe prioritaire"><input value={r.priority ?? ''} onChange={(e) => set({ priority: e.target.value })} /></Field>
        <Field label="Type d’entraînement"><textarea rows={2} value={r.training ?? ''} onChange={(e) => set({ training: e.target.value })} /></Field>
        <p className="tiny muted">Tout ce bilan est visible par l’athlète. Garde tes remarques privées dans les notes de suivi.</p>
        <div className="row gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  )
}
