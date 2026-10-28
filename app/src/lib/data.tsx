import { applySettings } from './settings'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, type Draft, type Row } from '../api'
import type { Me, TableName, Tables } from '../types'

type Store = { [K in TableName]: Tables[K][] }

interface DataCtx extends Store {
  me: Me | null
  loading: boolean
  error: string | null
  refreshMe: () => Promise<void>
  reload: () => Promise<void>
  save: <K extends TableName>(table: K, row: Draft<K>) => Promise<Row<K>>
  saveMany: <K extends TableName>(table: K, rows: Draft<K>[]) => Promise<Row<K>[]>
  remove: (table: TableName, id: string) => Promise<void>
  removeMany: (table: TableName, ids: string[]) => Promise<void>
}

const TABLES: TableName[] = ['import_history','exercise_logs','evidence_library','attendance', 'session_adjustments', 'availability', 'privacy_acceptances', 'groups', 'athletes', 'athlete_notes', 'exercises', 'sessions', 'assignments', 'feedback', 'tips', 'records', 'wellness', 'tests', 'test_results', 'test_reports', 'competitions', 'messages', 'session_notes']
const empty = Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Store
const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  const [snapshot,setSnapshot]=useState<{owner:string|null;data:Store}>({owner:null,data:empty})
  const requestVersion=useRef(0)
  const store=snapshot.owner===(me?.email??null)?snapshot.data:empty
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshMe = useCallback(async () => {
    try {
      setMe(await api.getMe())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refreshMe()
    return api.onAuthChange(refreshMe)
  }, [refreshMe])

  const reload = useCallback(async () => {
    const owner=me?.email??null
    const version=++requestVersion.current
    setLoading(true)
    setError(null)
    try {
      // Une table absente (base pas encore mise à jour) ne doit pas cacher toutes les autres données
      const results = await Promise.allSettled(TABLES.map((t) => api.list(t)))
      if(version!==requestVersion.current)return
      setSnapshot({owner,data:Object.fromEntries(TABLES.map((t, i) => [t, results[i].status === 'fulfilled' ? results[i].value : []])) as unknown as Store})
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
      if (failed) setError(failed.reason instanceof Error ? failed.reason.message : String(failed.reason))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if(version===requestVersion.current)setLoading(false)
    }
  }, [me?.email])

  const active = me?.role === 'coach' || me?.role === 'athlete'
  useEffect(() => {
    if (active) reload()
    else { requestVersion.current++;setSnapshot({owner:null,data:empty}) }
  }, [active, me?.email, reload])

  // Rafraîchit les données quand l'app revient au premier plan sur le téléphone
  useEffect(() => {
    if (!active) return
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [active, reload])

  const save = useCallback(async <K extends TableName>(table: K, row: Draft<K>) => {
    const saved = await api.save(table, row)
    const id = (saved as { id: string }).id
    const owner=me?.email??null
    setSnapshot((current) => {
      if(current.owner!==owner)return current
      const s=current.data
      const rows = s[table] as Row<K>[]
      const next = rows.some((r) => (r as { id: string }).id === id)
        ? rows.map((r) => ((r as { id: string }).id === id ? saved : r))
        : [...rows, saved]
      return {owner,data:{ ...s, [table]: next }}
    })
    return saved
  }, [me?.email])

  const saveMany = useCallback(async <K extends TableName>(table: K, rows: Draft<K>[]) => {
    const saved = await api.saveMany(table, rows)
    const owner=me?.email??null
    setSnapshot(current=>current.owner!==owner?current:{owner,data:{...current.data,[table]:[...(current.data[table] as Row<K>[]),...saved]}})
    return saved
  }, [me?.email])

  const remove = useCallback(async (table: TableName, id: string) => {
    await api.remove(table, id)
    // Les suppressions en cascade sont gérées par la base : on recharge tout
    await reload()
  }, [reload])

  const removeMany = useCallback(async (table: TableName, ids: string[]) => {
    if (ids.length) await api.removeMany(table, ids)
    await reload()
  }, [reload])

  // réglages de l'espace (lieux, saison, description du groupe) lus par les fonctions qui en dépendent
  applySettings(me?.settings)

  if (!ready) return null

  return (
    <Ctx.Provider value={{ ...store, me, loading, error, refreshMe, reload, save, saveMany, remove, removeMany }}>
      {children}
    </Ctx.Provider>
  )
}

export function useData(): DataCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData hors DataProvider')
  return ctx
}

/** Profil de l'athlète connecté */
export function useMyAthlete() {
  const { me, athletes } = useData()
  return athletes.find((a) => a.id === me?.athlete_id) ?? null
}
