export const RESEARCH_TOPICS = {periodization:'Périodisation',taper:'Affûtage',sprint:'Sprint',strength:'Force et puissance',youth:'Développement des jeunes'} as const
export type ResearchTopic=keyof typeof RESEARCH_TOPICS
export interface ResearchPaper { id:string; title:string; authors:string; year:number; journal:string; url:string; abstract:string; doi:string; retrieved_at:string }
export interface ResearchResult {papers:ResearchPaper[];ai_ranked:boolean;message?:string}
export interface ResearchRequest {topic:ResearchTopic;fromYear:number;ai:boolean}
