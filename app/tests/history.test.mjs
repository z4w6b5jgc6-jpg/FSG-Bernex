import {test} from 'node:test'
import assert from 'node:assert/strict'
import {rolldown} from 'rolldown'
const bundle=await rolldown({input:new URL('../src/lib/workoutHistory.ts',import.meta.url).pathname,platform:'node'});const output=await bundle.generate({format:'esm'});const m=await import('data:text/javascript;base64,'+Buffer.from(output.output.find(x=>x.isEntry).code).toString('base64'))
const assignment=(id,date,time='18:00')=>({id,date,time})
const log=(id,date,extra={})=>({id,assignment_id:date,athlete_id:'a',item_name:'Squat',sets:[{done:true,reps:6,load_kg:20,result:''}],...extra})
const assignments=[assignment('old','2026-10-19'),assignment('recent','2026-10-23'),assignment('today','2026-10-26'),assignment('future','2026-10-28')]
const previous=(logs,name='Squat',as=assignments)=>m.previousExercise(logs,as,'a','today',name)
test('la dernière réalisation provient uniquement de cet athlète et d’une séance antérieure',()=>{const r=previous([log('old','old'),log('recent','recent'),log('today','today'),log('future','future'),log('other','recent',{athlete_id:'b'})]);assert.equal(r.log.id,'recent')})
test('un nom différent ne produit pas de référence supposée équivalente',()=>{assert.equal(previous([log('x','recent')],'Demi-squat'),undefined);assert.equal(previous([log('x','recent',{item_name:undefined})]),undefined);assert.equal(previous([log('x','recent')],'  SQUAT ' ).log.id,'x')})
test('les séries non cochées ne deviennent pas une réalisation de référence',()=>{assert.equal(previous([log('x','recent',{sets:[{done:false,reps:6,load_kg:20,result:''}]})]),undefined)})
test('une date inconnue, invalide ou la même journée ne crée pas d’antécédent',()=>{assert.equal(previous([log('x','orphan')]),undefined);assert.equal(previous([log('x','invalid')],'Squat',[...assignments,assignment('invalid','2026-02-30')]),undefined);assert.equal(previous([log('x','same')],'Squat',[...assignments,assignment('same','2026-10-26','10:00')]),undefined)})
test('aucune séance courante reconnue ne donne pas de référence inventée',()=>{assert.equal(previous([log('x','recent')],'Squat',[]),undefined);assert.equal(previous([log('x','recent')],''),undefined)})
test('la lecture de l’antécédent ne copie ni ne modifie les valeurs actuelles',()=>{const logs=[log('x','recent')],before=JSON.stringify(logs);const r=previous(logs);assert.equal(r.log.sets[0].load_kg,20);assert.equal(JSON.stringify(logs),before)})
test('deux séances antérieures le même jour sont départagées par leur heure',()=>{const as=[...assignments,assignment('late','2026-10-23','19:00')];assert.equal(previous([log('early','recent'),log('late','late')],'Squat',as).log.id,'late')})
