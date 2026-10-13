import type { SessionItem } from '../types'
import { parseEffortSeconds, parseMeters, vmaPercent } from './vma'

/** Suggestion de récupération : texte à mettre dans le champ, et pourquoi */
export interface RecoveryHint { value: string; why: string }

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const min = (m: number) => {
  const s = Math.round(m * 60)
  if (s < 60) return `${s}"`
  return s % 60 ? `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}` : `${s / 60}'`
}
const range = (a: number, b: number) => (a === b ? min(a) : `${min(a)}–${min(b)}`)

/** Intensité en % (« 90% », « 85-90 % », « max » → 100) */
function intensityOf(text: string): number | null {
  if (/\b(max|maximal|a fond|100\s*%)/.test(text)) return 100
  const m = text.match(/(\d{2,3})(?:\s*[-–à]\s*(\d{2,3}))?\s*%/)
  return m ? Number(m[2] ?? m[1]) : null
}

/**
 * Récupération proposée selon les repères d'entraînement courants :
 *  - vitesse (≤ 80 m, intensité élevée) : ~1 min par 10 m entre les répétitions, 6 à 8 min entre les séries
 *  - endurance de vitesse / lactique (100–400 m) : récupération quasi complète
 *  - fractionné VMA : récupération égale à l'effort (efforts courts) ou à la moitié (efforts longs)
 *  - bondissements / pliométrie : retour marché, 2 à 3 min entre les séries
 *  - tempo (≤ 75 %) : retour marché / trottiné
 */
export function suggestRecovery(it: SessionItem, context = ''): RecoveryHint | null {
  const text = norm([it.name, it.distance, it.duration, it.intensity, it.notes].join(' '))
  const ctx = norm(context)
  const sets = Number(it.sets) || 1
  const pctVma = vmaPercent([it.intensity, it.name, it.notes].join(' '))
  const pct = intensityOf(text)
  const meters = parseMeters(it.distance) ?? parseMeters(it.name)
  const effort = parseEffortSeconds(it.duration) ?? parseEffortSeconds(it.name.match(/\d+\s*(?:"|”|'|’|s\b|min)/)?.[0] ?? '')
  const series = (a: number, b: number) => (sets > 1 ? ` · ${range(a, b)} entre les séries` : '')

  // Échauffement, retour au calme, étirements : rien à proposer
  if (/echauff|stre?t?ching|etirement|retour au calme|footing|mobilite/.test(text)) return null

  // Éducatifs / gammes : on revient en marchant
  if (/educatif|talon|skipping|griffe|genoux|jambes tendues|gamme|pas chasse|pas croise/.test(text)) {
    return { value: `retour marché${series(1, 2)}`, why: 'Éducatifs : la qualité du geste prime, on revient au départ en marchant.' }
  }

  // Gainage / renforcement
  if (/gainage|planche|crunch|releve|abdo|isometr|pompe|squat|fente|muscu|renfo/.test(text) && !/saut|bond/.test(text)) {
    return { value: `30"–1' entre les exercices${series(2, 3)}`, why: 'Renforcement : récupération courte entre les exercices, 2–3 min entre les tours.' }
  }

  // Bondissements, sauts, pliométrie
  if (/bond|saut|plio|plyo|plinth|caisson|haie|cloche|multi|grenouille|ramene|impuls|foulee|banc|tapis/.test(text) && !/\d+\s*m\s*haies/.test(text) && !(meters && meters >= 60 && pct)) {
    const intense = /plinth?|caisson|chute|depth|reactif/.test(text)
    return intense
      ? { value: `2'–3'${series(4, 5)}`, why: 'Pliométrie intense (chutes, plinths) : qualité des contacts avant tout, récupération quasi complète.' }
      : { value: `retour marché (30"–1')${series(2, 3)}`, why: 'Bondissements : récupérer en revenant au départ en marchant ; 2–3 min entre les séries.' }
  }

  // Fractionné VMA (ou effort en temps)
  if (pctVma || /vma|30\/30|15\/15|fractionne|intermittent/.test(text + ctx) && (effort || meters)) {
    const work = effort ?? (meters ? meters / 4.5 : 60) // ~16 km/h si seulement une distance
    if (work <= 45) return { value: `${min(work / 60)} (= effort)${series(3, 5)}`, why: 'Intermittent court : récupération égale à l’effort (ex. 30"/30"), trottinée ; 3–5 min entre les séries.' }
    if (work <= 180) return { value: `${range(work / 120, work / 60)} trottiné${series(3, 5)}`, why: 'Fractionné VMA (1–3 min) : récupération de la moitié au temps d’effort.' }
    return { value: `${range(Math.max(1.5, work / 180), work / 120)} trottiné`, why: 'Effort long au seuil / VMA : environ un tiers à la moitié du temps d’effort.' }
  }

  if (!meters) return null
  const fast = (pct ?? 100) >= 90

  // Tempo / allures modérées
  if ((pct ?? 100) <= 75) return { value: `retour marché (1'–2')${series(3, 4)}`, why: 'Allure tempo (≤ 75 %) : récupération courte, on enchaîne en restant détendu.' }

  // Repères du tableau « Sprint » (S. Charlet) complétés par les pratiques actuelles (≈ 1 min / 10 m en vitesse max)
  if (meters <= 20) return { value: `${range(1.5, 2)}${series(3, 5)}`, why: 'Départs / accélérations courtes : 1,5–2 min pour repartir explosif ; 3–5 min entre les séries.' }
  if (meters <= 60) {
    if (!fast) return { value: `${range(1.5, 2)}${series(3, 5)}`, why: 'Vitesse sous-maximale (80–90 %) : récupération un peu plus courte que pour la vitesse pure.' }
    return { value: `${range(Math.max(1.5, meters / 20), Math.max(2, meters / 15))}${series(4, 6)}`, why: 'Puissance anaérobie alactique (30–60 m à 95–100 %) : 1\'30–3\' entre les répétitions, 3–5 min entre les séries (jusqu’à 6 min si la qualité baisse). Volume total 400–800 m.' }
  }
  if (meters <= 200) return fast
    ? { value: `${range(1, 2)} (marché)${series(12, 15)}`, why: 'Capacité anaérobie alactique (séance courte, 80–150 m à 90–95 %) : 1–2 min entre les répétitions, 12–15 min entre les séries. Volume 700–1200 m.' }
    : { value: `${range(1.5, 3)}${series(5, 6)}`, why: 'Lignes droites à 80–90 % : 1\'30–3\'.' }
  if (meters <= 400) return { value: `${range(3, 8)}${series(10, 12)}`, why: 'Puissance anaérobie lactique (séance longue, 150–400 m à 75–85 % de la vitesse max) : 3–8 min, et plus entre les séries. Volume 1000–1500 m.' }
  if (meters <= 1000) return { value: `${range(6, 8)}${series(10, 12)}`, why: 'Capacité anaérobie lactique (500–1000 m) : récupération complète, 6–8 min. Volume 2 à 5 km.' }
  return { value: `${range(2.5, 3)} trottiné`, why: 'Intervalles longs au seuil (1000–2000 m à 85 % VMA) : 2\'30–3\'. Volume 8 à 10 km.' }
}
