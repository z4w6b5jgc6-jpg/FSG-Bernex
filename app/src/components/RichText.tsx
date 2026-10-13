import { Fragment, type ReactNode } from 'react'

/** Mise en forme simple : "## titre", "- liste", "1. liste", **gras** */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>)
    out.push(list.ordered ? <ol key={out.length}>{items}</ol> : <ul key={out.length}>{items}</ul>)
    list = null
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const bullet = line.match(/^[-•*]\s+(.*)/)
    const num = line.match(/^\d+\.\s+(.*)/)
    if (bullet || num) {
      const ordered = !!num
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] } }
      list.items.push((bullet ?? num)![1])
      continue
    }
    flush()
    if (!line) continue
    const h = line.match(/^#{1,4}\s+(.*)/)
    if (h) out.push(<h3 key={out.length}>{inline(h[1].replace(/\*\*/g, ''))}</h3>)
    else out.push(<p key={out.length}>{inline(line)}</p>)
  }
  flush()
  return <div className="rich">{out}</div>
}
