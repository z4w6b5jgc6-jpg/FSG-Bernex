import { useState } from 'react'
import { BackLink } from '../components/BackLink'
import { Field } from '../components/ui'
import { api } from '../api'
import { useData } from '../lib/data'
import { MONTHS, seasonRule, settings, venues } from '../lib/settings'
import { errorMessage } from '../lib/utils'

/** Réglages de l'espace : lieux, règle été / hiver, description du groupe pour l'assistant */
export function Settings() {
  const { refreshMe } = useData()
  const r = seasonRule()
  const [places, setPlaces] = useState(venues().join('\n'))
  const [summer, setSummer] = useState(r.summer)
  const [winter, setWinter] = useState(r.winter)
  const [from, setFrom] = useState(r.from)
  const [to, setTo] = useState(r.to)
  const [group, setGroup] = useState(settings().group ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const list = places.split('\n').map((p) => p.trim()).filter(Boolean)

  const run = async () => {
    setBusy(true)
    setMsg(null)
    try {
      await api.saveSettings({
        venues: list, summerVenue: list.includes(summer) ? summer : list[0], winterVenue: list.includes(winter) ? winter : list[1] ?? list[0],
        summerFrom: from, summerTo: to, group: group.trim(),
      })
      await refreshMe()
      setMsg('✓ Réglages enregistrés.')
    } catch (e) {
      setMsg(/set_club_settings|schema cache/i.test(errorMessage(e)) ? 'Il faut d’abord mettre la base à jour (#/base).' : errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const venueSelect = (v: string, set: (x: string) => void) => (
    <select value={v} onChange={(e) => set(e.target.value)}>{list.map((p) => <option key={p}>{p}</option>)}</select>
  )
  const monthSelect = (v: number, set: (x: number) => void) => (
    <select value={v} onChange={(e) => set(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
  )

  return (
    <div>
      <BackLink to="/" label="Accueil" />
      <h1>⚙️ Réglages de mon espace</h1>
      <p className="small muted">Propres à ton groupe : les autres groupes du club ont leurs propres réglages et ne voient rien du tien.</p>

      <section className="card form">
        <h2>Lieux d’entraînement</h2>
        <Field label="Un lieu par ligne"><textarea rows={3} value={places} onChange={(e) => setPlaces(e.target.value)} /></Field>
        {list.length > 0 && (
          <>
            <div className="grid2">
              <Field label="Lieu de la belle saison">{venueSelect(summer, setSummer)}</Field>
              <Field label="Lieu le reste de l’année">{venueSelect(winter, setWinter)}</Field>
            </div>
            <div className="grid2">
              <Field label="Belle saison : de">{monthSelect(from, setFrom)}</Field>
              <Field label="à (inclus)">{monthSelect(to, setTo)}</Field>
            </div>
            <p className="tiny muted">Le lieu est proposé automatiquement quand tu planifies ou importes des séances (modifiable à chaque fois).</p>
          </>
        )}
      </section>

      <section className="card form">
        <h2>Mon groupe, pour l’assistant</h2>
        <Field label="Âges, disciplines, niveau, habitudes d’entraînement">
          <textarea rows={4} value={group} onChange={(e) => setGroup(e.target.value)}
            placeholder="Ex. U14 (12-13 ans), multi-activités : courses, sauts, lancers, jeux ; 2 séances par semaine, mercredi et vendredi." />
        </Field>
        <p className="tiny muted">L’assistant et la lecture des plans s’en servent pour adapter leurs propositions. N’écris pas de noms d’athlètes.</p>
      </section>

      {msg && <div className="alert info small">{msg}</div>}
      <div className="sticky-actions">
        <button className="btn primary block" disabled={busy || list.length === 0} onClick={run}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  )
}
