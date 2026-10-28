from playwright.sync_api import sync_playwright
import os,tempfile
BASE=os.environ.get('BERNEX_TEST_URL','http://127.0.0.1:5173').rstrip('/')
SETUP=r'''async()=>{
const source=await(await fetch('/src/components/AiAdvicePanel.tsx')).text();const apiPath=source.match(/from "(\/src\/api\/index\.ts[^"]*)"/)[1];const{api}=await import(apiPath);window.testApi=api;window.aiCalls=[];
window.stubAdvice=()=>({resume:'Réponse simulée pour vérifier le parcours, sans validation scientifique du dosage.',suggestions:[{bloc:'Course',exercice:'Footing progressif',block_id:'b',item_id:'i',champ:'duration',valeur:'20 min',proposition:'Exemple : préciser la durée',pourquoi:'Hypothèse pratique simulée.',source_ids:['youth-individualization']},{bloc:'Course',exercice:'Footing progressif',block_id:'b',item_id:'i',champ:'notes',valeur:'Rester sur piste ; ajuster après retour du coach.',proposition:'Préciser la consigne',pourquoi:'Choix pratique du coach.',source_ids:['youth-individualization']}]});
api.improveSession=async session=>{window.aiCalls.push({mode:'direct',session});return window.stubAdvice()};api.chat=async(messages,session)=>{window.aiCalls.push({mode:'discussion',messages,session});return JSON.stringify({resume:'Exemple de réponse à la discussion.',suggestions:[]})};
}'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
 page=b.new_page(viewport={'width':1440,'height':1100});page.set_default_timeout(15000);errors=[];external=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if r.url.startswith('http') and not r.url.startswith(BASE) else None)
 page.goto(BASE);assert page.evaluate("async()=>!(await import('/src/api/index.ts')).supabaseUrl"),'Demo only'
 page.locator('input[type=email]').fill('coach@demo.ch');page.locator('input[type=password]').fill('');page.get_by_role('button',name='Se connecter',exact=True).click();page.get_by_role('heading',name='Le groupe, aujourd’hui').wait_for()
 sid=page.evaluate('''async()=>{const{api}=await import('/src/api/index.ts');return(await api.save('sessions',{title:'Footing de AthleteTest',objective:'Phase extensive',focus:'Demi-fond',duration_min:120,blocks:[{id:'b',title:'Course',items:[{id:'i',name:'Footing progressif',duration:'30 min',sets:'',reps:'',distance:'',intensity:'progressive',recovery:'',notes:'AthleteTest : piste',load_kg:''}]}]})).id}''')
 page.goto(BASE+'/#/seances/'+sid);page.reload();page.get_by_role('button',name='Analyser et proposer',exact=True).wait_for();page.evaluate(SETUP)
 page.get_by_role('button',name='Analyser et proposer',exact=True).click();page.get_by_role('heading',name='Ajustements proposés').wait_for()
 calls=page.evaluate('window.aiCalls');assert len(calls)==1,calls;assert 'AthleteTest' not in str(calls);assert calls[0]['session']['blocks'][0]['items'][0]['duration']=='30 min'
 page.locator('.session-ai').screenshot(path=os.path.join(os.environ.get('BERNEX_ARTIFACT_DIR',tempfile.gettempdir()),'bernex-assistant-v18.png'))
 page.get_by_role('button',name='Appliquer les 2 modifications retenues au brouillon',exact=True).click();page.get_by_text('Modifications ajoutées au brouillon.',exact=False).wait_for()
 assert page.evaluate("async sid=>(await window.testApi.list('sessions')).find(s=>s.id===sid).blocks[0].items[0].duration",sid)=='30 min'
 page.get_by_label('Discuter et ajuster cette séance',exact=True).fill('Je souhaite rester sur piste et ajuster le footing pour AthleteTest.');page.get_by_role('button',name='Envoyer à l’IA',exact=True).click();page.get_by_text('Exemple de réponse à la discussion.',exact=True).wait_for()
 calls=page.evaluate('window.aiCalls');assert len(calls)==2;assert calls[1]['session']['blocks'][0]['items'][0]['duration']=='20 min';assert calls[1]['session']['blocks'][0]['items'][0]['notes'].startswith('Rester sur piste');assert 'AthleteTest' not in str(calls[1]);assert len(calls[1]['messages'])==2;assert 'suggestions' in calls[1]['messages'][0]['content']
 page.get_by_role('button',name='Enregistrer',exact=True).click();page.get_by_role('button',name='✓ Enregistré',exact=True).wait_for()
 item=page.evaluate("async sid=>(await window.testApi.list('sessions')).find(s=>s.id===sid).blocks[0].items[0]",sid);assert item['duration']=='20 min' and item['notes'].startswith('Rester sur piste')
 page.get_by_role('button',name='Analyser et proposer',exact=True).click();page.get_by_role('heading',name='Ajustements proposés').wait_for();page.get_by_label('Titre',exact=True).fill('Titre ajusté par le coach');assert page.get_by_role('button',name='Appliquer les 2 modifications retenues au brouillon',exact=True).is_disabled()
 page.get_by_role('button',name='Nouvelle discussion',exact=True).click();assert page.locator('.bubble').count()==0
 page.evaluate("()=>{window.testApi.chat=async()=>{throw new Error('IA Cloudflare non configurée : binding AI nécessaire.')}}")
 page.get_by_label('Discuter et ajuster cette séance',exact=True).fill('Ma question conservée');page.get_by_role('button',name='Envoyer à l’IA',exact=True).click();page.get_by_role('alert').get_by_text('IA Cloudflare non configurée',exact=False).wait_for();assert page.locator('.session-ai textarea').input_value()=='Ma question conservée'
 for width in [1440,1024,768,390,320]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth')<=width,(width,page.evaluate('document.documentElement.scrollWidth'))
 assert not errors,errors
 assert not external,external
 print('PASS simulated AI: direct + discussion, masking, 2 edits atomic to draft, no save before coach, updated context, complete suggestions in history, stale blocked, failure retains input, 5 widths, 0 external requests',flush=True)
 b.close()
