import { useMemo, useState } from 'react'
import { BackLink } from '../components/BackLink'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import { FOCUSES, OLD_VENUES, VENUES } from '../data/defaults'
import type { Cell } from '../lib/importResults'
import { defaultLocation, parseSessions, type SessionIn } from '../lib/importSessions'
import { docxLines, parseSessionText } from '../lib/sessionText'
import type { Assignment, Athlete } from '../types'
import { errorMessage, formatDate, fullName, parseISODate } from '../lib/utils'

interface Row extends SessionIn { include: boolean; location: string }

// Spécialités sans saut ni sprint : décochées par défaut (demi-fond, fond, lancers)
const OTHER_EVENTS = /(400|800|1500|3000|fond|cross|poids|javelot|disque|marteau|lancer)/i
const JUMP_EVENTS = /(longueur|triple|saut|sprint|haies|\b(60|80|100|200) ?m)/i
const notForJumps = (a: Athlete) => OTHER_EVENTS.test(a.events) && !JUMP_EVENTS.test(a.events)

/** Import d'un plan de séances (Excel : une ligne par exercice) → séances types, planifiées si on le souhaite */
export function ImportSessions() {
  const { sessions, assignments, groups, athletes, save, saveMany, reload } = useData()
  const nav = useNavigate()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [focus, setFocus] = useState('Sauts')
  const [plan, setPlan] = useState(true)
  const [groupId, setGroupId] = useState('')
  const [time, setTime] = useState('18:00')
  const [open, setOpen] = useState<string | null>(null)
  // Document Word ou texte collé : nom de base des séances (« Longueur » → « Longueur S01 – … »)
  const [base, setBase] = useState('Séance')
  const [paste, setPaste] = useState('')
  const [skipped, setSkipped] = useState<string[]>([])
  const group = groupId || groups[0]?.id || ''
  const members = useMemo(() => athletes.filter((a) => a.active && a.group_id === group).sort((a, b) => fullName(a).localeCompare(fullName(b))), [athletes, group])
  // Athlètes du groupe exclus de ces séances (null = proposition d'après la spécialité)
  const [excluded, setExcluded] = useState<Record<string, string[]>>({})
  const out = excluded[group] ?? members.filter(notForJumps).map((a) => a.id)
  const toggleOut = (id: string) => setExcluded((x) => ({ ...x, [group]: out.includes(id) ? out.filter((i) => i !== id) : [...out, id] }))
  // Tout le groupe → planifié pour le groupe (les nouveaux inscrits suivent) ; sinon → liste d'athlètes
  const target = (): Pick<Assignment, 'group_id' | 'athlete_ids'> =>
    out.length === 0 ? { group_id: group, athlete_ids: [] } : { group_id: null, athlete_ids: members.filter((a) => !out.includes(a.id)).map((a) => a.id) }

  const existing = (r: Row) => sessions.find((s) => s.title === r.title)
  const exists = (r: Row) => !!existing(r)
  const plannedOf = (r: Row) => { const s = existing(r); return s ? assignments.find((a) => a.session_id === s.id && a.date === r.date) : undefined }
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs && rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const show = (found: SessionIn[]) => setRows(found.map((s) => ({ ...s, include: true, location: defaultLocation(s.date) })))
  const fromText = (lines: string[]) => {
    const { sessions: found, skipped: sk } = parseSessionText(lines, base)
    setSkipped(sk)
    if (!found.length) return setErr('Je n’ai trouvé aucune date de séance (ex. « Mercredi 28 octobre 2026 ») dans ce texte.')
    show(found)
  }

  const onFile = async (file: File) => {
    setErr(null)
    setSkipped([])
    try {
      if (/\.docx$/i.test(file.name)) return fromText(docxLines(await file.arrayBuffer()))
      if (/\.txt$/i.test(file.name)) return fromText((await file.text()).split(/\r?\n/))
      const { default: readXlsxFile } = await import('read-excel-file/browser')
      const sheets = await readXlsxFile(file)
      const found = parseSessions(sheets.map((s) => ({ name: s.sheet, rows: s.data as Cell[][] })))
      if (!found?.length) return setErr('Je n’ai pas trouvé de tableau avec une colonne « Exercice ».')
      show(found)
    } catch (e) {
      setErr('Impossible de lire ce fichier : ' + errorMessage(e))
    }
  }

  const chosen = rows?.filter((r) => r.include) ?? []
  const weekday = (d: string) => (d ? parseISODate(d).getDay() : -1)
  const fresh = chosen.filter((r) => !exists(r))
  const toUpdate = plan ? chosen.filter((r) => plannedOf(r)).length : 0
  const offDays = chosen.filter((r) => r.date && weekday(r.date) !== 3)

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      // Séances déjà dans l'app : leur contenu n'est pas touché (tu as pu les modifier)
      const created = await saveMany('sessions', fresh.map((r) => ({
        title: r.title, objective: r.objective, focus, duration_min: 120, blocks: r.blocks,
      })))
      const ids = new Map(fresh.map((r, i) => [r.key, created[i].id]))
      if (plan && group) {
        const t = target()
        const rows = []
        for (const r of chosen) {
          if (!r.date) continue
          const done = plannedOf(r)
          // seulement « pour qui » (et un ancien libellé de lieu proposé par l'app)
          if (done) await save('assignments', { id: done.id, ...t, ...(OLD_VENUES.includes(done.location) ? { location: r.location } : {}) })
          else rows.push({ session_id: ids.get(r.key) ?? existing(r)!.id, date: r.date, time, location: r.location, ...t, note: '' })
        }
        await saveMany('assignments', rows)
      }
      await reload()
      nav(plan && group ? '/planning' : '/seances')
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <BackLink to="/seances" label="Séances" />
      <h1>Importer des séances</h1>
      <div className="card form">
        <p className="small">
          <b>Ton document Word</b> (.docx), tel que tu l’écris : chaque date (« Mercredi 28 octobre 2026 ») commence une séance,
          « Cycle 2 – Phase intensive » donne l’objectif, « Gainage : » ou « Éducatifs » ouvre un bloc, les autres lignes sont les exercices.
          Ou un <b>tableau Excel</b> (une ligne par exercice). Tu vérifies tout dans l’aperçu avant d’importer.
        </p>
        <Field label="Nom des séances (document Word ou texte)" hint="Ex. « Longueur » → Longueur S01, S02…">
          <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="Longueur, Vitesse, Haies…" />
        </Field>
        <input type="file" accept=".docx,.xlsx,.txt" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <details>
          <summary className="small">…ou coller le texte</summary>
          <div className="form">
            <textarea rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Mercredi 28 octobre 2026\nÉchauffement 4 tours et stretching 20 min\nÉducatifs :\nTalon-fesses 4 x 30m\nSkipping 4 x 30m\nRetour au calme : stretching'} />
            <button className="btn small" disabled={!paste.trim()} onClick={() => { setErr(null); fromText(paste.split(/\r?\n/)) }}>Analyser</button>
          </div>
        </details>
        <a className="small" href="modele-seances.xlsx" download>📄 Télécharger le modèle Excel</a>
        {err && <div className="alert warn">{err}</div>}
        {skipped.length > 0 && (
          <details className="alert info small">
            <summary>{skipped.length} ligne(s) avant la première date, non importée(s)</summary>
            <ul className="plain">{skipped.slice(0, 20).map((l, i) => <li key={i}>{l}</li>)}</ul>
          </details>
        )}
      </div>

      {rows && (
        <>
          <section className="card form">
            <Field label="Thème des séances">
              <select value={focus} onChange={(e) => setFocus(e.target.value)}>
                {FOCUSES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <label className="check"><input type="checkbox" checked={plan} onChange={(e) => setPlan(e.target.checked)} /> <span><b>Planifier aussi</b> chaque séance à sa date</span></label>
            {plan && (
              <div className="grid2">
                <Field label="Groupe">
                  <select value={group} onChange={(e) => setGroupId(e.target.value)}>
                    {groups.length === 0 && <option value="">— Crée d’abord un groupe —</option>}
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </Field>
                <Field label="Heure"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
              </div>
            )}
            {plan && members.length > 0 && (
              <div className="form">
                <div className="row gap wrap">
                  <b className="small">Pour qui ? <span className="muted">({members.length - out.length} sur {members.length})</span></b>
                  <button type="button" className="btn small" onClick={() => setExcluded((x) => ({ ...x, [group]: [] }))}>✓ Tout sélectionner</button>
                  <button type="button" className="btn small ghost" onClick={() => setExcluded((x) => ({ ...x, [group]: members.map((m) => m.id) }))}>✕ Aucun</button>
                </div>
                <div className="pick-list">
                  {members.map((a) => (
                    <label key={a.id} className={`pick ${out.includes(a.id) ? 'off' : ''}`}>
                      <input type="checkbox" checked={!out.includes(a.id)} onChange={() => toggleOut(a.id)} /> {fullName(a)}{a.events && <span className="tiny muted"> · {a.events}</span>}
                    </label>
                  ))}
                </div>
                <p className="tiny muted">
                  {out.length === 0
                    ? 'Planifiées pour tout le groupe : les futurs inscrits les recevront aussi.'
                    : `Planifiées seulement pour les ${members.length - out.length} athlète(s) coché(s). Un nouvel inscrit ne les reçoit pas : ajoute-le depuis la séance dans le planning.`}
                </p>
              </div>
            )}
            {plan && <p className="tiny muted">Lieu proposé : Evaux d’avril à octobre, Pavillon des sports au Bout-du-Monde de novembre à mars (modifiable par séance).</p>}
          </section>

          <datalist id="venues">{VENUES.map((v) => <option key={v} value={v} />)}</datalist>
          <h2>{rows.length} séance(s) trouvée(s)</h2>
          {offDays.length > 0 && (
            <div className="alert warn small">📅 {offDays.length} séance(s) ne tombent pas un mercredi : vérifie la date ({offDays.map((r) => formatDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })).join(', ')}).</div>
          )}
          <div className="import-sessions">
            {rows.map((r) => (
              <div key={r.key} className={`card form ${r.include ? '' : 'muted'}`}>
                <label className="check">
                  <input type="checkbox" checked={r.include} onChange={(e) => set(r.key, { include: e.target.checked })} />
                  <span><b>{r.title}</b>{exists(r) && <span className="tiny muted"> · déjà dans tes séances{plan && plannedOf(r) ? ' et planifiée : seuls les athlètes seront mis à jour' : ''}</span>}</span>
                </label>
                <div className="grid2">
                  <Field label="Date">
                    <input type="date" value={r.date} className={r.date && weekday(r.date) !== 3 ? 'attention' : ''} onChange={(e) => set(r.key, { date: e.target.value, location: defaultLocation(e.target.value) })} />
                  </Field>
                  {plan && <Field label="Lieu"><input list="venues" value={r.location} onChange={(e) => set(r.key, { location: e.target.value })} /></Field>}
                </div>
                <Field label="Titre"><input value={r.title} onChange={(e) => set(r.key, { title: e.target.value })} /></Field>
                {r.objective && <div className="tiny muted">🎯 {r.objective}</div>}
                <button type="button" className="btn ghost small" onClick={() => setOpen(open === r.key ? null : r.key)}>
                  {open === r.key ? '▾' : '▸'} {r.blocks.length} bloc(s) · {r.blocks.reduce((n, b) => n + b.items.length, 0)} exercice(s)
                </button>
                {open === r.key && r.blocks.map((b) => (
                  <div key={b.id} className="small">
                    <b>{b.title}</b>
                    <ul className="plain">{b.items.map((it) => <li key={it.id}>• {it.name}{it.sets || it.reps ? <span className="muted"> ({[it.sets, it.reps, it.distance].filter(Boolean).join(' × ')})</span> : null}</li>)}</ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="sticky-actions">
            <button className="btn primary block" disabled={busy || chosen.length === 0 || (plan && !group) || (plan && members.length > 0 && out.length === members.length)} onClick={run}>
              {busy ? 'Import…' : [
                fresh.length > 0 && `Importer ${fresh.length} séance(s)${plan && group ? ' et les planifier' : ''}`,
                toUpdate > 0 && `mettre à jour ${toUpdate} planification(s)`,
                chosen.length > fresh.length + toUpdate && plan && `planifier ${chosen.length - fresh.length - toUpdate} séance(s) existante(s)`,
              ].filter(Boolean).join(' · ').replace(/^./, (c) => c.toUpperCase()) || 'Rien à importer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
