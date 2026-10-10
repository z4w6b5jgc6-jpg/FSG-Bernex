import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type Draft, type Row } from '../api'
import type { Coach, TableName, Tables } from '../types'

type Store = { [K in TableName]: Tables[K][] }

interface DataCtx extends Store {
  coach: Coach | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  save: <K extends TableName>(table: K, row: Draft<K>) => Promise<Row<K>>
  saveMany: <K extends TableName>(table: K, rows: Draft<K>[]) => Promise<Row<K>[]>
  remove: (table: TableName, id: string) => Promise<void>
}

const empty: Store = { groups: [], athletes: [], exercises: [], sessions: [], assignments: [], feedback: [] }
const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [coach, setCoach] = useState<Coach | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [store, setStore] = useState<Store>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getCoach().then((c) => {
      setCoach(c)
      setAuthReady(true)
    })
    return api.onAuthChange(setCoach)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [groups, athletes, exercises, sessions, assignments, feedback] = await Promise.all([
        api.list('groups'), api.list('athletes'), api.list('exercises'),
        api.list('sessions'), api.list('assignments'), api.list('feedback'),
      ])
      setStore({ groups, athletes, exercises, sessions, assignments, feedback })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (coach) reload()
    else setStore(empty)
  }, [coach, reload])

  // Rafraîchit les données quand l'app revient au premier plan sur le téléphone
  useEffect(() => {
    if (!coach) return
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [coach, reload])

  const save = useCallback(async <K extends TableName>(table: K, row: Draft<K>) => {
    const saved = await api.save(table, row)
    setStore((s) => {
      const rows = s[table] as Row<K>[]
      const exists = rows.some((r) => (r as { id: string }).id === (saved as { id: string }).id)
      const next = exists
        ? rows.map((r) => ((r as { id: string }).id === (saved as { id: string }).id ? saved : r))
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

  if (!authReady) return null

  return (
    <Ctx.Provider value={{ ...store, coach, loading, error, reload, save, saveMany, remove }}>
      {children}
    </Ctx.Provider>
  )
}

export function useData(): DataCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData hors DataProvider')
  return ctx
}
