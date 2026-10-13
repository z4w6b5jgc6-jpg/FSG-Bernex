import { unzipSync, strFromU8 } from 'fflate'
import type { Block } from '../types'
import type { SessionIn } from './importSessions'
import { emptyItem, uid } from './utils'

/** Lignes d'un document Word (.docx) : un paragraphe par ligne, « • » devant les listes, tabulations conservées */
export function docxLines(data: ArrayBuffer): string[] {
  const files = unzipSync(new Uint8Array(data), { filter: (f) => f.name === 'word/document.xml' })
  const xml = files['word/document.xml']
  if (!xml) throw new Error('Ce fichier ne ressemble pas à un document Word (.docx).')
  const doc = new DOMParser().parseFromString(strFromU8(xml), 'application/xml')
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const out: string[] = []
  for (const p of Array.from(doc.getElementsByTagNameNS(W, 'p'))) {
    let text = ''
    const walk = (n: Element) => {
      for (const c of Array.from(n.children)) {
        if (c.namespaceURI !== W) continue
        if (c.localName === 't') text += c.textContent ?? ''
        else if (c.localName === 'tab') text += '\t'
        else if (c.localName === 'br' || c.localName === 'cr') text += '\n'
        else if (c.localName !== 'pPr' && c.localName !== 'rPr') walk(c)
      }
    }
    walk(p)
    const bullet = p.getElementsByTagNameNS(W, 'numPr').length > 0
    for (const line of text.split('\n')) if (line.trim()) out.push((bullet ? '• ' : '') + line)
  }
  return out
}

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
const plain = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const clean = (t: string) => t.replace(/[\t ]+/g, ' ').trim()

/** Titres de blocs reconnus même sans « : » (début de ligne) */
const HEADERS: [RegExp, string][] = [
  [/^(exercices? d.)?educatifs?/, 'Éducatifs'], [/^exercices?$/, 'Exercices'], [/^(travail de )?gainage/, 'Gainage'],
  [/^(travail aux )?escaliers?/, 'Travail aux escaliers'], [/^bondissements? horizonta/, 'Bondissements horizontaux'],
  [/^bondissements?/, 'Bondissements'], [/^(travail de )?pl[iy]om[ée]trie|^plio\b|^developpement qualites? plyo/, 'Pliométrie'],
  [/^(travail de )?pieds?$|^travail de pied/, 'Travail de pied'], [/^tapis de perche/, 'Tapis de perche'], [/^sur plinths?/, 'Sur plinth'],
  [/^sur petits cones/, 'Sur petits cônes'], [/^courses? d.elan/, "Course d'élan"], [/^circuit/, 'Circuit'], [/^renforcement/, 'Renforcement'],
  [/^musculation/, 'Musculation'], [/^vitesse/, 'Vitesse'], [/^technique/, 'Technique'], [/^corps de seance/, 'Corps de séance'],
  [/^retour au calme/, 'Retour au calme'], [/^etirements?|^stre?t?ching/, 'Retour au calme'],
]
const WARMUP = /^(e|é)chauffement/i
const COOL = /^(\d+ tours? (et|de) )?(stre?t?ching|etirements?)\b/

