import { useMemo, useState } from 'react'
import { BackLink } from '../components/BackLink'
import { useNavigate } from 'react-router-dom'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import { FOCUSES, OLD_VENUES, VENUES } from '../data/defaults'
import { matchAthlete, type Cell } from '../lib/importResults'
import { defaultLocation, parsePlanGrid, parseSessions, type SessionIn } from '../lib/importSessions'
import { docxLines, parseSessionText } from '../lib/sessionText'
import { noteOf, saveNote, splitRemarks } from '../lib/notes'
import type { Assignment, Athlete } from '../types'
import { errorMessage, formatDate, fullName, parseISODate } from '../lib/utils'

// ids / unknown : plan par groupes, athlètes de la séance retrouvés (ou non) dans l'app
// notes : « Remarques » du fichier, rangées dans les notes du coach (pas dans la séance)
interface Row extends SessionIn { include: boolean; location: string; ids: string[]; unknown: string[]; fileLocation: boolean; notes: string }

// « Demi-fond S03 – Côtes courtes » → « demifonds03 » : même séance même si la fin du titre change dans le fichier
// (« Lundi S01 · 400 / Demi-fond (800) » garde son groupe : « lundis01400demifond800 »)
const squash = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
function seriesKey(title: string): string {
  const m = title.match(/^(.*?\bS\d{1,2})\b/i)
  return m ? squash(m[1] + (title.match(/·\s*(.+)$/)?.[1] ?? '')) : squash(title)
}
// Contenu comparable (sans les identifiants) : pour savoir si le fichier a changé
const contentOf = (x: Pick<SessionIn, 'title' | 'objective' | 'blocks'>) =>
  JSON.stringify([x.title, x.objective, x.blocks.map((b) => [b.title, b.items.map((i) => [i.name, i.sets, i.reps, i.distance, i.duration, i.recovery, i.intensity, i.notes])])])

// Spécialités sans saut ni sprint : décochées par défaut (demi-fond, fond, lancers)
const OTHER_EVENTS = /(400|800|1500|3000|fond|cross|poids|javelot|disque|marteau|lancer)/i
const JUMP_EVENTS = /(longueur|triple|saut|sprint|haies|\b(60|80|100|200) ?m)/i
const notForJumps = (a: Athlete) => OTHER_EVENTS.test(a.events) && !JUMP_EVENTS.test(a.events)

