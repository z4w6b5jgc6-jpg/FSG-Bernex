// Classeur « Course lundi 2026-2027 » (onglets Plan lundi, Cibles, Athlètes) → même structure que le JSON du plan
import { normText, toNumber, type Cell, type SheetIn } from './importResults'
import type { PlanAthleteIn, PlanFile } from './mondayPlan'
import { SUBGROUPS } from './targets'

const str = (c: Cell | undefined) => (c instanceof Date ? '' : String(c ?? '').trim())
const iso = (c: Cell | undefined) => {
  if (c instanceof Date) return c.toISOString().slice(0, 10)
  const m = str(c).match(/^(\d{4})-(\d{2})-(\d{2})/) ?? str(c).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (!m) return ''
  return m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}
const num = (c: Cell | undefined) => { const v = toNumber(c ?? null); return v != null && v > 0 ? v : null }
/** « Sprint / Sauts / Haies\n(14 athlètes) » → 'sprint' */
const subgroupOf = (label: string) => Object.entries(SUBGROUPS).find(([, l]) => normText(l) === normText(label.split('\n')[0]))?.[0] ?? null

function header(s: SheetIn, need: RegExp[]): number {
  return s.rows.slice(0, 12).findIndex((r) => need.every((re) => r.some((c) => re.test(normText(c)))))
}

/** null si ce n'est pas le classeur du plan du lundi */
export function planFromWorkbook(sheets: SheetIn[]): PlanFile | null {
  const plan = sheets.find((s) => header(s, [/^date$/, /^cycle/, /^objectif/, /^echauffement/]) >= 0)
  if (!plan) return null
  const h = header(plan, [/^date$/, /^cycle/, /^objectif/, /^echauffement/])
  const hd = plan.rows[h].map((c) => str(c))
  const col = (re: RegExp) => hd.findIndex((t) => re.test(normText(t)))
  const ci = { date: col(/^date$/), cycle: col(/^cycle/), obj: col(/^objectif/), warm: col(/^echauffement/), speed: col(/^blocvitesse/), cool: col(/^retouraucalme/), rem: col(/^remarque/) }
  const groupCols = hd.map((t, i) => [subgroupOf(t), i] as const).filter(([sg]) => sg) as [string, number][]
  if (!groupCols.length) return null

  // Cibles : Date | Groupe | N° | Distance / durée | Base | %
  const tsheet = sheets.find((s) => header(s, [/^date$/, /^groupe$/, /^base$/]) >= 0)
  const cibles = new Map<string, PlanFile['seances'][number]['cibles']>()
  if (tsheet) {
    const th = header(tsheet, [/^date$/, /^groupe$/, /^base$/])
    const t = tsheet.rows[th].map((c) => normText(c))
    const k = { date: t.indexOf('date'), g: t.indexOf('groupe'), n: t.findIndex((x) => /^(n|no|numero|ordre)$/.test(x)), d: t.findIndex((x) => /^distance/.test(x)), b: t.indexOf('base') }
    const pi = tsheet.rows[th].findIndex((c) => /^(%|pct|pourcentage)$/i.test(str(c)))
    for (const r of tsheet.rows.slice(th + 1)) {
      const date = iso(r[k.date]), sg = subgroupOf(str(r[k.g])), d = num(r[k.d]), base = str(r[k.b]).toUpperCase(), pct = num(r[pi])
      if (!date || !sg || !d || !pct || !['VMA', 'RVA', 'REC', 'INT'].includes(base)) continue
      if (!cibles.has(date)) cibles.set(date, [])
      cibles.get(date)!.push({ sous_groupe: sg, ordre: num(r[k.n]) ?? cibles.get(date)!.filter((c) => c.sous_groupe === sg).length + 1, distance_ou_duree: d, base, pct: pct > 3 ? pct / 100 : pct })
    }
  }

  const seances: PlanFile['seances'] = []
  for (const r of plan.rows.slice(h + 1)) {
    const date = iso(r[ci.date])
    if (!date) continue
    const objectif = str(r[ci.obj])
    seances.push({
      date, cycle: str(r[ci.cycle]), objectif,
      // « Semaine allégée (−40 %) », « Récupération (−50 %) »
      semaine_allegee: /allég|\(\s*[−-]\s*\d+\s*%\s*\)/i.test(objectif),
      echauffement: str(r[ci.warm]), bloc_vitesse: ci.speed >= 0 ? str(r[ci.speed]) : '',
      contenu: Object.fromEntries(groupCols.map(([sg, i]) => [sg, str(r[i])]).filter(([, v]) => v)),
      retour_au_calme: ci.cool >= 0 ? str(r[ci.cool]) : '', remarques: ci.rem >= 0 ? str(r[ci.rem]) : '',
      cibles: cibles.get(date) ?? [],
    })
  }

  // Athlètes : une ligne par athlète, « Groupe lundi », « Lundi » (non = exclu), tests et records en secondes
  const athletes: PlanAthleteIn[] = []
  const asheet = sheets.find((s) => header(s, [/^athlete$/, /^groupe/, /^20mlance/]) >= 0)
  if (asheet) {
    const ah = header(asheet, [/^athlete$/, /^groupe/, /^20mlance/])
    const t = asheet.rows[ah].map((c) => normText(c))
    const a = (re: RegExp) => t.findIndex((x) => re.test(x))
    const raw = asheet.rows[ah].map((c) => str(c).toLowerCase())
    const vma = raw.findIndex((x) => /^vma\s*\(km\/h\)/.test(x))
    const k = { name: a(/^athlete$/), born: a(/^ne/), ev: a(/^disciplines?$/), g: a(/^groupe/), day: a(/^lundi$/), vma: vma >= 0 ? vma : a(/^vma$/), f20: a(/^20mlance/), f30: a(/^30mlance/), d40: a(/^40mdepart/) }
    const recs = t.flatMap((x, i) => { const m = x.match(/^rec(\d+)m$/); return m ? [[Number(m[1]), i] as const] : [] })
    for (const r of asheet.rows.slice(ah + 1)) {
      const nom = str(r[k.name]), sg = subgroupOf(str(r[k.g]))
      if (!nom || !sg || (k.day >= 0 && normText(r[k.day]) === 'non')) continue
      athletes.push({
        nom, naissance: iso(r[k.born]) || null, disciplines: str(r[k.ev]) || null, sous_groupe: sg,
        vma_kmh: num(r[k.vma]), lance_20m_s: num(r[k.f20]), lance_30m_s: num(r[k.f30]), depart_40m_s: num(r[k.d40]),
        records_s: Object.fromEntries(recs.flatMap(([d, i]) => { const v = num(r[i]); return v ? [[String(d), v]] : [] })),
      })
    }
  }
  const saison = sheets.flatMap((s) => s.rows.slice(0, 3).flat()).map(str).join(' ').match(/\b(20\d\d-20\d\d)\b/)?.[1] ?? ''
  return seances.length ? { saison, athletes, seances } : null
}
