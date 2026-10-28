import os, tempfile
from pathlib import Path
BASE=os.environ.get("BERNEX_TEST_URL", "http://127.0.0.1:5173").rstrip("/")
ARTIFACTS=Path(os.environ.get("BERNEX_ARTIFACT_DIR", tempfile.mkdtemp(prefix="bernex-library-")))
ARTIFACTS.mkdir(parents=True,exist_ok=True)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1050},locale='fr-CH',timezone_id='Europe/Zurich');page.set_default_timeout(10000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE)
 assert page.evaluate("async()=>!(await import('/src/api/index.ts')).supabaseUrl"),'Demo required; stop before writes'
 page.locator('input[type=email]').fill('coach@demo.ch');page.locator('input[type=password]').fill('');page.get_by_role('button',name='Se connecter',exact=True).click();page.get_by_role('heading',name='Le groupe, aujourd’hui').wait_for()
 page.evaluate('''async()=>{const {api}=await import('/src/api/index.ts');const blocks=[{id:'b',title:'Travail principal',items:[]}];const s=await api.save('sessions',{title:'Lancers S01 — Javelot',focus:'Sauts',objective:'Technique du lancer',duration_min:null,blocks});for(const date of ['2026-11-04','2026-10-28'])await api.save('assignments',{session_id:s.id,date,time:'18:00',location:'Piste démo',group_id:null,athlete_ids:[],note:''})}''')
 page.goto(BASE+'/#/seances');page.reload();page.get_by_role('heading',name='Séances',exact=True).wait_for()
 assert page.locator('.training-tile').count()==8
 page.screenshot(path=str(ARTIFACTS/'bernex-seances-tuiles-v11.png'),full_page=True)
 throws=page.locator('.training-tile').filter(has=page.locator('summary strong',has_text='Lancers'));throws.locator(':scope > summary').click()
 assert throws.get_by_role('link',name='Lancers S01 — Javelot',exact=True).count()==2
 headings=throws.locator('.training-date-group h2').all_text_contents();assert len(headings)==2 and 'oct.' in headings[0] and 'nov.' in headings[1],headings
 for width,height in [(1440,1050),(1024,768),(768,1024),(390,844),(320,720)]:
  page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth')<=width,(width,page.evaluate('document.documentElement.scrollWidth'))
  if width==390:page.screenshot(path=str(ARTIFACTS/'bernex-seances-mobile-v11.png'),full_page=True)
 page.set_viewport_size({'width':1440,'height':1050})
 muscle=page.locator('.training-tile').filter(has=page.locator('summary strong',has_text='Musculation'));muscle.locator(':scope > summary').click();muscle.get_by_role('link',name='Voir les exercices',exact=True).click()
 page.get_by_role('heading',name='Exercices',exact=True).wait_for();assert page.get_by_label('Catégorie d’exercice').input_value()=='Musculation';page.get_by_text('Goblet squat',exact=True).wait_for()
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth')<=390;page.set_viewport_size({'width':1440,'height':1050});page.screenshot(path=str(ARTIFACTS/'bernex-exercices-v11.png'),full_page=True)
 page.goto(BASE+'/#/seances');muscle=page.locator('.training-tile').filter(has=page.locator('summary strong',has_text='Musculation'));muscle.locator(':scope > summary').click();muscle.get_by_role('button',name='Créer une séance de musculation',exact=True).click();page.get_by_label('Titre',exact=True).wait_for();assert page.get_by_label('Thème',exact=True).input_value()=='Musculation';assert page.get_by_label('Durée (min)',exact=True).input_value()==''
 page.get_by_role('button',name='Bibliothèque',exact=False).first.click();page.get_by_role('heading',name='Bibliothèque d’exercices',exact=True).wait_for();page.get_by_placeholder('Rechercher…',exact=True).fill('Goblet squat');page.locator('.picker-item').filter(has_text='Goblet squat').locator('input[type=checkbox]').check();page.get_by_role('button',name='Ajouter 1',exact=True).click();page.get_by_role('button',name='Enregistrer',exact=True).click();page.wait_for_timeout(200)
 saved=page.evaluate("async()=>{const{api}=await import('/src/api/index.ts');return(await api.list('sessions')).find(s=>s.title==='Nouvelle séance de musculation')}");items=[i for block in saved['blocks'] for i in block['items']];item=next(i for i in items if i['name']=='Goblet squat');assert 'kettlebell' in item['notes'];assert all(item[k]=='' for k in ['sets','reps','intensity','recovery']);assert saved['duration_min'] is None
 assert not errors,errors
 print('PASS 8 tuiles, dates de planification, catalogue musculation, création et insertion avec consignes sans dosage, 5 largeurs sans débordement, aucune erreur JS',flush=True)
 b.close()
