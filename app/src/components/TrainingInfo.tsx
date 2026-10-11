import { useState } from 'react'
import { api } from '../api'
import { useData } from '../lib/data'
import { RichText } from './RichText'
import { errorMessage } from '../lib/utils'

const TEMPLATE = `## Horaires
- **Mercredi** 18h00 – 20h00 : entraînement du groupe U16/U18

## Lieux
- **Avril à octobre** : Evaux
- **Novembre à mars** : Pavillon des sports au Bout-du-Monde

## À prendre
- Tenue de sport selon la météo, baskets et pointes, gourde

## Absences
- Prévenir les entraîneurs sur WhatsApp avant la séance`

const OPEN_KEY = 'athle-training-info-open'

/** Cadre « Organisation des entraînements » : rempli par les entraîneurs, visible par tous */
export function TrainingInfo() {
  const { me, refreshMe } = useData()
  const coach = me?.role === 'coach'
  const text = me?.training_info ?? ''
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(OPEN_KEY) !== '0' } catch { return true } })
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (!text && !coach) return null

  const toggle = (v: boolean) => { setOpen(v); try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* ignore */ } }
  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      await api.saveTrainingInfo(draft?.trim() ?? '')
      await refreshMe()
      setDraft(null)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="card training-info" open={open || draft !== null} onToggle={(e) => toggle((e.target as HTMLDetailsElement).open)}>
      <summary><b>📌 Organisation des entraînements</b></summary>
      {draft !== null ? (
        <div className="form">
          <textarea rows={12} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <p className="tiny muted">Mise en forme : « ## Titre » pour un titre, « - » en début de ligne pour une liste, **texte** pour du gras.</p>
          {err && <div className="alert warn small">{err}</div>}
          <div className="row end gap">
            <button className="btn ghost" onClick={() => setDraft(null)}>Annuler</button>
            <button className="btn primary" disabled={busy} onClick={save}>{busy ? '…' : 'Enregistrer'}</button>
          </div>
        </div>
      ) : text ? (
        <>
          <RichText text={text} />
          {coach && <button className="btn ghost small" onClick={() => setDraft(text)}>✏️ Modifier</button>}
        </>
      ) : (
        <div className="form">
          <p className="small muted">Horaires, lieux selon la saison, matériel, absences… Ce cadre s’affiche aussi chez les athlètes, dans « Mes séances ».</p>
          <button className="btn primary" onClick={() => setDraft(TEMPLATE)}>✏️ Remplir (modèle proposé)</button>
        </div>
      )}
    </details>
  )
}
