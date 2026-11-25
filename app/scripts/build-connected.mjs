import {rolldown} from 'rolldown'
import {loadEnv} from 'vite'
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const env=loadEnv('production',process.cwd(),['COACH_','VITE_'])
const url=env.COACH_SUPABASE_URL||env.VITE_SUPABASE_URL,key=env.COACH_SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY
if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url??''))throw new Error('Configurer l’URL Supabase publique de production.')
if(key?.startsWith('eyJ')){if(JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role!=='anon')throw new Error('Clé non publique refusée.')}else if(!key?.startsWith('sb_publishable_'))throw new Error('Clé non publique refusée.')
const bundle=await rolldown({input:'server/pages-worker.ts',platform:'browser',transform:{define:{PUBLIC_SUPABASE_URL:JSON.stringify(url),PUBLIC_SUPABASE_ANON_KEY:JSON.stringify(key)}}})
await bundle.write({file:'dist/_worker.js',format:'esm',minify:true});await bundle.close()
// Service worker : nouvelle version de cache à chaque publication (les anciens fichiers sont effacés à l'activation)
const version=createHash('sha256').update(await readFile('dist/index.html')).digest('hex').slice(0,12)
const sw=await readFile('dist/sw.js','utf8');if(!sw.includes("'coach-athle-dev'"))throw new Error('sw.js : version du cache introuvable.')
await writeFile('dist/sw.js',sw.replace("'coach-athle-dev'",`'coach-athle-${version}'`))
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2)+'\n')
console.log('Version connectée : interface et fonctions Pages pour import ZIP. Aucune opération distante effectuée.')
