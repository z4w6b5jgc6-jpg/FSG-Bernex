import { useMemo, useState } from 'react'
import { BackLink } from '../components/BackLink'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import { exportSheets } from '../lib/exportSessions'
import { downloadXlsx, writeXlsx } from '../lib/xlsx'
import { formatDate, parseISODate, todayISO } from '../lib/utils'

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** Planning → fichier Excel (plan une ligne par jour + détail une ligne par exercice) */
export function ExportSessions() {
  const { assignments, sessions, athletes, groups } = useData()
  const dates = assignments.map((a) => a.date).sort()
  const [from, setFrom] = useState(dates.find((d) => d >= todayISO()) ?? dates[0] ?? todayISO())
  const [to, setTo] = useState(dates[dates.length - 1] ?? todayISO())
  const [day, setDay] = useState(-1) // -1 = tous les jours
  const [q, setQ] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const list = useMemo(() => assignments.filter((a) => {
    if (a.date < from || a.date > to) return false
    if (day >= 0 && parseISODate(a.date).getDay() !== day) return false
    const t = sessions.find((s) => s.id === a.session_id)?.title ?? ''
    return !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase())
  }), [assignments, sessions, from, to, day, q])
  const nDays = new Set(list.map((a) => a.date)).size

  const run = () => {
    setErr(null)
    try {
      const what = day >= 0 ? `du ${DAYS[day]}` : ''
      const title = `Séances ${what} – ${formatDate(from, { day: 'numeric', month: 'long', year: 'numeric' })} au ${formatDate(to, { day: 'numeric', month: 'long', year: 'numeric' })}`.replace('  ', ' ')
      const name = `Seances${day >= 0 ? '_' + DAYS[day] : ''}_${from}_${to}.xlsx`
      downloadXlsx(name, writeXlsx(exportSheets(list, { sessions, athletes, groups }, title)))
    } catch (e) {
      setErr(String(e))
    }
  }

  return (
    <div>
      <BackLink to="/planning" label="Planning" />
      <h1>Exporter en Excel</h1>
      <div className="card form">
        <p className="small">
          Le fichier a deux onglets : <b>Plan</b> (une ligne par jour, une colonne par partie de séance, les groupes séparés comme dans ton plan)
          et <b>Détail</b> (une ligne par exercice, réimportable dans l’app).
        </p>
        <div className="grid2">
          <Field label="Du"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Au"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div className="grid2">
          <Field label="Jour">
            <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
              <option value={-1}>Tous les jours</option>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{DAYS[d][0].toUpperCase() + DAYS[d].slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Titre contient (facultatif)"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lundi, Longueur…" /></Field>
        </div>
        <p className="small"><b>{list.length}</b> séance(s) planifiée(s) sur <b>{nDays}</b> jour(s).</p>
        {err && <div className="alert warn">{err}</div>}
        <button className="btn primary block" disabled={list.length === 0} onClick={run}>📥 Télécharger le fichier Excel</button>
        <p className="tiny muted">Sur iPad : le fichier s’ouvre en aperçu, touche Partager ⬆️ puis « Enregistrer dans Fichiers » ou ouvre-le avec Excel / Numbers.</p>
      </div>
    </div>
  )
}
