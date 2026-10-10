// Lecture et contrôle de la configuration Supabase (variables d'environnement Netlify).
// Corrige les erreurs de collage courantes et explique clairement ce qui ne va pas.

/** Nettoie une valeur collée : espaces, guillemets, « NOM= » recopié avec la valeur */
export function cleanEnv(v: string | undefined): string {
  return (v ?? '')
    .trim()
    .replace(/^[A-Z_]+\s*=\s*/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
}

export interface SupabaseConfig { url: string; key: string }
export type ConfigResult = { kind: 'demo' } | { kind: 'ok'; config: SupabaseConfig } | { kind: 'error'; problems: string[] }

const mask = (v: string) => (v ? `« ${v.slice(0, 14)}… » (${v.length} caractères)` : '(vide)')

export function readConfig(rawUrl: string | undefined, rawKey: string | undefined): ConfigResult {
  const url = cleanEnv(rawUrl).replace(/\/+$/, '')
  const key = cleanEnv(rawKey)
  if (!url && !key) return { kind: 'demo' }
  const problems: string[] = []
  if (!url) problems.push('La variable VITE_SUPABASE_URL est absente.')
  else if (!/^https:\/\/[^\s/]+\.[^\s/]+$/.test(url))
    problems.push(`VITE_SUPABASE_URL n’est pas une adresse valide : ${mask(url)}. Elle doit ressembler à https://abcdefgh.supabase.co`)
  if (!key) problems.push('La variable VITE_SUPABASE_ANON_KEY est absente.')
  else if (/^sb_secret_|service_role/.test(key))
    problems.push('⚠️ VITE_SUPABASE_ANON_KEY contient la clé SECRÈTE. Remplace-la immédiatement par la clé publique (sb_publishable_… ou anon public), puis régénère la clé secrète dans Supabase.')
  else if (!/^(sb_publishable_|eyJ)/.test(key))
    problems.push(`VITE_SUPABASE_ANON_KEY ne ressemble pas à une clé publique Supabase : ${mask(key)}. Elle doit commencer par sb_publishable_ (ou eyJ pour l’ancienne clé « anon »).`)
  if (/\s/.test(key)) problems.push('VITE_SUPABASE_ANON_KEY contient un espace ou un retour à la ligne : recolle-la en une seule fois.')
  return problems.length ? { kind: 'error', problems } : { kind: 'ok', config: { url, key } }
}
