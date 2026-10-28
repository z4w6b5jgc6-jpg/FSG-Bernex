import {sessionAssistant} from '../../server/session-assistant'
import type {Env} from '../../server/ai'
export const onRequestPost=(context:{request:Request;env:Env})=>sessionAssistant(context,'discussion')
