import {sessionAssistant} from '../../server/session-assistant'
import {coachChat} from '../../server/coach-chat'
import type {Env} from '../../server/ai'
// Avec une séance : analyse et ajustements de cette séance ; sans séance : discussion libre (page Assistant)
export const onRequestPost=async(context:{request:Request;env:Env})=>{
 const body=await context.request.clone().json().catch(()=>null) as {session?:unknown}|null
 return body&&body.session?sessionAssistant(context,'discussion'):coachChat(context)
}
