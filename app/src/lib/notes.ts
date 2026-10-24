import type { Block, SessionNote } from '../types'

/** Bloc « Remarques » : notes de coach, rangées à part (jamais envoyées aux athlètes) */
export const isRemarks = (b: Pick<Block, 'title'>) => /^remarques?$/i.test(b.title.trim())

/** Sépare les remarques du contenu de la séance */
export function splitRemarks(blocks: Block[]): { blocks: Block[]; remarks: string } {
  const rem = blocks.filter(isRemarks)
  return { blocks: blocks.filter((b) => !isRemarks(b)), remarks: rem.flatMap((b) => b.items.map((i) => i.name)).join('\n') }
}

export const noteOf = (notes: SessionNote[], sessionId: string) => notes.find((n) => n.session_id === sessionId)

type Save = (table: 'session_notes', row: Partial<SessionNote>) => Promise<SessionNote>
/** Crée ou met à jour la note d'une séance (rien si vide et inexistante) */
export async function saveNote(save: Save, notes: SessionNote[], sessionId: string, text: string) {
  const cur = noteOf(notes, sessionId)
  if (cur) { if (cur.text !== text) await save('session_notes', { id: cur.id, text }) }
  else if (text.trim()) await save('session_notes', { session_id: sessionId, text })
}
