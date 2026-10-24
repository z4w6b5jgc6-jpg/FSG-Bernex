import { useMemo } from 'react'
import { useData } from './data'
import { pacesOf, type Paces } from './targets'

/** Allures de référence de chaque athlète, recalculées quand les tests ou les records changent */
export function usePaces(): (athleteId: string) => Paces {
  const { athletes, tests, test_results, records } = useData()
  return useMemo(() => {
    const all = new Map(athletes.map((a) => [a.id, pacesOf(a.id, tests, test_results, records)]))
    return (id: string) => all.get(id) ?? pacesOf(id, tests, test_results, records)
  }, [athletes, tests, test_results, records])
}
