import { useState } from 'react'
import { Link } from 'react-router-dom'
import schema from '../../../supabase/schema.sql?raw'
import { supabaseUrl } from '../api'

/** Mise à jour de la base Supabase : copier le script en un toucher, puis le coller dans le SQL Editor */
export function DbUpdate() {
  const [copied, setCopied] = useState(false)
  const ref = supabaseUrl?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
  const editor = ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : 'https://supabase.com/dashboard'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(schema)
      setCopied(true)
    } catch {
      const t = document.querySelector<HTMLTextAreaElement>('#schema')
      t?.select()
      document.execCommand('copy')
      setCopied(true)
    }
  }

  return (
    <div className="login">
      <div className="card login-card form">
        <h2>🛠️ Mise à jour de la base</h2>
        <ol className="small steps">
          <li>Touche <b>Copier le script</b>.</li>
          <li>Touche <b>Ouvrir Supabase</b> (connecte-toi si besoin) : une nouvelle requête s’ouvre.</li>
          <li>Colle dans la grande zone (appui long → <i>Coller</i>, ou ⌘V), puis touche <b>Run</b>.</li>
          <li>« Success. No rows returned » : c’est fait ✅. Tes données ne sont pas touchées.</li>
        </ol>
        <button className="btn primary block" onClick={copy}>{copied ? '✅ Copié !' : '📋 Copier le script'}</button>
        <a className="btn block" href={editor} target="_blank" rel="noreferrer">↗️ Ouvrir Supabase</a>
        <details>
          <summary className="tiny muted">Voir le script ({Math.round(schema.length / 1000)} ko)</summary>
          <textarea id="schema" readOnly rows={8} value={schema} className="mono tiny" />
        </details>
        <Link to="/" className="small center">← Retour à l’app</Link>
      </div>
    </div>
  )
}
