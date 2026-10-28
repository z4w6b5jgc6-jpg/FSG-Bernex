import {test} from 'node:test'
import assert from 'node:assert/strict'
import {rolldown} from 'rolldown'
import readXlsxFile from 'read-excel-file/node'
async function load(path){const b=await rolldown({input:new URL(path,import.meta.url).pathname,platform:'node'});const out=await b.generate({format:'esm'});await b.close();return import('data:text/javascript;base64,'+Buffer.from(out.output.find(c=>c.isEntry).code).toString('base64'))}
const {parseSessions}=await load('../src/lib/importSessions.ts'),{sessionTemplate}=await load('../src/lib/sessionTemplate.ts')
test('une vue Plan avec une colonne Exercices ne masque pas les détails structurés',()=>{
 const result=parseSessions([{name:'Plan',rows:[['Date','Séances du jour','Objectif','Exercices'],['2026-10-28','Plusieurs séances','Phase extensive','Cellule de synthèse']]},{name:'Détail',rows:[['Date','Séance','Bloc','Exercice','Rép.'],['2026-10-28','Longueur S01','Technique','Appuis','5'],['2026-10-28','Lancers S01','Technique','Poids','6']]}]);assert.equal(result.length,2);assert.equal(result[0].blocks[0].items[0].reps,'5');assert.equal(result[1].title,'Lancers S01')
})
test('une feuille de détail vide ne masque pas une feuille suivante remplie',()=>{
 const hd=['Date','Séance','Exercice'];assert.equal(parseSessions([{name:'Vide',rows:[hd]},{name:'Détail',rows:[hd,['2026-11-19','Musculation J01','Squat']]}]).length,1)
})
test('les modèles sans date et la musculation datée restent distincts sans affectation inventée',()=>{
 const rows=parseSessions([{name:'Détail',rows:[['Date','Séance','Pour qui','Exercice','Séries','Rép.'],[null,'PPG A',null,'Pont','2','10'],['2026-11-19','Musculation J01',null,'Squat','1','8']]}]);assert.equal(rows.length,2);assert.equal(rows[0].date,'');assert.equal(rows[1].date,'2026-11-19');assert.equal(rows[1].who,undefined)
})
test('le modèle généré est un vrai Excel directement relisible par le même importeur',async()=>{
 const sheets=(await readXlsxFile(Buffer.from(sessionTemplate()))).map(s=>({name:s.sheet,rows:s.data}));const rows=parseSessions(sheets);assert.equal(rows.length,1);assert.equal(rows[0].date,'');assert.equal(rows[0].blocks[0].items[0].sets,'')
})
