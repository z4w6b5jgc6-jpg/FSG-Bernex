import { createDemoApi } from './demoApi'
import { createSupabaseApi } from './supabaseApi'
import { readConfig } from './config'
import type { Api } from './types'

const env = import.meta.env as Record<string, string | undefined>
// Priorité à la configuration du dépôt (app/.env.production), sinon aux variables VITE_* de l'hébergeur
const config = env.COACH_SUPABASE_URL
  ? readConfig(env.COACH_SUPABASE_URL, env.COACH_SUPABASE_ANON_KEY)
  : readConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

/** Adresse du projet Supabase (null en démo) */
export const supabaseUrl = config.kind === 'ok' ? config.config.url : null

/** Problèmes de configuration à afficher à la place de l'app (null si tout va bien) */
export let configProblems: string[] | null = config.kind === 'error' ? config.problems : null

function create(): Api {
  if (config.kind !== 'ok') return createDemoApi()
  try {
    return createSupabaseApi(config.config.url, config.config.key)
  } catch (e) {
    configProblems = [`Supabase refuse la configuration : ${e instanceof Error ? e.message : String(e)}`]
    return createDemoApi()
  }
}

export const api = create()
export type { Api, Draft, Row } from './types'
