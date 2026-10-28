import {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const db=new PGlite()
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const coach=id(1),otherCoach=id(2),user=id(10),otherUser=id(11),unassignedUser=id(12),newUser=id(13),ath=id(20),otherAth=id(21),unassignedAth=id(22),rosterAth=id(23),g=id(30),otherG=id(31),s=id(40),assignment=id(50),future=id(51)
let checks=0
const expectFailure=async(fn)=>{let failed=false;try{await fn()}catch{failed=true}assert.equal(failed,true);checks++}
const act=async uid=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);await db.exec(`set role ${uid?'authenticated':'anon'}`)}
try{
await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`)
let schema=await readFile(new URL('../../supabase/schema.sql',import.meta.url),'utf8');schema=schema.replace('create extension if not exists pgcrypto;','')
if(process.env.COACH_DB_UPGRADE==='1'){
 const original=(await readFile(new URL('./fixtures/schema-original.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;','')
 await db.exec(original)
 const legacy={coach:id(901),group:id(902),athlete:id(903),session:id(904),assignment:id(905),feedback:id(906),record:id(907)}
 await db.query('insert into auth.users values($1,$2,now())',[legacy.coach,'legacy@example.test'])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[legacy.coach])
 await db.query("insert into clubs(coach_id,name,invite_code) values($1,'Groupe existant','LEGACY')",[legacy.coach])
 await db.query("insert into groups(id,coach_id,name) values($1,$2,'Groupe historique')",[legacy.group,legacy.coach])
 await db.query("insert into athletes(id,coach_id,group_id,first_name,last_name,events,goals) values($1,$2,$3,'Athlète','Existant','Sprint','Objectif conservé')",[legacy.athlete,legacy.coach,legacy.group])
 await db.query("insert into sessions(id,coach_id,title,objective,blocks) values($1,$2,'Séance conservée','Technique',$3)",[legacy.session,legacy.coach,JSON.stringify([{id:'legacy-block',title:'Vitesse',items:[{id:'legacy-item',name:'Sprint',sets:'3',distance:'30 m'}]}])])
 await db.query("insert into assignments(id,coach_id,session_id,date,time,group_id) values($1,$2,$3,'2026-10-19','18:00',$4)",[legacy.assignment,legacy.coach,legacy.session,legacy.group])
 await db.query("insert into feedback(id,assignment_id,athlete_id,completed,rpe,comment) values($1,$2,$3,true,6,'Retour conservé')",[legacy.feedback,legacy.assignment,legacy.athlete])
 await db.query("insert into records(id,athlete_id,event,mark,date) values($1,$2,'100 m','12.80 s','2026-10-18')",[legacy.record,legacy.athlete])
 const snapshots=[]
 for(const [table,key]of[['groups','group'],['athletes','athlete'],['sessions','session'],['assignments','assignment'],['feedback','feedback'],['records','record']])snapshots.push({table,key,row:(await db.query('select * from '+table+' where id=$1',[legacy[key]])).rows[0]})
 for(let repeat=0;repeat<2;repeat++)for(const file of ['migration-season-2027.sql','migration-complete-2027.sql','migration-light-2027.sql'])await db.exec(await readFile(new URL('../../supabase/'+file,import.meta.url),'utf8'))
 for(const before of snapshots){const after=(await db.query('select * from '+before.table+' where id=$1',[legacy[before.key]])).rows[0];for(const key of Object.keys(before.row))assert.deepEqual(after[key],before.row[key],before.table+'.'+key);checks++}
 await db.query("select set_config('request.jwt.claim.sub','',false)")
}else{
 await db.exec(schema)
 await db.exec(schema) // idempotence of full schema
}
await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated,anon')
for(const [uid,email] of [[coach,'coach@demo.ch'],[otherCoach,'other@demo.ch'],[user,'ath@demo.ch'],[otherUser,'otherath@demo.ch'],[unassignedUser,'unassigned@demo.ch'],[newUser,'new@demo.ch']])await db.query('insert into auth.users values($1,$2,now())',[uid,email])
const privacy={organization:'Test',contact:'test@example.org',address:'Test',version:'v1',published:true,retention_months:12,health_retention_months:3}
await db.query('insert into clubs(coach_id,name,invite_code,settings) values($1,$2,$3,$4)',[coach,'Club A','CODEA',JSON.stringify({release:'start',privacy})])
await db.query('insert into clubs(coach_id,name,invite_code) values($1,$2,$3)',[otherCoach,'Club B','CODEB'])
await db.query('insert into groups(id,coach_id,name) values($1,$2,$3),($4,$5,$6)',[g,coach,'Groupe',otherG,otherCoach,'Autre'])
for(const [aid,uid,cid,gid,name]of[[ath,user,coach,g,'Athlete A'],[otherAth,otherUser,otherCoach,otherG,'Athlete B'],[unassignedAth,unassignedUser,coach,null,'Unassigned'],[rosterAth,null,coach,g,'Prénom']])await db.query('insert into athletes(id,user_id,coach_id,group_id,first_name,last_name) values($1,$2,$3,$4,$5,$6)',[aid,uid,cid,gid,name,name==='Prénom'?'Nom':'Test'])
await db.query("insert into sessions(id,coach_id,title,blocks) values($1,$2,'Séance','[]')",[s,coach])
await db.query("insert into assignments(id,coach_id,session_id,date,time,group_id) values($1,$2,$3,'2020-01-01','18:00',$4),($5,$2,$3,'2099-01-01','18:00',$4)",[assignment,coach,s,g,future])
await db.query("update assignments set note='Programme futur privé',athlete_ids=$1 where id=$2",[[ath,otherAth],future])
await db.query("insert into competitions(coach_id,name,date,athlete_ids,entries,athlete_priorities) values($1,'Compétition','2027-06-12',$2,$3,$4)",[coach,[ath,otherAth],JSON.stringify({[ath]:'100 m',[otherAth]:'Poids'}),JSON.stringify({[ath]:'A',[otherAth]:'B'})])
await act(coach)
await db.query('insert into attendance(assignment_id,athlete_id,status) values($1,$2,$3)',[assignment,ath,'present']);checks++
await expectFailure(()=>db.query('insert into attendance(assignment_id,athlete_id,status) values($1,$2,$3)',[assignment,unassignedAth,'present']))
await db.query("insert into session_adjustments(assignment_id,athlete_id,content,rationale) values($1,$2,$3,'Décision du coach'),($4,$2,$3,'Décision future')",[assignment,ath,JSON.stringify({title:'Individuel',blocks:[]}),future]);checks++
await act(user)
assert.equal((await db.query('select * from athletes')).rows.length,1);checks++
assert.equal((await db.query('select * from clubs')).rows.length,0);checks++
assert.equal((await db.query('select * from assignments')).rows.length,0);checks++
const assigned=(await db.query('select * from visible_assignments()')).rows
assert.equal(assigned.length,2);assert.equal(assigned.find(a=>a.id===future).note,'');assert.deepEqual(assigned.find(a=>a.id===future).athlete_ids,[ath]);checks++
assert.equal((await db.query('select * from competitions')).rows.length,0);checks++
const comps=(await db.query('select * from visible_competitions()')).rows
assert.deepEqual(comps[0].athlete_ids,[ath]);assert.deepEqual(Object.keys(comps[0].entries),[ath]);assert.deepEqual(Object.keys(comps[0].athlete_priorities),[ath]);checks++
assert.equal((await db.query('select * from session_adjustments')).rows.length,1);checks++
await expectFailure(()=>db.query('update attendance set status=$1 where athlete_id=$2 returning *',['absent',ath]).then(r=>{if(!r.rows.length)throw new Error('denied')}))
await expectFailure(()=>db.query('insert into exercise_logs(assignment_id,athlete_id,item_id,sets) values($1,$2,$3,$4)',[future,ath,'item','[]']))
await db.query('insert into exercise_logs(assignment_id,athlete_id,item_id,sets) values($1,$2,$3,$4)',[assignment,ath,'item','[]']);checks++
await expectFailure(()=>db.query('update exercise_logs set sets=$1 where athlete_id=$2',[JSON.stringify([{index:1,reps:2,load_kg:-1,result:'test',done:true}]),ath]))
await expectFailure(()=>db.query('select retention_preview()'))
await db.query('insert into wellness(athlete_id,date,energy) values($1,current_date-1,3)',[ath]);checks++
await expectFailure(()=>db.query('insert into privacy_acceptances(athlete_id,version,health_consent) values($1,$2,true)',[ath,'wrong']))
await db.query('insert into privacy_acceptances(athlete_id,version,health_consent) values($1,$2,true)',[ath,'v1']);checks++
await db.query('insert into wellness(athlete_id,date,energy) values($1,current_date,4)',[ath]);checks++
await db.query('insert into privacy_acceptances(athlete_id,version,health_consent) values($1,$2,false)',[ath,'v1']);checks++
await db.query('update wellness set energy=3 where athlete_id=$1',[ath]);checks++
await expectFailure(()=>db.query('insert into privacy_acceptances(athlete_id,version,health_consent) values($1,$2,true)',[otherAth,'v1']))
await act(otherUser);assert.equal((await db.query('select * from session_adjustments')).rows.length,0);checks++
await act(otherCoach);assert.equal((await db.query('select * from attendance')).rows.length,0);checks++
await expectFailure(()=>db.query('insert into session_adjustments(assignment_id,athlete_id,content,rationale) values($1,$2,$3,$4)',[assignment,otherAth,'{"blocks":[]}','test']))
await act(newUser)
const joined=(await db.query("select join_club('CODEA','Prénom','Nom',2011,$1,'','') as id",[g])).rows[0].id
assert.notEqual(joined,rosterAth);checks++
assert.equal((await db.query('select id from athletes')).rows[0].id,joined);checks++
await act(coach)
const preview=(await db.query('select retention_preview() as p')).rows[0].p
assert.equal(typeof preview.wellness,'number');checks++
await expectFailure(()=>db.query('select purge_expired_followup($1)',[JSON.stringify({bad:1})]))
const actual=(await db.query('select purge_expired_followup($1) as p',[JSON.stringify(preview)])).rows[0].p
assert.deepEqual(actual,preview);checks++
console.log(`Database checks: ${checks} passed; ${process.env.COACH_DB_UPGRADE==='1'?'original schema upgraded and migrations reapplied':'full schema reapplied'} successfully.`)
}catch(e){console.error('DATABASE TEST FAILURE',e.message,e.position??'');process.exitCode=1}finally{await db.close()}
