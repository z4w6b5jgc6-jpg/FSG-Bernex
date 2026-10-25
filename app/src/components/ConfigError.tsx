/** Écran affiché quand les variables Supabase de Netlify sont mal renseignées */
export function ConfigError({ problems }: { problems: string[] }) {
  return (
    <div className="login">
      <div className="card login-card">
        <h1>Configuration à corriger</h1>
        <p>L’app ne peut pas se connecter à la base de données :</p>
        <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="small muted">
          À corriger dans Netlify → Project configuration → Environment variables, puis Deploys → Trigger deploy → Clear cache and deploy site.
        </p>
      </div>
    </div>
  )
}
