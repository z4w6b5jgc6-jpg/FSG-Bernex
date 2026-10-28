import type { Block, Session } from '../types'
export type SessionContent = Pick<Session, 'title' | 'objective' | 'focus' | 'duration_min' | 'blocks' | 'targets'>
export function sessionContent(s: Session): SessionContent {
  return structuredClone({ title: s.title, objective: s.objective, focus: s.focus, duration_min: s.duration_min, blocks: s.blocks, targets: s.targets ?? [] })
}
/** Une hypothèse demandée par le coach, jamais une dose présentée comme scientifiquement optimale. */
export function reduceRepetitions(blocks: Block[], percent: number): { blocks: Block[]; changed: number } {
  if (!Number.isFinite(percent) || percent < 0 || percent > 50) throw new Error('Choisir une réduction entre 0 et 50 %.')
  let changed = 0
  const next = structuredClone(blocks)
  for (const block of next) {
    if (/échauffement|echauffement|retour au calme|prévention|prevention/i.test(block.title)) continue
    for (const item of block.items) {
      const field = /^\d+$/.test(item.reps.trim()) ? 'reps' : /^\d+$/.test(item.sets.trim()) ? 'sets' : null
      if (!field) continue
      const initial = Number(item[field]); const value = Math.max(1, Math.floor(initial * (1 - percent / 100)))
      if (value < initial) { item[field] = String(value); changed++ }
    }
  }
  return { blocks: next, changed }
}
export function contentDiff(before: SessionContent, after: SessionContent): string[] {
  const out: string[] = []
  if (before.title !== after.title) out.push(`Titre : ${before.title} → ${after.title}`)
  if (before.objective !== after.objective) out.push('Objectif modifié')
  if (before.duration_min !== after.duration_min) out.push(`Durée prévue : ${before.duration_min ?? '—'} → ${after.duration_min ?? '—'} min`)
  const old = before.blocks.flatMap((b) => b.items)
  const fresh = after.blocks.flatMap((b) => b.items)
  for (const item of old) {
    const next = fresh.find((i) => i.id === item.id)
    if (!next) { out.push(`Retiré : ${item.name}`); continue }
    for (const key of ['name','sets','reps','distance','duration','recovery','intensity','notes','load_kind','load_kg'] as const)
      if (item[key] !== next[key]) out.push(`${item.name} · ${key} : ${item[key] || '—'} → ${next[key] || '—'}`)
  }
  for (const item of fresh) if (!old.some((i) => i.id === item.id)) out.push(`Ajouté : ${item.name}`)
  return out
}
