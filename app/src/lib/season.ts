import type { Athlete, Assignment, Feedback, Wellness } from '../types'

export type Phase = 'extensive' | 'intensive' | 'explosive' | 'recovery' | 'taper' | 'competition' | 'camp' | 'transition'
export const PHASES: Record<Phase, { label: string; color: string }> = {
  extensive: { label: 'Extensif', color: '#25766e' }, intensive: { label: 'Intensif', color: '#5257a6' },
  explosive: { label: 'Explosif / spécifique', color: '#b96925' }, recovery: { label: 'Récupération', color: '#537d91' },
  taper: { label: 'Affûtage', color: '#975c8d' }, competition: { label: 'Compétition', color: '#9e7220' },
  camp: { label: 'Camp', color: '#176eae' }, transition: { label: 'Transition', color: '#64748b' },
}
export interface SeasonBlock {
  id: string; title: string; start: string; end: string; phase: Phase
  athleteIds: string[]; notes: string; provisional: boolean; cycle?: string
  origin?: {kind:'programs';signature:string;assignmentIds:string[];reviewedAt:string;maxGap:number}
}
export interface WeekTarget { minutes: number | null; rpe: number | null; note: string }
export interface SeasonPlan { start: string; end: string; blocks: SeasonBlock[]; weekTargets?: Record<string, WeekTarget>; projections?: import('./cycleProjection').CycleProjection[] }
export const SOURCES = [
  { id: 'periodization2026', title: 'Zhang et al. — périodisation linéaire / ondulatoire (2026)', url: 'https://pubmed.ncbi.nlm.nih.gov/41869632/', scope: 'Revue systématique et méta-analyse en entraînement de résistance ; effets globaux comparables sur les capacités étudiées. Ne démontre pas un modèle optimal pour les microcycles U16–U18 en athlétisme.' },
  { id: 'endurance2025', title: 'Entraîneurs norvégiens — organisation macro / méso / micro (2025)', url: 'https://pubmed.ncbi.nlm.nih.gov/40278987/', scope: 'Étude de pratiques de 12 entraîneurs de haut niveau en endurance, pas un essai causal ni une prescription pour jeunes sprinteurs, sauteurs ou lanceurs. Met en évidence une organisation adaptée aux contraintes et à la récupération.' },
  { id: 'egger', title: 'Egger — planification de la force (1997)', url: 'https://www.persee.fr/doc/insep_1241-0691_1997_num_21_1_2059', scope: 'Texte original p. 187–189 et figure 1 : extensif progressif 3+1 ; intensif/explosif à tendance dégressive 2+1, récupération comprise. Indices relatifs, pas %1RM. Modèle de terrain adulte, sans prescription universelle pour les jeunes.' },
  { id: 'strength', title: 'Moesgaard et al. — périodisation de la force (2022)', url: 'https://pubmed.ncbi.nlm.nih.gov/35044672/', scope: 'Méta-analyse de musculation ; les résultats sur la force maximale ne démontrent pas un calendrier optimal en athlétisme U16–U18.' },
  { id: 'sprint', title: 'Haugen et al. — préparation du sprint (2019)', url: 'https://pubmed.ncbi.nlm.nih.gov/31754845/', scope: 'Synthèse de recherche et pratiques du sprint de haut niveau, à contextualiser pour les jeunes.' },
  { id: 'taper', title: 'Wang et al. — affûtage en endurance (2023)', url: 'https://pubmed.ncbi.nlm.nih.gov/37163550/', scope: 'Méta-analyse en endurance. Ne justifie pas une réduction identique pour tous les sprinteurs, sauteurs ou lanceurs.' },
  { id: 'auto', title: 'Huang et al. — autorégulation en musculation (2025)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12336695/', scope: 'Synthèse sur la force au squat et développé couché ; pas une validation de modifications automatiques en athlétisme.' },
  { id: 'youth', title: 'CIO — développement des jeunes (2015)', url: 'https://bjsm.bmj.com/content/49/13/843', scope: 'Cadre de développement individualisé des jeunes ; ni diagnostic ni seuil universel de fatigue.' },
]
export const HOLIDAY_SOURCE = 'https://www.ge.ch/vacances-scolaires-jours-feries/vacances-scolaires-2026-2027'
export const HOLIDAYS = [
  { title: 'Automne', start: '2026-10-19', end: '2026-10-23' },
  { title: 'Noël', start: '2026-12-24', end: '2027-01-08' },
  { title: 'Février', start: '2027-02-15', end: '2027-02-19' },
  { title: 'Pâques', start: '2027-03-26', end: '2027-04-09' },
  { title: 'Ascension', start: '2027-05-06', end: '2027-05-07' },
  { title: 'Pentecôte', start: '2027-05-17', end: '2027-05-17' },
  { title: 'Été', start: '2027-07-05', end: '2027-08-25' },
]
export function initialSeason(): SeasonPlan {
  const b = (id: string, title: string, start: string, end: string, phase: Phase, provisional = true): SeasonBlock =>
    ({ id, title, start, end, phase, athleteIds: [], provisional, notes: '' })
  return { start: '2026-10-26', end: '2027-09-30', blocks: [
    { ...b('winter-ext', 'Préparation hiver · extensif', '2026-10-26', '2026-11-15', 'extensive'), cycle: 'Hiver' },
    { ...b('winter-r1', 'Semaine allégée à valider', '2026-11-16', '2026-11-22', 'recovery'), cycle: 'Hiver' },
    { ...b('winter-int', 'Préparation hiver · intensif', '2026-11-23', '2026-12-13', 'intensive'), cycle: 'Hiver' },
    { ...b('winter-r2', 'Allègement avant les congés', '2026-12-14', '2026-12-20', 'recovery'), cycle: 'Hiver' },
    { ...b('winter-exp', 'Préparation hiver · explosif adapté aux congés', '2026-12-21', '2027-01-10', 'explosive'), cycle: 'Hiver' },
    { ...b('winter-taper', 'Affûtage à caler sur la compétition', '2027-01-11', '2027-01-14', 'taper'), cycle: 'Hiver' },
    b('winter', 'Saison hivernale — dates à préciser', '2027-01-15', '2027-02-28', 'competition'),
    b('spring-reset', 'Transition après hiver', '2027-03-01', '2027-03-07', 'transition'),
    { ...b('spring-ext', 'Préparation printemps · extensif', '2027-03-08', '2027-03-25', 'extensive'), cycle: 'Printemps' },
    b('camp', 'Camp de Pâques', '2027-03-26', '2027-04-04', 'camp', false),
    { ...b('postcamp', 'Récupération après camp — durée à valider', '2027-04-05', '2027-04-11', 'recovery'), cycle: 'Printemps' },
    { ...b('spring-int', 'Préparation printemps · intensif', '2027-04-12', '2027-05-02', 'intensive'), cycle: 'Printemps' },
    { ...b('spring-exp', 'Préparation printemps · explosif', '2027-05-03', '2027-05-16', 'explosive'), cycle: 'Printemps' },
    { ...b('spring-taper', 'Affûtage à confirmer', '2027-05-17', '2027-05-23', 'taper'), cycle: 'Printemps' },
    b('summer', 'Compétitions fin mai–juin', '2027-05-24', '2027-06-30', 'competition'),
    b('summer-reset', 'Transition après juin', '2027-07-01', '2027-07-11', 'transition'),
    { ...b('summer-ext', 'Préparation septembre · extensif', '2027-07-12', '2027-08-01', 'extensive'), cycle: 'Septembre' },
    { ...b('summer-int', 'Préparation septembre · intensif', '2027-08-02', '2027-08-22', 'intensive'), cycle: 'Septembre' },
    { ...b('summer-exp', 'Préparation septembre · explosif, échéance à préciser', '2027-08-23', '2027-08-31', 'explosive'), cycle: 'Septembre' },
    b('swiss', 'Championnats suisses — date à préciser', '2027-09-01', '2027-09-30', 'competition'),
  ] }
}
export const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s
export const dayNumber = (s: string) => Date.parse(s + 'T12:00:00Z') / 86400000
export const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start <= b.end && b.start <= a.end
export const targets = (b: SeasonBlock, id: string) => !b.athleteIds.length || b.athleteIds.includes(id)
export function validateSeason(plan: SeasonPlan): string | null {
  if (!validDate(plan.start) || !validDate(plan.end) || plan.start > plan.end) return 'Vérifie les dates de la saison.'
  if (dayNumber(plan.end) - dayNumber(plan.start) > 730) return 'Limite la vue à deux années.'
  for(const [key,value] of Object.entries(plan.weekTargets??{})){
    const date=key.slice(0,10)
    if(!validDate(date)||date<plan.start||date>plan.end)return 'Une cible hebdomadaire est hors de la saison.'
    if(value.minutes!=null&&(!Number.isInteger(value.minutes)||value.minutes<0||value.minutes>3000))return 'Vérifie la durée cible hebdomadaire (0 à 3000 minutes).'
    if(value.rpe!=null&&(!Number.isFinite(value.rpe)||value.rpe<1||value.rpe>10))return 'Vérifie l’effort cible hebdomadaire (1 à 10).'
  }
  if((plan.projections?.length??0)>24)return 'Conserve au maximum 24 scénarios de travail.'
  for(const p of plan.projections??[]){
    if(!p.name.trim()||!p.weeks.length||p.weeks.length>106)return 'Un scénario doit avoir un nom et des microcycles valides.'
    for(const w of p.weeks){
      if(!validDate(w.start)||!validDate(w.end)||w.start>w.end||dayNumber(w.end)-dayNumber(w.start)>6||!w.objective.trim())return 'Vérifie les dates et objectifs des microcycles.'
      if(w.minutes!=null&&(!Number.isInteger(w.minutes)||w.minutes<0||w.minutes>3000))return 'Vérifie les durées cibles des microcycles.'
      if(w.rpe!=null&&(!Number.isFinite(w.rpe)||w.rpe<1||w.rpe>10))return 'Vérifie les efforts cibles des microcycles.'
    }
  }
  for (const b of plan.blocks) {
    if (!b.title.trim() || !validDate(b.start) || !validDate(b.end) || b.start > b.end || !PHASES[b.phase]) return 'Chaque bloc doit avoir un titre, une phase et des dates valides.'
    if (b.start < plan.start || b.end > plan.end) return `Le bloc « ${b.title} » sort de la saison.`
  }
  return null
}
export function actualLoad(f: Pick<Feedback, 'completed' | 'duration_min' | 'rpe'>): number | null {
  if (!f.completed) return 0
  if (f.duration_min == null || f.rpe == null) return null
  return f.duration_min * f.rpe
}
export function proposePreparation(competitionDate: string, athleteIds: string[], weeks: { extensive: number; intensive: number; explosive: number; recovery: number }): SeasonBlock[] {
  if (!validDate(competitionDate)) throw new Error('Renseigne une date de compétition valide.')
  for (const phase of ['extensive', 'intensive', 'explosive'] as const)
    if (!Number.isInteger(weeks[phase]) || weeks[phase] < 1 || weeks[phase] > 12) throw new Error('Chaque phase doit durer entre 1 et 12 semaines.')
  if (!Number.isInteger(weeks.recovery) || weeks.recovery < 0 || weeks.recovery > 2) throw new Error('Choisis entre 0 et 2 semaines de récupération entre les phases.')
  const shift = (d: string, n: number) => { const value = new Date(d + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + n); return value.toISOString().slice(0, 10) }
  const phases: Phase[] = weeks.recovery ? ['extensive', 'recovery', 'intensive', 'recovery', 'explosive'] : ['extensive', 'intensive', 'explosive']
  let cursor = shift(competitionDate, -1)
  return phases.reverse().map((phase) => {
    const length = weeks[phase as keyof typeof weeks]
    const end = cursor, start = shift(end, -length * 7 + 1)
    cursor = shift(start, -1)
    return { id: crypto.randomUUID(), title: `${PHASES[phase].label} — préparation proposée`, start, end, phase, athleteIds: [...athleteIds], provisional: true, cycle: `Échéance ${competitionDate}`,
      notes: phase === 'recovery' ? 'Durée choisie par le coach pour cette proposition ; à ajuster au contenu et aux réponses individuelles.' : 'Trame inspirée des phases d’Egger. Durée, exercices et charges à valider pour la discipline et le développement de cet athlète. Prévoir un affûtage distinct si nécessaire.' }
  }).reverse()
}
export interface ReviewPoint { title: string; detail: string; source: string; attention?: boolean }
/** Règles de revue transparentes. Aucun modèle externe, diagnostic ou réduction chiffrée automatique. */
export function reviewAthlete(a: Athlete, date: string, wellness: Wellness[], feedback: Feedback[], assignments: Assignment[], blocks: SeasonBlock[]): ReviewPoint[] {
  const points: ReviewPoint[] = []
  const recent = wellness.filter((w) => w.athlete_id === a.id && w.date <= date).sort((x, y) => y.date.localeCompare(x.date))[0]
  const recentFeedback = feedback.filter((f) => f.athlete_id === a.id && assignments.some((s) => s.id === f.assignment_id && s.date <= date && dayNumber(date) - dayNumber(s.date) <= 7))
  if (!a.goals.trim()) points.push({ title: 'Objectif à préciser', detail: 'Compléter l’objectif avant de choisir les priorités du cycle.', source: 'youth' })
  if (!recent || dayNumber(date) - dayNumber(recent.date) > 2) points.push({ title: 'État de forme à renseigner', detail: 'Pas de questionnaire récent à cette date. Ne pas déduire que l’athlète est reposé.', source: 'youth' })
  else {
    points.push({ title: `Dernier questionnaire : ${recent.date}`, detail: `Sommeil : ${recent.sleep_hours ?? 'non renseigné'} h · énergie : ${recent.energy ?? '—'}/5 · courbatures : ${recent.soreness ?? '—'}/5 · stress : ${recent.stress ?? '—'}/5. À interpréter avec l’athlète.`, source: 'youth' })
    if ((recent.energy != null && recent.energy <= 2) || (recent.soreness != null && recent.soreness >= 4) || (recent.stress != null && recent.stress >= 4))
      points.push({ title: 'Échanger avant de décider', detail: 'Réponses défavorables selon des seuils de tri de l’interface, sans valeur diagnostique. Examiner le volume, les récupérations ou le contenu technique ; aucun ajustement automatique.', source: 'auto', attention: true })
  }
  if (recentFeedback.some((f) => f.pain.trim())) points.push({ title: 'Douleur récemment signalée', detail: 'Clarifier la situation avant de valider la séance. Pas de prescription ni de diagnostic automatique ; demander un avis de santé adapté si nécessaire.', source: 'youth', attention: true })
  const missing = recentFeedback.filter((f) => actualLoad(f) == null).length
  if (missing) points.push({ title: 'Charge incomplète', detail: `${missing} retour(s) sans durée ou effort renseigné. Ne pas remplacer ces données par la durée prévue.`, source: 'sprint' })
  for (const b of blocks.filter((b) => targets(b, a.id) && b.start <= date && b.end >= date))
    points.push({ title: b.title, detail: `${PHASES[b.phase].label}${b.provisional ? ' · proposition à valider' : ''}. ${b.notes || 'Définir l’objectif et le contenu selon la discipline et le vécu de cet athlète.'}`, source: b.phase === 'taper' ? 'taper' : 'egger' })
  if (HOLIDAYS.some((h) => h.start <= date && h.end >= date)) points.push({ title: 'Période de vacances', detail: 'Confirmer la présence, le lieu et le matériel ; adapter les séances. Les vacances ne valent pas annulation.', source: 'organisation' })
  return points
}

