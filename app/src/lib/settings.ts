import { VENUES } from '../data/defaults'

/** Réglages de l'espace d'un groupe (rempli par ses coachs) */
export interface ClubSettings {
  /** lieux proposés dans les listes */
  venues?: string[]
  /** lieu de la belle saison et mois de début / fin (1 = janvier) ; le reste de l'année : winterVenue */
  summerVenue?: string
  winterVenue?: string
  summerFrom?: number
  summerTo?: number
  /** description du groupe pour l'assistant (âges, disciplines, habitudes) — sans noms d'athlètes */
  group?: string
}

// Valeurs du groupe d'origine (U16/U18) quand un espace n'a encore rien réglé
let current: ClubSettings = {}
export function applySettings(s: ClubSettings | null | undefined) { current = s ?? {} }
export const settings = () => current

export const venues = () => (current.venues?.length ? current.venues : VENUES)
export const seasonRule = () => ({
  summer: current.summerVenue ?? (current.venues?.length ? current.venues[0] : VENUES[0]),
  winter: current.winterVenue ?? (current.venues?.length ? current.venues[1] ?? current.venues[0] : VENUES[1]),
  from: current.summerFrom ?? 4,
  to: current.summerTo ?? 10,
})

/** Lieu habituel à cette date : lieu d'été entre les deux mois (inclus), sinon lieu d'hiver */
export function defaultLocation(date: string): string {
  const m = Number(date.slice(5, 7))
  if (!m) return ''
  const r = seasonRule()
  const summer = r.from <= r.to ? m >= r.from && m <= r.to : m >= r.from || m <= r.to
  return (summer ? r.summer : r.winter) ?? ''
}

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
