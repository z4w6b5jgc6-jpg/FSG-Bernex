import {sessionAssistant} from '../../server/session-assistant'
import {coachChat} from '../../server/coach-chat'
import type {Env} from '../../server/ai'
// Avec une séance : analyse et ajustements de cette séance ; sans séance : discussion libre (page Assistant)
export const onRequestPost=async(context:{request:Request;env:Env})=>{
 const raw=await context.request.clone().text()
 if(raw.length>90000)return new Response(JSON.stringify({error:'Séance ou discussion trop volumineuse.'}),{status:413,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
 let body:{session?:unknown}|null=null;try{body=JSON.parse(raw)}catch{body=null}
 return body&&body.session?sessionAssistant(context,'discussion'):coachChat(context)
}
