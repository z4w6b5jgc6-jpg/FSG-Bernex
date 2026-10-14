import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Bouton « ← Retour » : revient à l'écran précédent de l'app (comme le geste retour),
 * ou à `to` si on est arrivé directement sur la page. Grande zone de toucher pour le téléphone.
 */
export function BackLink({ to, label }: { to: string; label: string }) {
  const nav = useNavigate()
  const onClick = (e: MouseEvent) => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) { e.preventDefault(); nav(-1) }
  }
  return (
    <Link to={to} onClick={onClick} className="back-link no-print" aria-label={`Retour : ${label}`}>
      <span aria-hidden>←</span> {label}
    </Link>
  )
}
