import { createDemoApi } from './demoApi'
import { createSupabaseApi } from './supabaseApi'
import { readConfig } from './config'
import type { Api } from './types'

const config = readConfig(import.meta.env.VITE_SUPABASE_URL as string | undefined, import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

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
