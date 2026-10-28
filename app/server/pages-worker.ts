import {onRequestPost as research} from '../functions/api/research'
import {onRequestPost as notify} from '../functions/api/notify'
import {onRequestGet as pushKey} from '../functions/api/push-key'
import {onRequestPost as chat} from '../functions/api/chat'
import {onRequestPost as readPlan} from '../functions/api/lire-plan'
import {onRequestPost as improve} from '../functions/api/ameliorer'
import {json,type Env} from './ai'
import type {PushEnv} from './push'

declare const PUBLIC_SUPABASE_URL:string
declare const PUBLIC_SUPABASE_ANON_KEY:string
type WorkerEnv=Env&PushEnv&{ASSETS:{fetch:(request:Request)=>Promise<Response>}}
const routes:Record<string,{method:string;run:(context:{request:Request;env:WorkerEnv})=>Promise<Response>}>= {
 '/api/research':{method:'POST',run:research},'/api/notify':{method:'POST',run:notify},'/api/push-key':{method:'GET',run:pushKey},
 '/api/chat':{method:'POST',run:chat},'/api/lire-plan':{method:'POST',run:readPlan},'/api/ameliorer':{method:'POST',run:improve},
}
export default{
 async fetch(request:Request,env:WorkerEnv):Promise<Response>{
  const path=new URL(request.url).pathname
  if(!path.startsWith('/api/'))return env.ASSETS.fetch(request)
  const route=routes[path]
  if(!route)return json({error:'Route inconnue.'},404)
  if(request.method!==route.method)return new Response(JSON.stringify({error:'Méthode non autorisée.'}),{status:405,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','allow':route.method}})
  const configured={...env,COACH_SUPABASE_URL:env.COACH_SUPABASE_URL||PUBLIC_SUPABASE_URL,COACH_SUPABASE_ANON_KEY:env.COACH_SUPABASE_ANON_KEY||PUBLIC_SUPABASE_ANON_KEY}
  try{return await route.run({request,env:configured})}catch{return json({error:'Service temporairement indisponible.'},502)}
 },
}
