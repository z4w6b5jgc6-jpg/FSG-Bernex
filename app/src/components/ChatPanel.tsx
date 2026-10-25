import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useData } from '../lib/data'
import { redactNames, redactSession } from '../lib/redact'
import { parseSessionText } from '../lib/sessionText'
import type { ChatMessage, Session } from '../types'
import { errorMessage, todayISO } from '../lib/utils'
import { RichText } from './RichText'

export const PERIODS = ['Préparation générale', 'Préparation spécifique', 'Pré-compétition', 'Compétition', 'Récupération / transition']

/** Une réponse ressemble-t-elle à une séance complète ? (blocs + exercices) */
function sessionIn(text: string, title: string) {
  const lines = text.split('\n').map((l) => l.replace(/\*\*/g, ''))
  // On ignore la phrase d'introduction : la séance commence au premier titre (« ## … » ou « Titre : »)
  const first = lines.findIndex((l) => /^#{1,4}\s+|^[^:]{2,50}:\s*$/.test(l.trim()))
  const body = (first >= 0 ? lines.slice(first) : lines).map((l) => l.replace(/^#{1,4}\s+(.*?)\s*:?\s*$/, '$1 :'))
  const parsed = parseSessionText(['Mercredi 1 janvier 2031', ...body], title)
  const s = parsed.sessions[0]
  return s && s.blocks.length >= 2 && s.blocks.reduce((n, b) => n + b.items.length, 0) >= 4 ? s : null
}

/** Conversation avec l'assistant entraîneur (IA de Cloudflare), noms d'athlètes masqués avant l'envoi */
export function ChatPanel({ session, storageKey }: { session?: Session | null; storageKey: string }) {
  const { athletes, competitions, save } = useData()
  const nav = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>(() => { try { return JSON.parse(sessionStorage.getItem(storageKey) ?? '[]') } catch { return [] } })
  const [input, setInput] = useState('')
  const [period, setPeriod] = useState(() => { try { return localStorage.getItem('athle-period') ?? '' } catch { return '' } })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [masked, setMasked] = useState(0)
  const [created, setCreated] = useState<Record<number, string>>({})
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(messages)) } catch { /* ignore */ } }, [messages, storageKey])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, busy])

  const today = todayISO()
  const next = competitions.filter((c) => (c.end_date || c.date) >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
  const days = next ? Math.round((new Date(next.date).getTime() - new Date(today).getTime()) / 86400000) : null
  const context = [
    period && `Période : ${period}.`,
    next && `Prochaine compétition (niveau ${next.level}) dans ${days} jours.`,
  ].filter(Boolean).join(' ')

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const { text: safe, count } = redactNames(q, athletes)
    setMasked((m) => m + count)
    // Le contexte (période, prochaine compétition) accompagne le premier message
    const content = messages.length === 0 && context ? `${context}\n\n${safe}` : safe
    const nextMsgs: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMsgs); setInput(''); setErr(null); setBusy(true)
    try {
      const reply = await api.chat(nextMsgs, session ? redactSession(session, athletes) : null)
      setMessages([...nextMsgs, { role: 'assistant', content: reply }])
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); send(input) }

  const create = async (i: number, text: string) => {
    const s = sessionIn(text, 'Séance proposée')
    if (!s) return
    const title = prompt('Nom de la nouvelle séance :', session ? `${session.title} (variante)` : 'Séance proposée par l’assistant')
    if (!title) return
    try {
      const saved = await save('sessions', { title, objective: period ? `${period}` : '', focus: session?.focus ?? '', duration_min: session?.duration_min ?? 120, blocks: s.blocks })
      setCreated({ ...created, [i]: saved.id })
    } catch (e) {
      setErr(errorMessage(e))
    }
  }

  const quick = session
    ? ['Il pleut : propose un plan B en salle avec la même intention', 'Il fait très froid : comment adapter l’échauffement et la séance ?', 'Propose une version allégée (veille de compétition)', 'Les récupérations sont-elles adaptées ?']
    : ['Propose une séance de vitesse de 2 h selon la période', 'Il pleut : séance de remplacement en salle (sauts et vitesse)', 'Mon intention : travailler l’impulsion en longueur. Propose une séance', 'Comment organiser les 4 prochaines semaines avant la compétition ?']

  return (
    <div className="chat">
      <div className="row gap wrap chat-context">
        <select value={period} onChange={(e) => { setPeriod(e.target.value); try { localStorage.setItem('athle-period', e.target.value) } catch { /* ignore */ } }}>
          <option value="">Période de préparation…</option>
          {PERIODS.map((p) => <option key={p}>{p}</option>)}
        </select>
        {next && <span className="tiny muted">Prochaine compétition dans {days} j (niveau {next.level})</span>}
        {messages.length > 0 && <button className="btn ghost small" onClick={() => { setMessages([]); setCreated({}) }}>Nouvelle discussion</button>}
      </div>

      <div className="chat-list">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="small muted">Dis l’intention de la séance, la météo, la période… L’assistant propose, tu décides.</p>
            <div className="chips-wrap">{quick.map((q) => <button key={q} className="mini-chip" onClick={() => send(q)}>{q}</button>)}</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === 'assistant' ? <RichText text={m.content} /> : <span>{m.content}</span>}
            {m.role === 'assistant' && sessionIn(m.content, 'x') && (
              created[i]
                ? <button className="btn small" onClick={() => nav(`/seances/${created[i]}`)}>✓ Séance créée — l’ouvrir</button>
                : <button className="btn small" onClick={() => create(i, m.content)}>Créer cette séance</button>
            )}
          </div>
        ))}
        {busy && <div className="bubble assistant muted">L’assistant réfléchit…</div>}
        <div ref={end} />
      </div>

      {err && <div className="alert warn small">{err}</div>}
      <form className="chat-input" onSubmit={submit}>
        <textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écris ta question… (ex. il pleut, que faire à la place ?)"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(input) } }} />
        <button className="btn primary" disabled={busy || !input.trim()}>Envoyer</button>
      </form>
      <p className="tiny muted">Les noms de tes athlètes sont masqués avant l’envoi{masked ? ` (${masked} masqué${masked > 1 ? 's' : ''})` : ''}. Évite d’écrire des informations de santé. IA de Cloudflare, rien n’est conservé.</p>
    </div>
  )
}
