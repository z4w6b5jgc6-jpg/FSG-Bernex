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
let schema=await readFile(new URL('../../supabase/schema.sql',import.meta.url),'utf8');
const securite=await readFile(new URL('../../supabase/migration-securite-2026.sql',import.meta.url),'utf8')
assert.ok(schema.includes(securite.split('begin;\n')[1].split('commit;')[0].trim()),'schema.sql doit reprendre migration-securite-2026.sql');checks++
schema=schema.replace('create extension if not exists pgcrypto;','')
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
 for(let repeat=0;repeat<2;repeat++)for(const file of ['migration-season-2027.sql','migration-complete-2027.sql','migration-light-2027.sql','migration-securite-2026.sql'])await db.exec(await readFile(new URL('../../supabase/'+file,import.meta.url),'utf8'))
 for(const before of snapshots){const after=(await db.query('select * from '+before.table+' where id=$1',[legacy[before.key]])).rows[0];for(const key of Object.keys(before.row))assert.deepEqual(after[key],before.row[key],before.table+'.'+key);checks++}
 await db.query("select set_config('request.jwt.claim.sub','',false)")
}else{
 await db.exec(schema)
 await db.exec(schema) // idempotence of full schema
 await db.exec(await readFile(new URL('../../supabase/migration-securite-2026.sql',import.meta.url),'utf8')) // script 4 rejouable sur une base à jour
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

// ===== Correctifs de l'audit (script 4) =====
const su=async()=>{await db.exec('reset role')}
const stranger=id(14),assoc=id(15),roster2=id(24)
await su();await db.query('insert into auth.users values($1,$2,now()),($3,$4,null)',[stranger,'stranger@demo.ch',assoc,'assoc@demo.ch'])
// 1. Création d'un espace entraîneur fermée quand un club existe, sauf adresse autorisée
await act(stranger);await expectFailure(()=>db.query("select create_club('Club pirate')"))
await act(coach);await db.query("select create_club('Club A')");checks++ // le propriétaire peut toujours renommer
await su();await db.query("insert into club_creators(email) values('stranger@demo.ch')")
await act(stranger);await db.query("select create_club('Club autorisé')");assert.equal((await db.query('select whoami() as w')).rows[0].w.role,'coach');checks++
// 2. Entraîneur associé : compte relié seulement par la base, et seulement avec un email confirmé
await act(coach);await db.query("insert into club_coaches(email,user_id) values('assoc@demo.ch',$1)",[user])
await su();assert.equal((await db.query("select user_id from club_coaches where email='assoc@demo.ch'")).rows[0].user_id,null);checks++
await act(coach);await db.query("update club_coaches set user_id=$1 where email='assoc@demo.ch'",[user])
await su();assert.equal((await db.query("select user_id from club_coaches where email='assoc@demo.ch'")).rows[0].user_id,null);checks++
await act(assoc);assert.equal((await db.query('select whoami() as w')).rows[0].w.role,'new');checks++
await su();await db.query('update auth.users set email_confirmed_at=now() where id=$1',[assoc])
await act(assoc);assert.equal((await db.query('select whoami() as w')).rows[0].w.role,'coach');checks++
// 3. Un associé ne peut ni modifier ni supprimer le club ; le code se régénère en 12 caractères
assert.equal((await db.query("update clubs set invite_code='FAIBLE' returning *")).rows.length,0);checks++
assert.equal((await db.query('delete from clubs returning *')).rows.length,0);checks++
await su();assert.equal((await db.query('select count(*)::int n from clubs where coach_id=$1',[coach])).rows[0].n,1);checks++
await act(coach);assert.match((await db.query('select regenerate_invite_code() as c')).rows[0].c,/^[0-9A-F]{12}$/);checks++
// 4. L'athlète ne change pas son identité
await act(user);await db.query("update athletes set first_name='Usurpé',goals='Objectif' where id=$1",[ath])
await su();const me=(await db.query('select first_name,goals from athletes where id=$1',[ath])).rows[0];assert.equal(me.first_name,'Athlete A');assert.equal(me.goals,'Objectif');checks++
// 5. Résultats de tests : l'athlète ne modifie que les siens
const testId=id(60);await su();await db.query("insert into tests(id,coach_id,name) values($1,$2,'20 m lancé')",[testId,coach])
await act(coach);const coachResult=(await db.query('insert into test_results(athlete_id,test_id,value) values($1,$2,3.1) returning id',[ath,testId])).rows[0].id
await act(user)
assert.equal((await db.query('update test_results set value=2 where id=$1 returning *',[coachResult])).rows.length,0);checks++
assert.equal((await db.query('delete from test_results where id=$1 returning *',[coachResult])).rows.length,0);checks++
const ownResult=(await db.query('insert into test_results(athlete_id,test_id,value) values($1,$2,3.3) returning id',[ath,testId])).rows[0].id
assert.equal((await db.query('update test_results set value=3.2 where id=$1 returning *',[ownResult])).rows.length,1);checks++
// 6. Notifications : adresses de push reconnues, pas de vol d'abonnement, un seul envoi par message
const ep='https://fcm.googleapis.com/fcm/send/appareil-coach'
await act(coach)
await expectFailure(()=>db.query("select save_push('https://site-tiers.example/hook','secret')"))
await expectFailure(()=>db.query("insert into push_subscriptions(endpoint,user_id) values('https://site-tiers.example/x',$1)",[coach]))
await db.query("select save_push($1,'secret-coach')",[ep]);checks++
await act(user)
await expectFailure(()=>db.query('select save_push($1)',[ep]))
await expectFailure(()=>db.query("select save_push($1,'mauvais')",[ep]))
const msg=(await db.query("insert into messages(assignment_id,athlete_id,body) values($1,$2,'Question') returning id",[assignment,ath])).rows[0].id
assert.deepEqual((await db.query("select * from push_targets('message',$1) as e",[msg])).rows.map(r=>r.e),[ep]);checks++
assert.equal((await db.query("select * from push_targets('message',$1)",[msg])).rows.length,0);checks++
await db.query('update messages set notified_at=null where id=$1',[msg])
assert.equal((await db.query("select * from push_targets('message',$1)",[msg])).rows.length,0);checks++
await act(coach);await db.query("select save_push($1,'secret-coach')",[ep]);checks++ // même appareil, même compte : accepté
// 7. Quota de l'assistant IA réservé aux entraîneurs
await act(user);assert.equal((await db.query('select ai_take_quota() as q')).rows[0].q.ok,false);checks++
await act(coach);assert.equal((await db.query('select ai_take_quota() as q')).rows[0].q.ok,true);checks++
// 8. Fusion : messages, présences, séries, disponibilités et consentements suivent la fiche
await su()
await db.query("insert into athletes(id,coach_id,group_id,first_name,last_name) values($1,$2,$3,'Fiche','Coach')",[roster2,coach,g])
await db.query("insert into messages(assignment_id,athlete_id,body) values($1,$2,'Bonjour')",[assignment,joined])
await db.query("insert into attendance(assignment_id,athlete_id,status) values($1,$2,'present')",[assignment,joined])
await db.query("insert into exercise_logs(assignment_id,athlete_id,item_id,sets) values($1,$2,'item','[]')",[assignment,joined])
await db.query("insert into availability(athlete_id,start_date,end_date,status) values($1,'2027-01-01','2027-01-07','away')",[joined])
await db.query("insert into privacy_acceptances(athlete_id,version,health_consent) values($1,'v1',false)",[joined])
await db.query("update competitions set athlete_ids=athlete_ids||$1::uuid,entries=entries||jsonb_build_object($1::text,'200 m'),athlete_priorities=athlete_priorities||jsonb_build_object($1::text,'C') where coach_id=$2",[joined,coach])
await act(coach);await db.query('select merge_athletes($1,$2)',[joined,roster2])
await su()
for(const table of ['messages','attendance','exercise_logs','availability','privacy_acceptances']){assert.equal((await db.query(`select count(*)::int n from ${table} where athlete_id=$1`,[roster2])).rows[0].n,1,table);checks++}
assert.equal((await db.query('select count(*)::int n from athletes where id=$1',[joined])).rows[0].n,0);checks++
const comp=(await db.query('select athlete_ids,entries,athlete_priorities from competitions where coach_id=$1',[coach])).rows[0]
assert.ok(comp.athlete_ids.includes(roster2)&&!comp.athlete_ids.includes(joined));assert.equal(comp.entries[roster2],'200 m');assert.equal(comp.athlete_priorities[roster2],'C');checks++
assert.equal((await db.query('select user_id from athletes where id=$1',[roster2])).rows[0].user_id,newUser);checks++
console.log(`Database checks: ${checks} passed; ${process.env.COACH_DB_UPGRADE==='1'?'original schema upgraded and migrations reapplied':'full schema reapplied'} successfully.`)
}catch(e){console.error('DATABASE TEST FAILURE',e.message,e.position??'');process.exitCode=1}finally{await db.close()}
