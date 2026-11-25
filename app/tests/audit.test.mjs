// Correctifs de l'audit du 25 novembre 2026 : lecture paginée, masquage des noms, notifications, doublons
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {rolldown} from 'rolldown'
async function load(path){const b=await rolldown({input:new URL(path,import.meta.url).pathname,platform:'node'});const o=await b.generate({format:'esm'});await b.close();return import('data:text/javascript;base64,'+Buffer.from(o.output.find(c=>c.isEntry).code).toString('base64'))}
globalThis.window??={location:{host:'club.test',href:'https://club.test/'}}
const redact=await load('../src/lib/redact.ts'),push=await load('../server/push.ts'),dup=await load('../src/lib/duplicates.ts'),lib=await load('../src/lib/aiLibrary.ts'),sb=await load('../src/api/supabaseApi.ts')

test('les 2500 check-ins sont tous lus, y compris les plus récents (pages de 1000 lignes)',async()=>{
 const rows=Array.from({length:2500},(_,i)=>({id:String(i).padStart(5,'0'),date:`2026-${String(1+Math.floor(i/200)).padStart(2,'0')}-01`}))
 const original=globalThis.fetch,seen=[]
 globalThis.fetch=async(input)=>{const url=new URL(typeof input==='string'?input:input.url);seen.push(url.search)
  // comme PostgREST : au plus 1000 lignes par réponse, même si on en demande plus
  const offset=Number(url.searchParams.get('offset')??0),limit=Math.min(Number(url.searchParams.get('limit')??1000),1000)
  return new Response(JSON.stringify(rows.slice(offset,offset+limit)),{status:200,headers:{'content-type':'application/json'}})}
 try{
  const api=sb.createSupabaseApi('https://projet.supabase.co','sb_publishable_test')
  const all=await api.list('wellness')
  assert.equal(all.length,2500);assert.equal(all.at(-1).id,'02499')
  assert.equal(seen.length,3)
 }finally{globalThis.fetch=original}
})

test('masquage : noms de deux lettres masqués avec la majuscule, mots courants intacts',()=>{
 const athletes=[{first_name:'Li',last_name:'De'},{first_name:'Noémie',last_name:'Rossier'}]
 const r=redact.redactNames('Li a couru avec Noemie ; le plan de la semaine reste. li minuscule',athletes)
 assert.equal(r.text,'[athlète] a couru avec [athlète] ; le plan de la semaine reste. li minuscule')
 assert.equal(r.count,2)
})

test('les notes du coach sur les publications passent par le masquage',()=>{
 const refs=lib.libraryForAI([{reviewed:true,paper:{id:'123',title:'Sprint',year:2024,journal:'J',abstract:'Résumé'},review_note:'Utile pour Noémie',created_at:'2026-01-01'}],[{first_name:'Noémie',last_name:'Rossier'}])
 assert.equal(refs[0].note,'Utile pour [athlète]')
})

test('notifications : seuls les services de push connus sont appelés',()=>{
 for(const ok of ['https://fcm.googleapis.com/fcm/send/abc','https://web.push.apple.com/QM','https://updates.push.services.mozilla.com/wpush/v2/x','https://wns2-par02p.notify.windows.com/w/?token=x'])assert.equal(push.isPushService(ok),true,ok)
 for(const bad of ['https://evil.example/hook','http://fcm.googleapis.com/x','https://fcm.googleapis.com.evil.example/x','https://push.apple.com.evil.example/','pas une adresse'])assert.equal(push.isPushService(bad),false,bad)
})

const athletes=[{id:'a1',active:true,group_id:'g'},{id:'a2',active:true,group_id:'g'},{id:'a3',active:true,group_id:null}]
const session=(id,title)=>({id,title,objective:'',focus:'',duration_min:null,blocks:[]})
const plan=(id,date,time,session_id,extra={})=>({id,session_id,date,time,location:'',group_id:'g',athlete_ids:[],note:'',...extra})
test('doublons : même séance pour les mêmes athlètes = doublon probable',()=>{
 const [g]=dup.findDuplicates([plan('p1','2026-11-02','18:00','s1'),plan('p2','2026-11-02','18:00','s1')],[session('s1','Vitesse')],athletes,[])
 assert.equal(g.sure,true)
})
test('doublons : piste le matin et muscu le soir ne sont pas proposés à la suppression',()=>{
 const [g]=dup.findDuplicates([plan('p1','2026-11-02','08:00','s1'),plan('p2','2026-11-02','18:00','s2')],[session('s1','Piste'),session('s2','Muscu')],athletes,[])
 assert.equal(g.sure,false)
})
test('doublons : un seul athlète en commun reste « à vérifier »',()=>{
 const [g]=dup.findDuplicates([plan('p1','2026-11-02','','s1'),plan('p2','2026-11-02','','s1',{group_id:null,athlete_ids:['a1','a3']})],[session('s1','Vitesse')],athletes,[])
 assert.equal(g.sure,false)
})
test('doublons : une planification dont la séance a disparu ne fait pas planter la page',()=>{
 const groups=dup.findDuplicates([plan('p1','2026-11-02','','absente'),plan('p2','2026-11-02','','absente')],[],athletes,[])
 assert.equal(groups.length,1)
})