/** Vérifie le modèle choisi, sans déclarer les durées scientifiquement optimales. */
export function sequenceWarnings(blocks: SeasonBlock[]): string[] {
 const groups=new Map<string,SeasonBlock[]>()
 for(const b of blocks){if(!['extensive','intensive','explosive'].includes(b.phase))continue;const key=`${b.cycle||'Cycle non nommé'}|${[...b.athleteIds].sort().join(',')}`;groups.set(key,[...(groups.get(key)||[]),b])}
 const warnings:string[]=[]
 for(const [key,items] of groups){const name=key.split('|')[0];const sorted=[...items].sort((a,b)=>a.start.localeCompare(b.start));const phases=sorted.map(b=>b.phase)
  for(const phase of ['extensive','intensive','explosive'] as const)if(!phases.includes(phase))warnings.push(`${name} : phase ${PHASES[phase].label.toLowerCase()} absente ; vérifier si c’est volontaire.`)
  const order={extensive:0,intensive:1,explosive:2} as Record<string,number>
  if(phases.some((p,i)=>i>0&&order[p]<order[phases[i-1]]))warnings.push(`${name} : l’ordre extensif → intensif → explosif n’est pas respecté.`)
  for(let i=1;i<sorted.length;i++)if(sorted[i].start<=sorted[i-1].end)warnings.push(`${name} : chevauchement de phases à examiner.`)
 }
 return warnings
}
