import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export interface DayNavItem { id: string; label: string }

/**
 * Passer d'une séance à l'autre du même jour : flèches ‹ ›, onglets, balayage du doigt (iPad, téléphone)
 * et touches ← → du clavier (ordinateur). On remplace l'écran pour que « Retour » ramène au planning.
 */
export function DayNav({ items, current, path }: { items: DayNavItem[]; current: string; path: (id: string) => string }) {
  const nav = useNavigate()
  const i = items.findIndex((x) => x.id === current)
  const go = (k: number) => {
    const t = items[k]
    if (t && k !== i) nav(path(t.id), { replace: true })
  }
  const ids = items.map((x) => x.id).join(',')
  const tabs = useRef<HTMLDivElement>(null)
  // L'onglet de la séance affichée reste visible dans la barre
  useEffect(() => {
    const el = tabs.current?.querySelector<HTMLElement>('.chip.on')
    if (el && tabs.current) tabs.current.scrollLeft = el.offsetLeft - (tabs.current.clientWidth - el.offsetWidth) / 2
  }, [i])

  useEffect(() => {
    const list = ids.split(',')
    if (list.length < 2) return
    const move = (k: number) => { if (list[k] && k !== i) nav(path(list[k]), { replace: true }) }
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable || document.querySelector('.modal-backdrop')) return
      if (e.key === 'ArrowLeft') move(i - 1)
      if (e.key === 'ArrowRight') move(i + 1)
    }
    let start: { x: number; y: number } | null = null
    const onStart = (e: TouchEvent) => {
      const el = e.target as HTMLElement
      // pas de balayage depuis un tableau qui défile ou un champ
      start = e.touches.length === 1 && !el.closest('input, textarea, select, .table-scroll, .modal-backdrop') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
    }
    const onEnd = (e: TouchEvent) => {
      if (!start) return
      const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y
      start = null
      if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) move(dx < 0 ? i + 1 : i - 1)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [ids, i, nav, path])

  if (items.length < 2 || i < 0) return null
  return (
    <nav className="day-nav" aria-label="Séances du même jour">
      <button type="button" className="btn small" disabled={i === 0} onClick={() => go(i - 1)} aria-label="Séance précédente">‹</button>
      <div className="day-nav-tabs" ref={tabs}>
        {items.map((x, k) => (
          <button type="button" key={x.id} className={`chip ${k === i ? 'on' : ''}`} aria-current={k === i} onClick={() => go(k)}>{x.label}</button>
        ))}
      </div>
      <button type="button" className="btn small" disabled={i === items.length - 1} onClick={() => go(i + 1)} aria-label="Séance suivante">›</button>
      <span className="tiny muted day-nav-hint">{i + 1}/{items.length} ce jour · balaie ou utilise ← →</span>
    </nav>
  )
}
