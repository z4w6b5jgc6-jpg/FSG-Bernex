import readXlsxFile from 'read-excel-file/browser'
import { useMemo, useState, useRef } from 'react'
import { downloadXlsx } from '../lib/xlsx'
import { sessionTemplate } from '../lib/sessionTemplate'
import { BackLink } from '../components/BackLink'
import { Link,useNavigate } from 'react-router-dom'
import {api} from '../api'
import { useData } from '../lib/data'
import { Field } from '../components/ui'
import { FOCUSES, OLD_VENUES } from '../data/defaults'
import { MONTHS, seasonRule, venues } from '../lib/settings'
import { matchAthlete, type Cell } from '../lib/importResults'
import { defaultLocation, focusFromLabel, parsePlanGrid, parseSessions, type SessionIn } from '../lib/importSessions'
import { docxTables, parseSessionText } from '../lib/sessionText'
import {docxContent,spreadsheetImageCount} from '../lib/docxContent'
import {plannedMatch,plannedCandidates,inventorySignature,libraryMatch,contentOf,cloneBlocks,dateProblem} from '../lib/importReview'
import {confirmedStrengthCircuit} from '../data/strengthCircuit'
import {SessionIllustrations} from '../components/SessionIllustrations'
import { noteOf, saveNote, splitRemarks } from '../lib/notes'
import { sheetText,looksLikePlan,extractTargets } from '../lib/smartImport'
import { targetLabel } from '../lib/targets'
import type { Assignment, Block, SessionIllustration } from '../types'
import { errorMessage, formatDate, fullName, parseISODate } from '../lib/utils'

// ids / unknown : plan par groupes, athlètes de la séance retrouvés (ou non) dans l'app
// notes : « Remarques » du fichier, rangées dans les notes du coach (pas dans la séance)
interface Row extends SessionIn { include: boolean; location: string; ids: string[]; unknown: string[]; fileLocation: boolean; notes: string }

