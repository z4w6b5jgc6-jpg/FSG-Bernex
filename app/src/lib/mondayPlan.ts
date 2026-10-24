// Plan des séances du lundi : fichier JSON (seances_lundi_2026-2027.json) → séances de l'app
import type { Block, Session, SessionPlan, Target, TargetBase } from '../types'
import { toItems } from './importSessions'
import { uid } from './utils'
import { SUBGROUPS } from './targets'

export interface PlanAthleteIn {
  nom: string
  naissance: string | null
  disciplines: string | null
  sous_groupe: string
  vma_kmh: number | null
  lance_20m_s: number | null
  lance_30m_s: number | null
  depart_40m_s: number | null
  records_s: Record<string, number>
}
interface PlanSessionIn {
  date: string
  cycle: string
  semaine_allegee: boolean
  objectif: string
  echauffement: string
  bloc_vitesse: string
  contenu: Record<string, string>
  retour_au_calme: string
  remarques: string | null
  cibles: { sous_groupe: string; ordre: number; distance_ou_duree: number; base: string; pct: number }[]
}
export interface PlanFile { saison: string; sous_groupes?: Record<string, string>; athletes: PlanAthleteIn[]; seances: PlanSessionIn[] }

const BASES: TargetBase[] = ['VMA', 'RVA', 'REC', 'INT']

/** Lit et vérifie le fichier ; message d'erreur lisible si ce n'est pas le bon format */
export function readPlanFile(text: string): PlanFile {
  let d: PlanFile
  try { d = JSON.parse(text) } catch { throw new Error('Ce fichier n’est pas un JSON valide.') }
  if (!d || !Array.isArray(d.seances) || !Array.isArray(d.athletes)) throw new Error('Il manque « seances » ou « athletes » : ce n’est pas le fichier du plan du lundi.')
  for (const s of d.seances) if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date ?? '')) throw new Error(`Date de séance illisible : « ${s.date} ».`)
  return d
}

/** Libellé d'un sous-groupe (« sprint » → « Sprint / Sauts / Haies ») */
export const subgroupLabel = (sg: string, file?: PlanFile) => file?.sous_groupes?.[sg] ?? SUBGROUPS[sg] ?? sg

/** Blocs de la séance à partir des textes du plan (les remarques vont dans les notes du coach) */
export function planBlocks(p: SessionPlan): Block[] {
  const parts: [string, string, boolean][] = [
    ['Échauffement', p.warmup, false],
    ['Bloc vitesse', p.speed, false],
    [subgroupLabel(p.subgroup), p.content, false],
    ['Retour au calme / prévention', p.cooldown, false],
  ]
  return parts.filter(([, t]) => t.trim()).map(([title, t, plain]) => ({ id: uid(), title, items: toItems(t.split(/\n+/), plain) }))
}

export const planTitle = (p: Pick<SessionPlan, 'subgroup'>, n: number) => `Lundi S${String(n).padStart(2, '0')} · ${subgroupLabel(p.subgroup)}`
export const planObjective = (p: Pick<SessionPlan, 'cycle' | 'objective' | 'light'>) =>
  [p.cycle, p.objective].filter(Boolean).join(' – ') + (p.light && !/allég/i.test(p.objective) ? ' (semaine allégée)' : '')

/** Une séance de l'app par date et par sous-groupe */
export function planDrafts(d: PlanFile): (Pick<Session, 'title' | 'objective' | 'focus' | 'duration_min' | 'blocks' | 'plan' | 'targets'> & { notes: string })[] {
  const dates = [...new Set(d.seances.map((s) => s.date))].sort()
  const name = `Lundi ${d.saison ?? ''}`.trim()
  return d.seances.flatMap((s) => {
    const groups = [...new Set([...Object.keys(s.contenu ?? {}), ...s.cibles.map((c) => c.sous_groupe)])]
    return groups.map((sg) => {
      const plan: SessionPlan = {
        name, date: s.date, cycle: s.cycle ?? '', light: !!s.semaine_allegee, objective: s.objectif ?? '',
        warmup: s.echauffement ?? '', speed: s.bloc_vitesse ?? '', content: s.contenu?.[sg] ?? '',
        // les remarques restent hors de la séance (notes réservées aux coachs)
        cooldown: s.retour_au_calme ?? '', remarks: '', subgroup: sg,
      }
      const targets: Target[] = s.cibles.filter((c) => c.sous_groupe === sg && BASES.includes(c.base as TargetBase))
        .sort((a, b) => a.ordre - b.ordre)
        .map((c) => ({ ordre: c.ordre, d: Number(c.distance_ou_duree), base: c.base as TargetBase, pct: Number(c.pct) }))
      return {
        title: planTitle(plan, dates.indexOf(s.date) + 1), objective: planObjective(plan), focus: 'Vitesse', duration_min: 120,
        blocks: planBlocks(plan), plan, targets, notes: s.remarques ?? '',
      }
    })
  })
}

/** 84.67 → 1'24"67 ; 11.74 → 11.74 (records) */
export function markOf(sec: number): string {
  if (sec < 60) return sec.toFixed(2)
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  const [w, dec] = s.toFixed(2).split('.')
  return `${m}'${w.padStart(2, '0')}"${dec}`
}