/** Import d'un plan de séances (Excel : une ligne par exercice) → séances types, planifiées si on le souhaite */
export function ImportSessions() {
  const { sessions, assignments, groups, athletes, session_notes, save, saveMany, reload } = useData()
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

  const [refresh, setRefresh] = useState(true)
  // Déjà importée : planifiée à la même date dans la même série (ou même titre) ; sinon séance type du même titre
  const plannedOf = (r: Row) => (r.date ? assignments.find((a) => {
    const t = sessions.find((x) => x.id === a.session_id)?.title
    return a.date === r.date && !!t && seriesKey(t) === seriesKey(r.title)
  }) : undefined)
  const existing = (r: Row) => { const a = plannedOf(r); return a ? sessions.find((x) => x.id === a.session_id) : sessions.find((x) => x.title === r.title) }
  const exists = (r: Row) => !!existing(r)
  // Contenu modifié dans le fichier (séance planifiée à cette date seulement)
  const changed = (r: Row) => {
    const e = plannedOf(r) && existing(r)
    return !!e && (contentOf(e) !== contentOf(r) || (!!r.notes && (noteOf(session_notes, e.id)?.text ?? '') !== r.notes))
  }
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs && rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const active = useMemo(() => athletes.filter((a) => a.active).sort((a, b) => fullName(a).localeCompare(fullName(b))), [athletes])
  const show = (found: SessionIn[]) => setRows(found.map((s) => {
    const ids: string[] = [], unknown: string[] = []
    for (const name of s.who ?? []) {
      const [first, ...last] = name.split(/\s+/)
      const m = matchAthlete({ key: '', first, last: last.join(' '), age: null, year: null, events: '' }, active)
      if (m && !ids.includes(m.athlete.id)) ids.push(m.athlete.id)
      else if (!m) unknown.push(name)
    }
    const { blocks, remarks } = splitRemarks(s.blocks)
    return { ...s, blocks, notes: remarks, include: true, location: s.location || defaultLocation(s.date), ids, unknown, fileLocation: !!s.location }
  }))
  // Plan par groupes : chaque séance a ses athlètes (onglet des athlètes du fichier)
  const perRow = !!rows?.some((r) => r.who)
  const toggleId = (r: Row, id: string) => set(r.key, { ids: r.ids.includes(id) ? r.ids.filter((i) => i !== id) : [...r.ids, id] })
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
      const input = sheets.map((s) => ({ name: s.sheet, rows: s.data as Cell[][] }))
      // Une ligne par exercice, sinon plan en grille (une ligne par séance, une colonne par partie)
      const found = parseSessions(input) ?? parsePlanGrid(input, base)
      if (!found?.length) return setErr('Je n’ai trouvé ni tableau avec une colonne « Exercice », ni plan avec une colonne « Date » et une colonne par partie de séance.')
      show(found)
    } catch (e) {
      setErr('Impossible de lire ce fichier : ' + errorMessage(e))
    }
  }

  const chosen = rows?.filter((r) => r.include) ?? []
  const weekday = (d: string) => (d ? parseISODate(d).getDay() : -1)
  const fresh = chosen.filter((r) => !exists(r))
  const toRefresh = refresh ? chosen.filter(changed) : []
  const toUpdate = plan ? chosen.filter((r) => plannedOf(r)).length : 0
  // Jour habituel du fichier (le plus fréquent) : on signale les dates qui s'en écartent
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const r of rows ?? []) if (r.date) counts[weekday(r.date)]++
  const usual = counts.indexOf(Math.max(...counts))
  const offDays = chosen.filter((r) => r.date && weekday(r.date) !== usual)
  const unknownAll = [...new Set(chosen.flatMap((r) => r.unknown))]
  const nobody = perRow ? chosen.filter((r) => r.ids.length === 0).length : 0
  const canPlan = perRow || !!group

  const run = async () => {
    setBusy(true)
    setErr(null)
    try {
      // Séances modifiées dans le fichier : contenu mis à jour (retours des athlètes conservés).
      // Une séance aussi planifiée à d'autres dates est copiée pour ne changer que celle-ci.
      const shared = (r: Row) => assignments.some((a) => a.session_id === existing(r)!.id && a.date !== r.date)
      for (const r of toRefresh.filter((x) => !shared(x))) {
        await save('sessions', { id: existing(r)!.id, title: r.title, objective: r.objective, blocks: r.blocks })
        if (r.notes) await saveNote(save, session_notes, existing(r)!.id, r.notes)
      }
      const copies = toRefresh.filter(shared)
      const created = await saveMany('sessions', [...fresh, ...copies].map((r) => ({
        title: r.title, objective: r.objective, focus: fresh.includes(r) ? focus : existing(r)!.focus, duration_min: 120, blocks: r.blocks,
      })))
      const ids = new Map([...fresh, ...copies].map((r, i) => [r.key, created[i].id]))
      for (const [i, r] of [...fresh, ...copies].entries()) if (r.notes) await saveNote(save, session_notes, created[i].id, r.notes)
      if (plan && canPlan) {
        const rows = []
        for (const r of chosen) {
          if (!r.date || (perRow && r.ids.length === 0)) continue
          const t = perRow ? { group_id: null, athlete_ids: r.ids } : target()
          const done = plannedOf(r)
          // « pour qui », et lieu / heure s'ils sont dans le fichier (ou un ancien libellé de lieu proposé par l'app)
          if (done) {
            await save('assignments', {
              id: done.id, ...t,
              ...(ids.has(r.key) ? { session_id: ids.get(r.key) } : {}),
              ...(r.fileLocation || OLD_VENUES.includes(done.location) ? { location: r.location } : {}),
              ...(r.time ? { time: r.time } : {}),
            })
          }
          else rows.push({ session_id: ids.get(r.key) ?? existing(r)!.id, date: r.date, time: r.time || time, location: r.location, ...t, note: '' })
        }
        await saveMany('assignments', rows)
      }
      await reload()
      nav(plan && canPlan ? '/planning' : '/seances')
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
            {rows.some(changed) && (
              <label className="check">
                <input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} />
                <span><b>Mettre à jour</b> les {rows.filter(changed).length} séance(s) déjà importée(s) et modifiée(s) dans le fichier <span className="tiny muted">(les retours des athlètes sont gardés ; les changements faits dans l’app sur ces séances sont remplacés)</span></span>
              </label>
            )}
            {plan && perRow && (
              <div className="grid2">
                <p className="small">👥 Une séance par groupe : chacune est planifiée pour les athlètes de son groupe (d’après ton fichier). Tu peux ajuster sous chaque séance.</p>
                <Field label="Heure"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
              </div>
            )}
            {plan && !perRow && (
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
            {plan && !perRow && members.length > 0 && (
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
            <div className="alert warn small">📅 {offDays.length} séance(s) ne tombent pas un {DAYS[usual]} comme les autres : vérifie la date ({offDays.map((r) => formatDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })).join(', ')}).</div>
          )}
          {plan && unknownAll.length > 0 && (
            <div className="alert warn small">🔎 Pas trouvé(s) dans tes athlètes : <b>{unknownAll.join(", ")}</b> — crée leur fiche puis recharge le fichier, ou coche la bonne personne sous la séance.</div>
          )}
          {plan && nobody > 0 && <div className="alert warn small">{nobody} séance(s) sans athlète : elles seront importées mais pas planifiées.</div>}
          <div className="import-sessions">
            {rows.map((r) => (
              <div key={r.key} className={`card form ${r.include ? '' : 'muted'}`}>
                <label className="check">
                  <input type="checkbox" checked={r.include} onChange={(e) => set(r.key, { include: e.target.checked })} />
                  <span><b>{r.title}</b>{exists(r) && (
                    <span className="tiny muted"> · {plannedOf(r)
                      ? changed(r) ? (refresh ? '✏️ modifiée dans le fichier : mise à jour' : 'modifiée dans le fichier (pas mise à jour)') : 'déjà importée, inchangée'
                      : 'déjà dans tes séances'}</span>
                  )}</span>
                </label>
                <div className="grid2">
                  <Field label="Date">
                    <input type="date" value={r.date} className={r.date && weekday(r.date) !== usual ? 'attention' : ''} onChange={(e) => set(r.key, { date: e.target.value, location: defaultLocation(e.target.value) })} />
                  </Field>
                  {plan && <Field label="Lieu"><input list="venues" value={r.location} onChange={(e) => set(r.key, { location: e.target.value })} /></Field>}
                </div>
                <Field label="Titre"><input value={r.title} onChange={(e) => set(r.key, { title: e.target.value })} /></Field>
                {r.objective && <div className="tiny muted">🎯 {r.objective}</div>}
                {plan && r.who && (
                  <details className="small">
                    <summary>👥 {r.ids.length ? r.ids.map((id) => active.find((a) => a.id === id)?.first_name).filter(Boolean).join(', ') : 'Personne'}{r.unknown.length > 0 && <span className="muted"> · introuvable(s) : {r.unknown.join(', ')}</span>}</summary>
                    <div className="pick-list">
                      {active.map((a) => (
                        <label key={a.id} className={`pick ${r.ids.includes(a.id) ? '' : 'off'}`}>
                          <input type="checkbox" checked={r.ids.includes(a.id)} onChange={() => toggleId(r, a.id)} /> {fullName(a)}
                        </label>
                      ))}
                    </div>
                  </details>
                )}
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
            <button className="btn primary block" disabled={busy || chosen.length === 0 || (plan && !canPlan) || (plan && !perRow && members.length > 0 && out.length === members.length)} onClick={run}>
              {busy ? 'Import…' : [
                fresh.length > 0 && `Importer ${fresh.length} séance(s)${plan && canPlan ? ' et les planifier' : ''}`,
                toRefresh.length > 0 && `mettre à jour ${toRefresh.length} séance(s) modifiée(s)`,
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