/** Import d'un plan de séances (Excel : une ligne par exercice) → séances types, planifiées si on le souhaite */
export function ImportSessions() {
  const { sessions, assignments, groups, athletes, session_notes, save, saveMany, reload,loading,error:dataError } = useData()
  const nav = useNavigate()
  const fileRequest=useRef(0)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [focus, setFocus] = useState('auto')
  const [plan, setPlan] = useState(false)
  const [groupId, setGroupId] = useState('')
  const [time, setTime] = useState('18:00')
  const [open, setOpen] = useState<string | null>(null)
  // Document Word ou texte collé : nom de base des séances (« Longueur » → « Longueur S01 – … »)
  const [base, setBase] = useState('Séance')
  const [paste, setPaste] = useState('')
  const [sourceText,setSourceText]=useState('')
  const [filename,setFilename]=useState('Texte collé')
  const [commonBlocks,setCommonBlocks]=useState<Block[]>([])
  const [circuit,setCircuit]=useState('confirmed')
  const [mediaWarnings,setMediaWarnings]=useState<string[]>([])
  const [reviewed,setReviewed]=useState(false)
  const [skipped, setSkipped] = useState<string[]>([])
  const group = groupId || groups[0]?.id || ''
  const members = useMemo(() => athletes.filter((a) => a.active && a.group_id === group).sort((a, b) => fullName(a).localeCompare(fullName(b))), [athletes, group])
  // Athlètes exclus explicitement par le coach pour ce groupe.
  const [excluded, setExcluded] = useState<Record<string, string[]>>({})
  const out = excluded[group] ?? []
  const toggleOut = (id: string) => {setReviewed(false);setExcluded((x) => ({ ...x, [group]: out.includes(id) ? out.filter((i) => i !== id) : [...out, id] }))}
  // Tout le groupe → planifié pour le groupe (les nouveaux inscrits suivent) ; sinon → liste d'athlètes
  const target = (): Pick<Assignment, 'group_id' | 'athlete_ids'> =>
    out.length === 0 ? { group_id: group, athlete_ids: [] } : { group_id: null, athlete_ids: members.filter((a) => !out.includes(a.id)).map((a) => a.id) }

  const [refresh, setRefresh] = useState(false)
  // Déjà importée : planifiée à la même date dans la même série (ou même titre) ; sinon séance type du même titre
  const scopeFor=(r:Row)=>r.who?{group_id:null,athlete_ids:r.ids}:target()
  const plannedOf=(r:Row)=>r.date?plannedMatch(r,scopeFor(r),sessions,assignments):undefined
  const existing=(r:Row)=>{const a=plan?plannedOf(r):undefined;return a?sessions.find(s=>s.id===a.session_id):libraryMatch(r,sessions)}
  const focusFor=(r:Row)=>focus==='auto'?(focusFromLabel(r.title,r.audience)||existing(r)?.focus||''):focus
  const exists = (r: Row) => !!existing(r)
  // Contenu modifié dans le fichier (séance planifiée à cette date seulement)
  const changed = (r: Row) => {
    const e = existing(r)
    return !!e && (e.focus!==focusFor(r) || contentOf(e) !== contentOf(r) || (!!r.notes && (noteOf(session_notes, e.id)?.text ?? '') !== r.notes))
  }
  const set = (key: string, patch: Partial<Row>) => {setReviewed(false);setRows((rs) => rs && rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))}

  const active = useMemo(() => athletes.filter((a) => a.active).sort((a, b) => fullName(a).localeCompare(fullName(b))), [athletes])
  const show = (found: SessionIn[]) => setRows(found.map((s) => {
    const ids: string[] = [], unknown: string[] = []
    for (const name of s.who ?? []) {
      const [first, ...last] = name.split(/\s+/)
      const m = matchAthlete({ key: '', first, last: last.join(' '), age: null, year: null, events: '' }, active)
      if (m?.exact && !ids.includes(m.athlete.id)) ids.push(m.athlete.id)
      else if (!m?.exact) unknown.push(name)
    }
    const { blocks, remarks } = splitRemarks(s.blocks)
    // temps cibles : ceux du plan, sinon ceux écrits dans les exercices (« 200 m à 95 % VMA »)
    const targets = s.targets?.length ? s.targets : extractTargets(blocks)
    return { ...s, blocks, targets, notes: remarks, include: true, location: s.location || defaultLocation(s.date), ids, unknown, fileLocation: !!s.location }
  }))
  // Plan par groupes : chaque séance a ses athlètes (onglet des athlètes du fichier)
  const perRow = !!rows?.some((r) => r.who)
  const toggleId = (r: Row, id: string) => set(r.key, { ids: r.ids.includes(id) ? r.ids.filter((i) => i !== id) : [...r.ids, id] })
  const fromText = (lines: string[],images:Record<string,SessionIllustration>={},titleBase=base) => {
    setSourceText(lines.join('\n'))
    const { sessions: found, skipped: sk,commonBlocks:common } = parseSessionText(lines, titleBase,new Date(),images)
    setCommonBlocks(common)
    setSkipped(sk)
    if (!found.length) return setErr('Format non reconnu : utilise le modèle Excel ou des dates explicites et des titres de blocs dans Word. Aucun envoi à une IA externe.')
    show(found)
  }

  const onFile = async (file: File) => {
    const request=++fileRequest.current
    setErr(null)
    setSkipped([]);setRows(null);setSourceText('');setCommonBlocks([]);setMediaWarnings([]);setReviewed(false);setPlan(false);setRefresh(false)
    setFilename(file.name)
    if(file.size>5*1024*1024)return setErr('Le fichier dépasse 5 Mo. Extrais les feuilles ou pages du programme utiles avant import.')
    try {
      if (/\.docx$/i.test(file.name)) { const data=await file.arrayBuffer();if(request!==fileRequest.current)return;const content=docxContent(data);setMediaWarnings(content.warnings);setSourceText(content.lines.join('\n'));const found=parseSessions(docxTables(data))??parsePlanGrid(docxTables(data),base);if(found?.length){if(Object.keys(content.images).length)setMediaWarnings([...content.warnings,'Illustrations d’un tableau Word à rattacher manuellement : elles ne sont pas associées automatiquement à une ligne.']);return show(found)}const name=base==='Séance'?file.name.match(/longueur|sprint|demi.fond|lancers|haies/i)?.[0]:undefined;const titleBase=name?name.charAt(0).toUpperCase()+name.slice(1):base;if(name)setBase(titleBase);return fromText(content.lines,content.images,titleBase) }
      if (/\.txt$/i.test(file.name)) {const text=await file.text();if(request!==fileRequest.current)return;return fromText(text.split(/\r?\n/))}
      const sheets = await readXlsxFile(file);if(request!==fileRequest.current)return
      const imageCount=spreadsheetImageCount(await file.arrayBuffer());if(request!==fileRequest.current)return
      if(imageCount)setMediaWarnings([`${imageCount} illustration(s) dans ce classeur : l’import Excel lit les exercices et consignes ; utilise le Word pour récupérer les images.`])
      const input = sheets.map((s) => ({ name: s.sheet, rows: s.data as Cell[][] }))
      setSourceText(input.filter(looksLikePlan).map(sheetText).join('\n'))
      // Une ligne par exercice, sinon plan en grille (une ligne par séance, une colonne par partie)
      const found = parseSessions(input) ?? parsePlanGrid(input, base)
      if (!found?.length) return setErr('Format non reconnu : utilise le modèle Excel ou des dates explicites et des titres de blocs dans Word. Aucun envoi à une IA externe.')
      show(found)
    } catch (e) {
      if(request===fileRequest.current)setErr('Impossible de lire ce fichier : ' + errorMessage(e))
    }
  }

  const addCircuit=()=>{
    const source=circuit==='confirmed'?[{...confirmedStrengthCircuit(),images:commonBlocks.flatMap(b=>b.images??[])}]:circuit==='source'?commonBlocks:sessions.find(s=>s.id===circuit)?.blocks??[]
    if(!source.length)return
    setRows(current=>current&&current.map(r=>!r.include?r:{...r,blocks:[...cloneBlocks(source).filter(b=>!r.blocks.some(old=>old.title===b.title)),...r.blocks]}));setReviewed(false)
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

  const invalidDates=plan?chosen.filter(r=>!r.date||dateProblem(r.date)):[]
  const declaredMismatch=chosen.filter(r=>r.date&&r.expectedWeekday!=null&&weekday(r.date)!==r.expectedWeekday)
  const repeatedDates=plan?[...new Set(chosen.filter(r=>r.date&&chosen.some(other=>other.key!==r.key&&other.date===r.date&&((!perRow)||(r.ids.some(id=>other.ids.includes(id)))))).map(r=>r.date))]:[]
  const ambiguousMatches=chosen.filter(r=>plan&&r.date&&plannedCandidates(r,scopeFor(r),sessions,assignments).length>1)
  const otherDates=plan?chosen.filter(r=>r.date&&!plannedOf(r)&&assignments.some(a=>a.session_id===existing(r)?.id&&a.date!==r.date&&JSON.stringify([a.group_id,[...a.athlete_ids].sort()])===JSON.stringify([scopeFor(r).group_id,[...scopeFor(r).athlete_ids].sort()]))):[]
  const existingSameDates=plan?chosen.filter(r=>r.date&&!plannedOf(r)&&assignments.some(a=>a.date===r.date&&JSON.stringify([a.group_id,[...a.athlete_ids].sort()])===JSON.stringify([scopeFor(r).group_id,[...scopeFor(r).athlete_ids].sort()]))):[]
  const invalidDurations=chosen.filter(r=>r.duration_min!=null&&(!Number.isInteger(r.duration_min)||r.duration_min<1||r.duration_min>480))
  const needsReview=declaredMismatch.length>0||repeatedDates.length>0||ambiguousMatches.length>0||otherDates.length>0||existingSameDates.length>0
  const canRun=!loading&&!dataError&&chosen.length>0&&(plan||fresh.length>0||toRefresh.length>0)&&!invalidDurations.length&&!invalidDates.length&&(!plan||canPlan)&&(!needsReview||reviewed)&&!ambiguousMatches.length
  const run = async () => {
    if(!canRun||busy)return
    if(JSON.stringify(chosen.map(r=>r.blocks)).length>8*1024*1024){setErr('Le contenu avec illustrations dépasse 8 Mo. Importe moins de séances à la fois.');return}

    setBusy(true)
    setErr(null)
    try {
      const [liveSessions,liveAssignments]=await Promise.all([api.list('sessions'),api.list('assignments')])
      if(inventorySignature(liveSessions,liveAssignments)!==inventorySignature(sessions,assignments)){
        await reload();setReviewed(false);setErr('Le planning ou la bibliothèque ont évolué depuis l’aperçu. Les correspondances sont actualisées : vérifie les lignes puis relance l’import. Aucun contenu n’a été enregistré par cette tentative.');return
      }
      // Séances modifiées dans le fichier : contenu mis à jour (retours des athlètes conservés).
      // Une séance aussi planifiée à d'autres dates est copiée pour ne changer que celle-ci.
      const shared = (r: Row) => assignments.some((a) => a.session_id === existing(r)!.id && (!plan || a.id !== plannedOf(r)?.id))
      for (const r of toRefresh.filter((x) => !shared(x))) {
        await save('sessions', { id: existing(r)!.id, title: r.title, objective: r.objective, focus:focusFor(r), blocks: r.blocks, targets: r.targets ?? [] })
        if (r.notes) await saveNote(save, session_notes, existing(r)!.id, r.notes)
      }
      const copies = toRefresh.filter(shared)
      const created = await saveMany('sessions', [...fresh, ...copies].map((r) => ({
        title: r.title, objective: r.objective, focus: focusFor(r), duration_min: r.duration_min??existing(r)?.duration_min??null, blocks: r.blocks, targets: r.targets ?? [],
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
      await save('import_history',{filename,source_text:sourceText.slice(0,250000),imported_count:fresh.length,updated_count:toRefresh.length})
      await reload()
      nav(plan && canPlan ? '/planning' : '/seances')
    } catch (e) {
      setErr('Import interrompu : '+errorMessage(e)+'. Certaines lignes peuvent avoir été enregistrées ; la liste est actualisée avant une nouvelle tentative.');await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <BackLink to="/seances" label="Séances" />
      <p className="eyebrow">DOCUMENT → APERÇU → BIBLIOTHÈQUE OU PLANNING</p><h1>Importer des séances</h1>{dataError&&<p className="alert warn">Données incomplètes : {dataError}. L’enregistrement est désactivé jusqu’à leur actualisation.</p>}<p><Link to="/imports">Historique et textes extraits des imports →</Link></p>
      <div className="card form">
        <p className="small">
          <b>Ton document Word</b> (.docx), tel que tu l’écris : chaque date (« Mercredi 28 octobre 2026 ») commence une séance,
          « Cycle 2 – Phase intensive » donne l’objectif, « Gainage : » ou « Éducatifs » ouvre un bloc, les autres lignes sont les exercices.
          Ou un <b>tableau Excel</b> (une ligne par exercice). Tu vérifies tout dans l’aperçu avant d’importer.
        </p>
        <Field label="Nom des séances (document Word ou texte)" hint="Ex. « Longueur » → Longueur S01, S02…">
          <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="Longueur, Vitesse, Haies…" />
        </Field>
        <input aria-label="Programme à importer" type="file" accept=".docx,.xlsx,.txt" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <details>
          <summary className="small">…ou coller le texte</summary>
          <div className="form">
            <textarea rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Mercredi 28 octobre 2026\nÉchauffement 4 tours et stretching 20 min\nÉducatifs :\nTalon-fesses 4 x 30m\nSkipping 4 x 30m\nRetour au calme : stretching'} />
            <button className="btn small" disabled={!paste.trim()} onClick={() => { setErr(null);setRows(null);setCommonBlocks([]);setMediaWarnings([]);setReviewed(false);setFilename('Texte collé');fileRequest.current++;fromText(paste.split(/\r?\n/)) }}>Analyser</button>
          </div>
        </details>
        <button type="button" className="btn small" onClick={() => { try { downloadXlsx('modele-seances.xlsx', sessionTemplate()) } catch (e) { setErr('Téléchargement impossible : '+errorMessage(e)) } }}>Télécharger le modèle Excel</button>
        <a className="small muted" href="/modele-seances.xlsx" download="modele-seances.xlsx">Ouvrir le modèle dans Fichiers ou Excel</a>
        {err && <div className="alert warn">{err}</div>}
        <p className="small muted">Lecture dans le navigateur, sans IA externe. Vérifie les dates, les groupes et les consignes dans l’aperçu avant l’import. Un document non reconnu doit être remis en forme selon les exemples ci-dessus.</p>
        {sourceText&&<details><summary>Vérifier le texte extrait du document</summary><pre className="import-source">{sourceText}</pre></details>}
        {skipped.length > 0 && (
          <details className="alert info small">
            <summary>{skipped.length} ligne(s) avant la première date, non importée(s)</summary>
            <ul className="plain">{skipped.slice(0, 20).map((l, i) => <li key={i}>{l}</li>)}</ul>
          </details>
        )}
      </div>

      {plan&&rows&&rows.some(r=>!r.date)&&<p className="alert warn">Certaines dates sont incomplètes : renseigne-les dans l’aperçu avant de planifier. Aucune année manquante n’est déduite automatiquement.</p>}
      {rows && (
        <>
          <section className="card import-summary"><b>{rows.length} séance(s) reconnue(s)</b><span>{rows.reduce((n,r)=>n+r.blocks.reduce((m,b)=>m+b.items.length,0),0)} exercices</span><span>{rows.reduce((n,r)=>n+r.blocks.reduce((m,b)=>m+(b.images?.length??0),0),0)} illustration(s) associée(s)</span><span>{fresh.length} nouvelles · {chosen.filter(changed).length} à comparer</span></section>
          {mediaWarnings.length>0&&<div className="alert warn">{mediaWarnings.map(w=><p key={w} className="small">{w}</p>)}</div>}
          <section className="card form import-common"><h2>Circuit commun au début des séances</h2><p className="small muted">Ajout dans l’aperçu des séances cochées. Vérifier le cumul avec le gainage déjà présent ; aucune dose n’est inventée.</p><Field label="Circuit à insérer"><select value={circuit} onChange={e=>setCircuit(e.target.value)}><option value="confirmed">Ton circuit de renforcement confirmé · 8 exercices</option>{commonBlocks.length>0&&<option value="source">Bloc commun du Word · {commonBlocks.reduce((n,b)=>n+b.items.length,0)} exercices et {commonBlocks.reduce((n,b)=>n+(b.images?.length??0),0)} image(s)</option>}{sessions.filter(s=>/renforcement|circuit|gainage/i.test(s.title)).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></Field><button className="btn" type="button" disabled={!chosen.length} onClick={addCircuit}>Insérer le circuit dans les séances cochées</button>{commonBlocks.length>0&&<details><summary>Voir les illustrations et le bloc commun du Word</summary>{commonBlocks.map(b=><div key={b.id}><SessionIllustrations images={b.images}/><p className="small">{b.items.length} exercice(s) transcrit(s) dans le texte. Une image seule n’est pas interprétée automatiquement.</p></div>)}</details>}</section>
          <section className="card form">
            <Field label="Thème des séances">
              <select value={focus} onChange={(e) => setFocus(e.target.value)}>
                <option value="auto">Depuis les libellés du fichier · à vérifier</option>
                {FOCUSES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <label className="check"><input type="checkbox" checked={plan} onChange={(e) => {setReviewed(false);setPlan(e.target.checked)}} /> <span><b>Planifier aussi</b> chaque séance à sa date</span></label>
            {rows.some(changed) && (
              <label className="check">
                <input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} />
                <span><b>Mettre à jour</b> les {rows.filter(changed).length} séance(s) déjà importée(s) et modifiée(s) dans le fichier <span className="tiny muted">(les retours des athlètes sont gardés ; les changements faits dans l’app sur ces séances sont remplacés)</span></span>
              </label>
            )}
            {plan && perRow && (
              <div className="grid2">
                <p className="small">Une séance par groupe : chacune est planifiée pour les athlètes de son groupe (d’après ton fichier). Tu peux ajuster sous chaque séance.</p>
                <Field label="Heure"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
              </div>
            )}
            {plan && !perRow && (
              <div className="grid2">
                <Field label="Groupe">
                  <select value={group} onChange={(e) => {setReviewed(false);setGroupId(e.target.value)}}>
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
            {plan && (() => { const r = seasonRule(); return <p className="tiny muted">Lieu proposé : {r.summer} de {MONTHS[r.from - 1]} à {MONTHS[r.to - 1]}, {r.winter} le reste de l’année (modifiable par séance, et dans Réglages).</p> })()}
          </section>

          <datalist id="venues">{venues().map((v) => <option key={v} value={v} />)}</datalist>
          <h2>{rows.length} séance(s) trouvée(s)</h2>
          {invalidDates.length>0&&<p className="alert warn">{invalidDates.length} date(s) absente(s) ou invalide(s) : corrige les dates ou importe uniquement en bibliothèque.</p>}
          {invalidDurations.length>0&&<p className="alert warn">Durée prévue invalide : utilise un nombre entier entre 1 et 480 minutes ou laisse le champ vide.</p>}
          {existingSameDates.length>0&&<p className="alert warn">Des entraînements sont déjà programmés aux mêmes dates pour {existingSameDates.length} ligne(s). Cet import ajoutera ces séances : ouvre le planning si tu souhaites remplacer une séance existante.</p>}
          {otherDates.length>0&&<p className="alert warn">{otherDates.length} séance(s) existe(nt) pour les mêmes destinataires à une autre date. Cet import ajoutera une date sans déplacer l’ancienne : décoche les lignes ou règle le décalage dans le planning avant de continuer.</p>}
          {declaredMismatch.length>0&&<p className="alert warn">Le jour écrit dans le Word ne correspond pas à la date de {declaredMismatch.length} séance(s). Corrige les dates ou confirme explicitement leur vérification.</p>}
          {repeatedDates.length>0&&<p className="alert warn">Plusieurs séances sont cochées aux mêmes dates pour les mêmes destinataires : {repeatedDates.map(d=>formatDate(d)).join(', ')}. Vérifie les variantes avant de les cumuler.</p>}
          {ambiguousMatches.length>0&&<p className="alert danger">Plusieurs planifications existantes correspondent à une même ligne. Décoche les lignes concernées et clarifie les doublons dans le planning avant de les importer.</p>}
          {needsReview&&<label className="check import-review-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> J’ai vérifié les dates et les séances multiples pour les destinataires choisis.</label>}
          {offDays.length > 0 && (
            <div className="alert warn small">{offDays.length} séance(s) ne tombent pas un {DAYS[usual]} comme les autres : vérifie la date ({offDays.map((r) => formatDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })).join(', ')}).</div>
          )}
          {plan && unknownAll.length > 0 && (
            <div className="alert warn small">Pas trouvé(s) dans tes athlètes : <b>{unknownAll.join(", ")}</b> — crée leur fiche puis recharge le fichier, ou coche la bonne personne sous la séance.</div>
          )}
          {plan && nobody > 0 && <div className="alert warn small">{nobody} séance(s) sans athlète : elles seront importées mais pas planifiées.</div>}
          <div className="import-sessions">
            {rows.map((r) => (
              <div key={r.key} className={`card form ${r.include ? '' : 'muted'}`}>
                <label className="check">
                  <input type="checkbox" checked={r.include} onChange={(e) => set(r.key, { include: e.target.checked })} />
                  <span><b>{r.title}</b>{exists(r) && (
                    <span className="tiny muted"> · {plannedOf(r)
                      ? changed(r) ? (refresh ? 'modifiée dans le fichier : mise à jour' : 'modifiée dans le fichier (pas mise à jour)') : 'déjà importée, inchangée'
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
                <div className="tiny muted">Thème : {focusFor(r)||'à préciser'}</div><Field label="Objectif / phase"><input value={r.objective} onChange={e=>set(r.key,{objective:e.target.value})}/></Field><Field label="Durée prévue · minutes (facultatif)"><input type="number" min={1} max={480} value={r.duration_min??''} onChange={e=>set(r.key,{duration_min:e.target.value===''?null:Number(e.target.value)})}/></Field>{changed(r)&&<p className="tiny warn-text">Contenu différent d’une séance existante. La mise à jour est désactivée tant que tu ne la coches pas.</p>}
                {!!r.targets?.length && <div className="tiny muted">Temps cibles par athlète : {r.targets.map(targetLabel).join(' · ')}</div>}
                {plan && r.who && (
                  <details className="small">
                    <summary>{r.ids.length ? r.ids.map((id) => active.find((a) => a.id === id)?.first_name).filter(Boolean).join(', ') : 'Personne'}{r.unknown.length > 0 && <span className="muted"> · introuvable(s) : {r.unknown.join(', ')}</span>}</summary>
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
                  <fieldset key={b.id} className="import-block-edit"><legend>{b.title}</legend><SessionIllustrations images={b.images} onRemove={id=>set(r.key,{blocks:r.blocks.map(block=>block.id===b.id?{...block,images:block.images?.filter(i=>i.id!==id)}:block)})}/><button type="button" className="btn small" onClick={()=>set(r.key,{blocks:r.blocks.filter(block=>block.id!==b.id),targets:[]})}>Retirer ce bloc de l’aperçu</button>
                    {b.items.map(it=><details key={it.id}><summary className="small">{it.name||'Exercice à préciser'} · modifier</summary><div className="form">
                      {(['name','sets','reps','distance','duration','recovery','intensity','notes'] as const).map(field=><Field key={field} label={({name:'Exercice',sets:'Séries',reps:'Répétitions',distance:'Distance',duration:'Durée',recovery:'Récupération',intensity:'Intensité',notes:'Consignes'})[field]}><input value={it[field]} onChange={e=>set(r.key,{blocks:r.blocks.map(block=>block.id===b.id?{...block,items:block.items.map(item=>item.id===it.id?{...item,[field]:e.target.value}:item)}:block),targets:[]})}/></Field>)}
                    </div></details>)}
                  </fieldset>
                ))}
              </div>
            ))}
          </div>
          <div className="sticky-actions">
            <button className="btn primary block" disabled={busy || !canRun || (plan && !perRow && members.length > 0 && out.length === members.length)} onClick={run}>
              {busy ? 'Import…' : [
                fresh.length > 0 && `Importer ${fresh.length} séance(s)${plan && canPlan ? ` et planifier ${chosen.filter(r=>r.date&&(!perRow||r.ids.length>0)).length}` : ''}`,
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
