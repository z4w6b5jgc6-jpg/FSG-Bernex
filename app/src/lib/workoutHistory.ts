import type {Assignment,ExerciseLog} from '../types'
import {validDate} from './season'
const nameKey=(name:string)=>name.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr')
/** Même athlète et même nom explicite, séance strictement antérieure. Jamais de copie dans la saisie. */
export function previousExercise(logs:ExerciseLog[],assignments:Assignment[],athleteId:string,assignmentId:string,itemName:string){
 const current=assignments.find(a=>a.id===assignmentId)
 if(!current||!validDate(current.date)||!nameKey(itemName))return undefined
 return logs.filter(l=>l.athlete_id===athleteId&&l.assignment_id!==assignmentId&&nameKey(l.item_name??'')===nameKey(itemName)&&l.sets.some(s=>s.done)).flatMap(log=>{
  const assignment=assignments.find(a=>a.id===log.assignment_id)
  return assignment&&validDate(assignment.date)&&assignment.date<current.date?[{log,assignment}]:[]
 }).sort((a,b)=>(b.assignment.date+b.assignment.time).localeCompare(a.assignment.date+a.assignment.time)|| (b.log.updated_at??'').localeCompare(a.log.updated_at??''))[0]
}
