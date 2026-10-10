import { useEffect, type ReactNode } from 'react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Scale({
  value, onChange, min, max, labels,
}: {
  value: number | null
  onChange: (v: number) => void
  min: number
  max: number
  labels?: Record<number, string>
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div className="scale">
      {values.map((v) => (
        <button
          type="button"
          key={v}
          className={`scale-btn ${value === v ? 'active' : ''}`}
          onClick={() => onChange(v)}
          title={labels?.[v]}
        >
          {labels?.[v] && labels[v].length <= 2 ? labels[v] : v}
        </button>
      ))}
    </div>
  )
}

export const RPE_LABELS: Record<number, string> = {
  1: 'Très facile', 2: 'Facile', 3: 'Modéré', 4: 'Un peu dur', 5: 'Dur',
  6: 'Dur', 7: 'Très dur', 8: 'Très dur', 9: 'Extrêmement dur', 10: 'Maximal',
}
export const FATIGUE_LABELS: Record<number, string> = { 1: '😄', 2: '🙂', 3: '😐', 4: '😓', 5: '🥵' }
export const FATIGUE_TEXT: Record<number, string> = { 1: 'En pleine forme', 2: 'Bien', 3: 'Moyen', 4: 'Fatigué·e', 5: 'Épuisé·e' }
export const MOOD_LABELS: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '🤩' }
export const MOOD_TEXT: Record<number, string> = { 1: 'Pas bien', 2: 'Bof', 3: 'Correct', 4: 'Bien', 5: 'Super' }

export function GroupBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="badge" style={{ background: color + '22', color, borderColor: color + '55' }}>
      {name}
    </span>
  )
}

export function rpeClass(rpe: number | null): string {
  if (rpe == null) return ''
  if (rpe >= 8) return 'danger'
  if (rpe >= 6) return 'warn'
  return 'ok'
}
