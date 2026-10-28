import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { Modal } from './ui'
import type { Athlete } from '../types'
import { errorMessage } from '../lib/utils'

const COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#64748b']
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

interface Row { first_name: string; last_name: string; birth_year: number | null; group: string; email: string; phone: string; duplicate: boolean }

/** Import de la liste d'athlètes par copier-coller (Excel, Google Sheets, texte) */
export function ImportRoster({ onClose }: { onClose: () => void }) {
  const { athletes, groups, save, saveMany } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const rows = useMemo<Row[]>(() => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    return lines
      .map((l) => l.split(/\t|;|,(?=\s*\S)/).map((c) => c.trim()))
      .filter((c) => !/pr[ée]nom/i.test(c[0] ?? '')) // ligne d'en-tête
      .map((c) => {
        const year = (c[2] ?? '').match(/(19|20)\d{2}/)
        const first = c[0] ?? ''
        const last = c[1] ?? ''
        return {
          first_name: first, last_name: last, birth_year: year ? Number(year[0]) : null,
          group: c[3] ?? '', email: (c.find((x) => x.includes('@')) ?? '').toLowerCase(),
          phone: c.find((x, i) => i >= 4 && /^\+?[\d\s.]{9,}$/.test(x)) ?? '',
          duplicate: athletes.some((a) => norm(a.first_name) === norm(first) && norm(a.last_name) === norm(last)),
        }
      })
      .filter((r) => r.first_name)
  }, [text, athletes])

  const toCreate = rows.filter((r) => !r.duplicate)
  const newGroups = [...new Set(toCreate.map((r) => r.group).filter((g) => g && !groups.some((x) => norm(x.name) === norm(g))))]

  const submit = async () => {
    setBusy(true)
    try {
      const ids = new Map(groups.map((g) => [norm(g.name), g.id]))
      for (const [i, name] of newGroups.entries()) {
        const g = await save('groups', { name, color: COLORS[(groups.length + i) % COLORS.length] })
        ids.set(norm(name), g.id)
      }
      await saveMany('athletes', toCreate.map((r): Partial<Athlete> => ({
        first_name: r.first_name, last_name: r.last_name, birth_year: r.birth_year,
        group_id: r.group ? ids.get(norm(r.group)) ?? null : null, email: r.email, phone: r.phone,
      })))
      onClose()
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Importer ma liste d’athlètes" onClose={onClose}>
      <div className="form">
        <p className="small">
          Copie les lignes depuis Excel ou Google Sheets et colle-les ici. Une ligne par athlète, colonnes dans cet ordre :
        </p>
        <code className="block">Prénom · Nom · Année de naissance · Groupe · Email · Téléphone</code>
        <p className="tiny muted">Seuls le prénom et le nom sont obligatoires. Les groupes inconnus seront créés. L’email permet de relier l’inscription de l’athlète à coup sûr.</p>
        <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={'Prénom\tNom\tAnnée\tGroupe\tE-mail'} />
        {rows.length > 0 && (
          <div className="import-preview">
            <table className="table small">
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.duplicate ? 'muted' : ''}>
                    <td><b>{r.first_name} {r.last_name}</b></td>
                    <td>{r.birth_year ?? ''}</td>
                    <td>{r.group}</td>
                    <td className="tiny">{r.duplicate ? 'déjà dans ta liste' : r.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {newGroups.length > 0 && <p className="tiny">Nouveaux groupes : {newGroups.join(', ')}</p>}
          </div>
        )}
        <div className="row gap end">
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" disabled={busy || toCreate.length === 0} onClick={submit}>
            Importer {toCreate.length > 0 && `${toCreate.length} athlète(s)`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
