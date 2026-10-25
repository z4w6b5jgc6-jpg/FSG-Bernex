import { useState } from 'react'
import { useData } from '../lib/data'
import { subgroupChanges } from '../lib/mondaySync'
import { SUBGROUPS } from '../lib/targets'
import type { Athlete } from '../types'
import { errorMessage } from '../lib/utils'

/** Sous-groupe du plan à temps cibles : il reçoit les prochaines séances de ce sous-groupe */
export function SubgroupSelect({ athlete }: { athlete: Athlete }) {
  const { sessions, assignments, save } = useData()
  const [err, setErr] = useState<string | null>(null)
  const change = async (v: string) => {
    setErr(null)
    try {
      await save('athletes', { id: athlete.id, subgroup: v })
      await Promise.all(subgroupChanges(athlete.id, v, sessions, assignments).map((a) => save('assignments', a)))
    } catch (e) {
      setErr(errorMessage(e))
    }
  }
  return (
    <>
      <label className="field">
        <span>Sous-groupe du plan à temps cibles</span>
        <select value={athlete.subgroup ?? ''} onChange={(e) => change(e.target.value)}>
          <option value="">— Aucun —</option>
          {Object.entries(SUBGROUPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      {err && <div className="alert warn small">{err}</div>}
    </>
  )
}
