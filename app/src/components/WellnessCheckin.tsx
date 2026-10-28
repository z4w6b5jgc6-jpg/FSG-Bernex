import { Link } from 'react-router-dom'
import { healthConsent } from '../lib/confidentiality'
import { useState } from 'react'
import { useData } from '../lib/data'
import type { Wellness } from '../types'
import { errorMessage, todayISO } from '../lib/utils'
import { Scale } from './ui'

export const ENERGY = { 1: 'Vide', 2: 'Faible', 3: 'Moyenne', 4: 'Bonne', 5: 'Pleine' } as Record<number, string>
export const SORENESS = { 1: 'Aucune', 2: 'Légères', 3: 'Moyennes', 4: 'Fortes', 5: 'Très fortes' } as Record<number, string>
export const STRESS = { 1: 'Aucun', 2: 'Léger', 3: 'Moyen', 4: 'Élevé', 5: 'Très élevé' } as Record<number, string>
export const SLEEPQ = { 1: 'Très mauvaise', 2: 'Mauvaise', 3: 'Moyenne', 4: 'Bonne', 5: 'Très bonne' } as Record<number, string>

const SLEEP_OPTIONS = [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

/** Check-in bien-être du jour (30 secondes) */
export function WellnessCheckin({ athleteId }: { athleteId: string }) {
  const { wellness, save, me, privacy_acceptances } = useData()
  const today = todayISO()
  const existing = wellness.find((w) => w.athlete_id === athleteId && w.date === today)
  const [editing, setEditing] = useState(!existing)
  const [w, setW] = useState<Partial<Wellness>>(existing ?? { sleep_hours: null, sleep_quality: null, energy: null, soreness: null, stress: null })
  const [busy, setBusy] = useState(false)
  const set = (p: Partial<Wellness>) => setW({ ...w, ...p })

  if (!healthConsent(athleteId, privacy_acceptances, me?.settings?.privacy)) return <div className="card"><b>Suivi de forme facultatif</b><p className="small muted">Consulte l’information sur tes données et choisis si tu souhaites activer ce suivi.</p><Link className="btn" to="/confidentialite">Information et choix</Link></div>

  if (existing && !editing) {
    return (
      <div className="card checkin done">
        <div className="row between">
          <strong>Check-in du jour</strong>
          <button className="btn ghost small" onClick={() => { setW(existing); setEditing(true) }}>Modifier</button>
        </div>
        <div className="scores">
          {existing.sleep_hours != null && <span className="pill">{existing.sleep_hours} h</span>}
          {existing.energy != null && <span className="pill">Énergie : {ENERGY[existing.energy].toLowerCase()}</span>}
          {existing.soreness != null && <span className={`pill ${existing.soreness >= 4 ? 'warn' : ''}`}>Courbatures : {SORENESS[existing.soreness].toLowerCase()}</span>}
          {existing.stress != null && <span className={`pill ${existing.stress >= 4 ? 'warn' : ''}`}>Stress : {STRESS[existing.stress].toLowerCase()}</span>}
        </div>
      </div>
    )
  }

  const submit = async () => {
    setBusy(true)
    try {
      await save('wellness', { ...w, id: existing?.id, athlete_id: athleteId, date: today })
      setEditing(false)
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card checkin form">
      <div>
        <strong>Comment tu te sens aujourd’hui ?</strong>
        <div className="muted small">30 secondes pour aider ton coach à adapter tes entraînements.</div>
      </div>
      <div className="field">
        <span className="field-label">Tu as dormi combien d’heures ?</span>
        <div className="scale">
          {SLEEP_OPTIONS.map((h) => (
            <button key={h} type="button" className={`scale-btn ${w.sleep_hours === h ? 'active' : ''}`} onClick={() => set({ sleep_hours: h })}>
              {h === 5 ? '≤5' : h === 10 ? '10+' : String(h).replace('.5', '½')}
            </button>
          ))}
        </div>
      </div>
      <div className="field"><span className="field-label">Qualité du sommeil (1 = très mauvaise, 5 = très bonne)</span><Scale min={1} max={5} value={w.sleep_quality ?? null} onChange={(v) => set({ sleep_quality: v })} labels={SLEEPQ} /></div>
      <div className="field"><span className="field-label">Énergie (1 = vide, 5 = pleine)</span><Scale min={1} max={5} value={w.energy ?? null} onChange={(v) => set({ energy: v })} labels={ENERGY} /></div>
      <div className="field"><span className="field-label">Courbatures / douleurs (1 = aucune, 5 = très fortes)</span><Scale min={1} max={5} value={w.soreness ?? null} onChange={(v) => set({ soreness: v })} labels={SORENESS} /></div>
      <div className="field"><span className="field-label">Stress, école, vie perso (1 = aucun, 5 = très élevé)</span><Scale min={1} max={5} value={w.stress ?? null} onChange={(v) => set({ stress: v })} labels={STRESS} /></div>
      <div className="row gap">
        <button className="btn primary" onClick={submit} disabled={busy || w.sleep_hours == null || w.energy == null}>Valider</button>
        {existing && <button className="btn ghost" onClick={() => setEditing(false)}>Annuler</button>}
      </div>
    </div>
  )
}
