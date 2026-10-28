import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/season.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
const { initialSeason, validateSeason, dayNumber, validDate, overlaps, targets, actualLoad, reviewAthlete } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))

test('la trame est valide, le camp est confirmé et les fenêtres compétitives restent provisoires', () => {
  const plan = initialSeason()
  assert.equal(validateSeason(plan), null)
  assert.deepEqual(plan.blocks.filter((b) => !b.provisional).map((b) => [b.start, b.end]), [['2027-03-26', '2027-04-04']])
  assert.ok(plan.blocks.filter((b) => b.phase === 'competition').every((b) => b.provisional))
})
test('les dates impossibles et les blocs hors saison sont refusés', () => {
  assert.equal(validDate('2027-02-30'), false)
  assert.equal(validDate('2028-02-29'), true)
  assert.equal(validDate(''), false)
  const plan = initialSeason(); plan.blocks[0].end = '2028-01-01'
  assert.ok(validateSeason(plan))
})
test('le passage à l’heure d’été pendant le camp ne change pas le nombre de jours', () => {
  assert.equal(dayNumber('2027-04-04') - dayNumber('2027-03-26') + 1, 10)
})
test('une fin et un début le même jour constituent un chevauchement', () => {
  assert.ok(overlaps({ start: '2027-03-26', end: '2027-04-04' }, { start: '2027-04-04', end: '2027-04-09' }))
  assert.equal(overlaps({ start: '2027-03-26', end: '2027-04-04' }, { start: '2027-04-05', end: '2027-04-09' }), false)
})
test('le socle commun et les blocs individuels respectent leur périmètre', () => {
  assert.equal(targets({ athleteIds: [] }, 'a'), true)
  assert.equal(targets({ athleteIds: ['b'] }, 'a'), false)
})
test('la charge utilise la durée réelle ; les données manquantes restent inconnues', () => {
  assert.equal(actualLoad({ completed: true, duration_min: 80, rpe: 6 }), 480)
  assert.equal(actualLoad({ completed: true, rpe: 6 }), null)
  assert.equal(actualLoad({ completed: true, duration_min: 80, rpe: null }), null)
  assert.equal(actualLoad({ completed: false, duration_min: 80, rpe: 6 }), 0)
})
const athlete = { id: 'a', goals: 'Améliorer le départ', events: 'Sprint' }
test('une revue historique ignore les questionnaires et les douleurs futurs', () => {
  const result = reviewAthlete(athlete, '2027-03-26', [{ athlete_id: 'a', date: '2027-03-27', energy: 1 }], [{ athlete_id: 'a', assignment_id: 'future', pain: 'douleur' }], [{ id: 'future', date: '2027-03-27' }], [])
  assert.ok(result.some((p) => p.title === 'État de forme à renseigner'))
  assert.equal(result.some((p) => p.title === 'Douleur récemment signalée'), false)
})
test('une revue ne mélange pas les athlètes et ne transforme pas une alerte en prescription', () => {
  const result = reviewAthlete(athlete, '2027-03-26', [{ athlete_id: 'a', date: '2027-03-26', energy: 1 }, { athlete_id: 'b', date: '2027-03-26', energy: 5 }], [], [], [])
  assert.ok(result.some((p) => p.attention && p.detail.includes('aucun ajustement automatique')))
  assert.ok(result.some((p) => p.title === 'Période de vacances'))
  assert.equal(result.some((p) => p.title === 'État de forme à renseigner'), false)
})

const { proposePreparation } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
test('une préparation se termine la veille de la compétition et préserve les périmètres individuels', () => {
  const blocks = proposePreparation('2027-06-12', ['a'], { extensive: 4, intensive: 3, explosive: 3, recovery: 1 })
  assert.equal(blocks.length, 5)
  assert.equal(blocks.at(-1).end, '2027-06-11')
  assert.ok(blocks.every((b) => b.provisional && b.athleteIds[0] === 'a'))
  assert.equal(blocks.filter((b) => b.phase === 'recovery').length, 2)
  assert.equal(dayNumber(blocks[1].start) - dayNumber(blocks[0].end), 1)
})
test('le coach peut supprimer les semaines de récupération proposées et les durées invalides sont refusées', () => {
  assert.equal(proposePreparation('2027-06-12', [], { extensive: 4, intensive: 3, explosive: 3, recovery: 0 }).length, 3)
  assert.throws(() => proposePreparation('2027-06-12', [], { extensive: 0, intensive: 3, explosive: 3, recovery: 0 }))
  assert.throws(() => proposePreparation('2027-06-12', [], { extensive: 4, intensive: 3, explosive: 3, recovery: 0.5 }))
})
