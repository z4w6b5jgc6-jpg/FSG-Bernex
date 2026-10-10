import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
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
}

const TABLES: TableName[] = ['groups', 'athletes', 'athlete_notes', 'exercises', 'sessions', 'assignments', 'feedback', 'tips', 'records', 'wellness', 'tests', 'test_results']
const empty = Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Store
const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  const [store, setStore] = useState<Store>(empty)
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
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.all(TABLES.map((t) => api.list(t)))
      setStore(Object.fromEntries(TABLES.map((t, i) => [t, results[i]])) as unknown as Store)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const active = me?.role === 'coach' || me?.role === 'athlete'
  useEffect(() => {
    if (active) reload()
    else setStore(empty)
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
    setStore((s) => {
      const rows = s[table] as Row<K>[]
      const next = rows.some((r) => (r as { id: string }).id === id)
        ? rows.map((r) => ((r as { id: string }).id === id ? saved : r))
        : [...rows, saved]
      return { ...s, [table]: next }
    })
    return saved
  }, [])

  const saveMany = useCallback(async <K extends TableName>(table: K, rows: Draft<K>[]) => {
    const saved = await api.saveMany(table, rows)
    setStore((s) => ({ ...s, [table]: [...(s[table] as Row<K>[]), ...saved] }))
    return saved
  }, [])

  const remove = useCallback(async (table: TableName, id: string) => {
    await api.remove(table, id)
    // Les suppressions en cascade sont gérées par la base : on recharge tout
    await reload()
  }, [reload])

  if (!ready) return null

  return (
    <Ctx.Provider value={{ ...store, me, loading, error, refreshMe, reload, save, saveMany, remove }}>
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