function parseDate(line: string, today: Date): { iso: string; rest: string } | null {
  const p = plain(line)
  let m = p.match(/^(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+)?(\d{1,2})(?:er)?\s+([a-z]+)\.?(?:\s+(\d{4}))?/)
  let day = 0, month = 0, year = 0, len = 0
  if (m && MONTHS.indexOf(m[2]) >= 0) { day = +m[1]; month = MONTHS.indexOf(m[2]) + 1; year = m[3] ? +m[3] : 0; len = m[0].length }
  else {
    m = p.match(/^(?:(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+)?(\d{1,2})[./](\d{1,2})[./](\d{2,4})/)
    if (!m) return null
    day = +m[1]; month = +m[2]; year = m[3].length === 2 ? 2000 + +m[3] : +m[3]; len = m[0].length
  }
  if (!year) {
    // Sans année : saison d'août à juillet
    const start = today.getMonth() + 1 >= 8 ? today.getFullYear() : today.getFullYear() - 1
    year = month >= 8 ? start : start + 1
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const rest = line.slice(len).replace(/^\s*(\(\d+\))?\s*[:–-]?\s*/, '').trim()
  return { iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, rest }
}

function item(text: string) {
  const it = emptyItem(text)
  let m = text.match(/^(.*?)\s+(\d+)\s*[x×]\s*(\d+)\s*m$/i)
  if (m) { it.name = m[1]; it.sets = m[2]; it.distance = `${m[3]} m`; return it }
  m = text.match(/^(.*?)\s*[x×]\s*(\d+)\s*\.?$/i)
  if (m && m[1].length > 3) { it.name = m[1].replace(/[ .]+$/, ''); it.reps = m[2] }
  return it
}

export interface TextParse { sessions: SessionIn[]; skipped: string[] }

/**
 * Découpe un plan d'entraînement écrit librement (document Word, texte collé) :
 * une date (« Mercredi 28 octobre 2026 ») ouvre une séance ; « Cycle 2 … » / « Phase … » donnent l'objectif ;
 * « Titre : » ou un titre connu (Éducatifs, Gainage…) ouvre un bloc ; les autres lignes sont des exercices.
 */
export function parseSessionText(lines: string[], baseTitle: string, today = new Date()): TextParse {
  const sessions: (SessionIn & { subtitle: string })[] = []
  const skipped: string[] = []
  let cycle = '', phase = ''
  let cur: (SessionIn & { subtitle: string }) | null = null
  // blocs complets sur une seule ligne (« Échauffement 4 tours et stretching 20 min ») : rien ne s'y ajoute
  const closed = new Set<string>()

  const block = (title: string): Block => {
    const b = { id: uid(), title, items: [] }
    cur!.blocks.push(b)
    return b
  }
  const last = () => cur!.blocks[cur!.blocks.length - 1]
  const addTo = (b: Block, text: string) => {
    for (const part of text.split('•').map(clean).filter(Boolean)) b.items.push(item(part.replace(/^[-–*]\s+|^\d+[.)]\s+/, '')))
  }
  const add = (raw: string) => {
    let text = raw
    // Répétitions notées en fin de ligne (« … ⇥ x3 ») : pour tout le bloc
    const rep = text.match(/(?:\t|\s{2,})(?:_\s*)?[x×]\s*(\d+)\s*$/i)
    if (rep && !/\(×\d+\)$/.test(last()?.title ?? '')) {
      const b = last() ?? block('Exercices')
      b.title = `${b.title} (×${rep[1]})`
      text = text.slice(0, rep.index)
    }
    text = text.replace(/(?:\t|\s)+_(?:\t|\s)*/g, ' ')
    for (const part of text.split('•').map(clean).filter(Boolean)) {
      const b = last() && !closed.has(last().id) ? last() : block('Exercices')
      b.items.push(item(part.replace(/^[-–*]\s+|^\d+[.)]\s+/, '')))
    }
  }

  for (const raw of lines) {
    const line = raw.replace(/ /g, ' ')
    const l = clean(line.replace(/^[•·▪◦-]\s*/, ''))
    if (!l) continue
    const p = plain(l)
    const c = p.match(/^cycle\s*(\d+)\s*[:–-]?\s*(.*)/)
    if (c) { cycle = `Cycle ${c[1]}`; phase = l.slice(l.length - c[2].length).trim(); continue }
    if (/^phase\b/.test(p)) { phase = l; continue }
    if (/^saison\b/.test(p) && !cur) continue
    const d = parseDate(l, today)
    if (d) {
      cur = { key: uid(), date: d.iso, title: '', objective: [cycle, phase].filter(Boolean).join(' – '), blocks: [], subtitle: /[a-z]{3}/i.test(d.rest) ? d.rest : '' }
      sessions.push(cur)
      continue
    }
    if (!cur) { skipped.push(l); continue }
    if (/^pr[ée]paration physique g[ée]n[ée]rale$/i.test(l)) { cur.objective = [cur.objective, l].filter(Boolean).join(' · '); continue }
    // « Échauffement : » ouvre un bloc ; « Échauffement 4 tours et stretching » est un bloc à lui seul
    const bare = /:\s*$/.test(l) || /^(e|é)chauffement$|^retour au calme$/i.test(l)
    if (WARMUP.test(l)) { const b = block('Échauffement'); if (!bare) { b.items.push(item(l)); closed.add(b.id) } continue }
    if (COOL.test(p)) { const b = block('Retour au calme'); if (!bare) { b.items.push(item(l)); closed.add(b.id) } continue }
    if (/^pause\b/.test(p)) { (last() ?? block('Exercices')).items.push(emptyItem(`⏸️ ${l}`)); continue }
    // Titre de bloc : « Titre : » (+ contenu éventuel) ou titre connu seul sur sa ligne
    const colon = l.match(/^([^:]{2,60}?)\s*:\s*(.*)$/)
    const known = HEADERS.find(([re]) => re.test(plain(colon ? colon[1] : l)))
    if (colon && (known || !colon[2] || colon[1].split(' ').length <= 4)) {
      const title = known?.[1] ?? colon[1].charAt(0).toUpperCase() + colon[1].slice(1)
      const b = block(title)
      if (colon[2]) {
        // « Circuit : 2 x 3 passages (2 min récup) » : consigne du bloc
        if (/^circuit/i.test(colon[1]) || !/[a-z]{4}/i.test(colon[2].replace(/passages?|tours?|fois|r[ée]cup/gi, ''))) b.title = `${title} – ${colon[2]}`
        else addTo(b, colon[2])
      }
      continue
    }
    if (known && l.length <= 25 && !/\d/.test(l)) { block(known[1]); continue }
    // Sous-titre de la séance : première ligne courte, sans chiffre, avant tout bloc
    if (!cur.blocks.length && !cur.subtitle && l.length <= 60 && !/\d/.test(l) && !/\t/.test(line)) { cur.subtitle = l; continue }
    // « Éducatifs longueur sur 30 m (…) x 5 » : titre connu suivi de l'exercice
    if (known && (!last() || closed.has(last().id)) && known[1] !== last()?.title.replace(/ \(×\d+\)$/, '')) block(known[1])
    add(line.replace(/^[•·▪◦]\s*/, '• '))
  }

  const sorted = sessions.filter((s) => s.blocks.some((b) => b.items.length)).sort((a, b) => a.date.localeCompare(b.date))
  sorted.forEach((s, i) => {
    s.blocks = s.blocks.filter((b) => b.items.length || b.title.includes('–'))
    s.title = `${baseTitle.trim() || 'Séance'} S${String(i + 1).padStart(2, '0')}${s.subtitle ? ` – ${s.subtitle}` : ''}`
  })
  return { sessions: sorted.map(({ subtitle: _s, ...rest }) => (void _s, rest)), skipped }
}
