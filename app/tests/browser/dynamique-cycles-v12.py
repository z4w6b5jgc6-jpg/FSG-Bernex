import os, tempfile
from pathlib import Path
BASE=os.environ.get("BERNEX_TEST_URL", "http://127.0.0.1:5173").rstrip("/")
ARTIFACTS=Path(os.environ.get("BERNEX_ARTIFACT_DIR", tempfile.mkdtemp(prefix="bernex-dynamics-")))
ARTIFACTS.mkdir(parents=True,exist_ok=True)
from playwright.sync_api import sync_playwright
from datetime import datetime,timezone
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1050},locale='fr-CH',timezone_id='Europe/Zurich');page.set_default_timeout(12000);page.emulate_media(reduced_motion='reduce');errors=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if r.url.startswith('http') and not r.url.startswith(BASE) else None)
 page.clock.install(time=datetime(2026,10,26,19,0,tzinfo=timezone.utc))
 page.goto(BASE);assert page.evaluate("async()=>!(await import('/src/api/index.ts')).supabaseUrl"),'Demo required'
 page.locator('input[type=email]').fill('coach@demo.ch');page.locator('input[type=password]').fill('');page.get_by_role('button',name='Se connecter',exact=True).click();page.get_by_role('heading',name='Le groupe, aujourd’hui').wait_for()
 fixture=page.evaluate('''async()=>{const{api}=await import('/src/api/index.ts');const {projectCycles,phaseSignature}=await import('/src/lib/cycleProjection.ts');for(const table of ['feedback','session_adjustments','attendance','exercise_logs','assignments'])for(const row of await api.list(table))await api.remove(table,row.id);const athlete=(await api.list('athletes')).find(a=>a.first_name==='AthleteTest');const blocks=[['extensive','2026-10-26','2026-11-22'],['intensive','2026-11-23','2026-12-13'],['explosive','2026-12-14','2027-01-03']].map(([phase,start,end],i)=>({id:'b'+i,title:phase,start,end,phase,athleteIds:[athlete.id],provisional:true,cycle:'Préparation hiver',notes:''}));const plan={start:'2026-10-26',end:'2027-01-03',blocks};const weeks=projectCycles({plan,athleteId:athlete.id,discipline:'sprint',recoveryEvery:-1,assignments:[],competitions:[],availability:[]});weeks[0].minutes=90;weeks[0].rpe=4;plan.projections=[{id:'p',name:'Préparation hiver — cas fictif',athleteId:athlete.id,discipline:'sprint',basis:'season',signature:phaseSignature(plan),created:'2026-10-26',status:'draft',recoveryEvery:-1,weeks}];const me=await api.getMe();await api.saveSettings({...me.settings,season:plan});const s=await api.save('sessions',{title:'Sprint spécifique — cas fictif',objective:'Phase intensive',focus:'Vitesse',duration_min:120,blocks:[]});await api.save('assignments',{session_id:s.id,date:'2026-10-26',time:'18:00',location:'Piste démo',group_id:null,athlete_ids:[athlete.id],note:''});return {athlete:athlete.id,session:s.id,assignments:await api.list('assignments')}}''')
 page.goto(BASE+'/#/saison?athlete='+fixture['athlete']);page.reload();page.get_by_role('heading',name='La dynamique du macrocycle',exact=True).wait_for()
 assert page.locator('.egger-models article').count()==3
 assert page.locator('.macro-load-week').count()==10
 assert page.locator('.macro-context-marker').filter(has_text='Vacances').count()==2
 page.locator('.periodization-issues').get_by_text('Durée programmée 120 min ; cible du scénario 90 min (écart +30 min).',exact=True).wait_for()
 page.locator('.cycle-athlete-context').evaluate('(e)=>e.open=false')
 page.locator('.macro-load').screenshot(path=str(ARTIFACTS/'bernex-macrocycle-v12.png'))
 page.get_by_label('Mesure de la dynamique').select_option('minutes');page.get_by_role('button',name='Dessiner mes cibles de progression',exact=True).click()
 for label,value in [('Début du développement · min','100'),('Fin du développement · min','200'),('Semaine d’allègement · min','50'),('Effort au début · RPE','4'),('Effort à la fin · RPE','6'),('Effort en allègement · RPE','2')]:page.get_by_label(label,exact=True).fill(value)
 page.get_by_role('button',name='Prévisualiser mes cibles',exact=True).click();apply=page.get_by_role('button',name='Appliquer ces cibles au brouillon',exact=True);assert apply.is_disabled();page.get_by_label('Remplacer les cibles déjà renseignées dans ce mésocycle.',exact=True).check();assert apply.is_enabled();apply.click();assert page.get_by_label('Mesure de la dynamique').input_value()=='load';assert page.get_by_text('Modifications non enregistrées.',exact=True).is_visible()
 page.locator('.macro-load').screenshot(path=str(ARTIFACTS/'bernex-macrocycle-cibles-v12.png'))
 page.get_by_role('button',name='Enregistrer le plan',exact=True).click();page.get_by_text('Planification enregistrée et partagée avec les coachs.',exact=True).wait_for()
 saved=page.evaluate("async()=>{const{api}=await import('/src/api/index.ts');return {plan:(await api.getMe()).settings.season,assignments:await api.list('assignments')}}");assert saved['assignments']==fixture['assignments'];assert [w['minutes'] for w in saved['plan']['projections'][0]['weeks'][:4]]==[100,150,200,50]
 page.get_by_label('Mesure de la dynamique').select_option('reference');page.locator('.egger-guide').screenshot(path=str(ARTIFACTS/'bernex-repere-egger-v12.png'));page.locator('.periodization-audit').screenshot(path=str(ARTIFACTS/'bernex-analyse-cycles-v12.png'))
 for width,height in [(1440,1050),(1024,768),(768,1024),(390,844),(320,720)]:
  page.set_viewport_size({'width':width,'height':height});actual=page.evaluate('document.documentElement.scrollWidth');assert actual<=width,(width,actual)
  if width==390:page.locator('.macro-load').screenshot(path=str(ARTIFACTS/'bernex-macrocycle-mobile-v12.png'))
 page.get_by_role('button',name='Charger le modèle et analyser les écarts',exact=True).wait_for();page.evaluate("Object.defineProperty(navigator,'gpu',{get:()=>undefined,configurable:true})");page.get_by_role('button',name='Charger le modèle et analyser les écarts',exact=True).click();page.get_by_text('Ce navigateur ne propose pas WebGPU.',exact=False).wait_for();assert not errors,errors;assert not external,external
 print('PASS motifs Egger et 10 semaines ; audit individuel et corrections ; prévisualisation avec remplacement explicite ; enregistrement des cibles sans modification de séances ; 5 largeurs ; 0 erreur JS ; 0 requête externe ; modèle local non téléchargé ni exécuté',flush=True)
 b.close()
