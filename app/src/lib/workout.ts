import type { ExerciseSet } from '../types'
export function recoverySeconds(text:string):number|null {
 const t=text.trim();let m=t.match(/^(\d+)\s*['’]\s*(\d{1,2})?/)
 if(m)return +m[1]*60+(+(m[2]||0))
 m=t.match(/^(\d+)\s*(min|minutes?)\b/i);if(m)return +m[1]*60
 m=t.match(/^(\d+)\s*(?:["”]|s\b|sec\b)/i);return m?+m[1]:null
}
export function validateSets(sets:ExerciseSet[]):string|null {
 if(!sets.length||sets.length>30)return 'Entre 1 et 30 lignes de réalisation sont possibles.'
 for(const s of sets){if(s.reps!=null&&(!Number.isInteger(s.reps)||s.reps<0||s.reps>10000))return 'Vérifie les répétitions.';if(s.load_kg!=null&&(!Number.isFinite(s.load_kg)||s.load_kg<0||s.load_kg>1000))return 'Vérifie la charge en kg.';if(s.result.length>500)return 'Le résultat doit rester inférieur à 500 caractères.'}
 return null
}
